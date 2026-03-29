import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { resolveAuthUserId } from "@/lib/server/auth-user";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";
import { createSession, getSessionById, touchSession } from "@/lib/server/sqlite-store";

const PREFERENCE_USER_COOKIE_NAME = "pictomag_preference_user_id";
const LEGACY_PREFERENCE_HEADER_NAME = "x-pictomag-user-id";
const SESSION_COOKIE_NAME = "pictomag_session_id";
const PREFERENCE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;
const SESSION_TOUCH_INTERVAL_MS = 1000 * 60 * 5;

export type PreferenceUserResolutionSource =
  | "auth-token"
  | "session-cookie"
  | "preference-cookie"
  | "legacy-header"
  | "query"
  | "generated";

export type ResolvedPreferenceUser = {
  userId: string;
  source: PreferenceUserResolutionSource;
  sessionId: string;
  shouldSetPreferenceCookie: boolean;
  shouldSetSessionCookie: boolean;
};

function getCandidateUserIds(request: NextRequest): Array<{ source: PreferenceUserResolutionSource; value: string | null }> {
  const authUserId = resolveAuthUserId(request);
  const allowQueryUserId =
    process.env.NODE_ENV !== "production" ||
    process.env.PICTOMAG_ALLOW_QUERY_USER_ID === "1";
  const queryUserId = allowQueryUserId
    ? request.nextUrl.searchParams.get("userId")?.trim() ?? null
    : null;

  return [
    { source: "auth-token", value: authUserId },
    { source: "query", value: queryUserId },
    { source: "preference-cookie", value: request.cookies.get(PREFERENCE_USER_COOKIE_NAME)?.value ?? null },
    { source: "legacy-header", value: request.headers.get(LEGACY_PREFERENCE_HEADER_NAME)?.trim() ?? null },
  ];
}

function createPreferenceGuestUserId() {
  return `guest-${randomUUID()}`;
}

function getSessionCookieId(request: NextRequest) {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() ?? null;
  if (!value) {
    return null;
  }

  if (!/^[a-zA-Z0-9_-]{8,160}$/.test(value)) {
    return null;
  }

  return value;
}

function shouldSyncPreferenceCookie(request: NextRequest, expectedUserId: string) {
  const current = request.cookies.get(PREFERENCE_USER_COOKIE_NAME)?.value;
  if (!current) {
    return true;
  }

  return normalizePreferenceUserId(current) !== expectedUserId;
}

function resolveUserFromSessionCookie(request: NextRequest) {
  const sessionId = getSessionCookieId(request);
  if (!sessionId) {
    return null;
  }

  const session = getSessionById(sessionId);
  if (!session) {
    return null;
  }

  if (Date.now() - session.last_seen_at > SESSION_TOUCH_INTERVAL_MS) {
    touchSession(sessionId);
  }

  const userId = normalizePreferenceUserId(session.user_id);
  return {
    userId,
    sessionId,
  };
}

function ensureSessionForUser(userId: string, currentSessionId: string | null) {
  if (currentSessionId) {
    const existingSession = getSessionById(currentSessionId);
    if (existingSession && normalizePreferenceUserId(existingSession.user_id) === userId) {
      if (Date.now() - existingSession.last_seen_at > SESSION_TOUCH_INTERVAL_MS) {
        touchSession(currentSessionId);
      }

      return {
        sessionId: currentSessionId,
        shouldSetSessionCookie: false,
      };
    }
  }

  const sessionId = randomUUID();
  createSession({ sessionId, userId });

  return {
    sessionId,
    shouldSetSessionCookie: true,
  };
}

export function bindPreferenceUserToUserId(
  request: NextRequest,
  userId: string,
  source: PreferenceUserResolutionSource = "auth-token",
): ResolvedPreferenceUser {
  const normalizedUserId = normalizePreferenceUserId(userId);
  const currentSessionId = getSessionCookieId(request);
  const session = ensureSessionForUser(normalizedUserId, currentSessionId);

  return {
    userId: normalizedUserId,
    source,
    sessionId: session.sessionId,
    shouldSetPreferenceCookie: shouldSyncPreferenceCookie(request, normalizedUserId),
    shouldSetSessionCookie: session.shouldSetSessionCookie,
  };
}

export function createGuestPreferenceUser(request: NextRequest): ResolvedPreferenceUser {
  const currentSessionId = getSessionCookieId(request);
  const userId = normalizePreferenceUserId(createPreferenceGuestUserId());
  const session = ensureSessionForUser(userId, currentSessionId);

  return {
    userId,
    source: "generated",
    sessionId: session.sessionId,
    shouldSetPreferenceCookie: true,
    shouldSetSessionCookie: session.shouldSetSessionCookie,
  };
}

export function resolvePreferenceUser(request: NextRequest): ResolvedPreferenceUser {
  const currentSessionId = getSessionCookieId(request);

  const explicitCandidates = getCandidateUserIds(request).filter(
    (candidate) => candidate.source === "auth-token" || candidate.source === "query",
  );

  for (const candidate of explicitCandidates) {
    if (!candidate.value) {
      continue;
    }

    const userId = normalizePreferenceUserId(candidate.value);
    const session = ensureSessionForUser(userId, currentSessionId);

    return {
      userId,
      source: candidate.source,
      sessionId: session.sessionId,
      shouldSetPreferenceCookie: shouldSyncPreferenceCookie(request, userId),
      shouldSetSessionCookie: session.shouldSetSessionCookie,
    };
  }

  const sessionUser = resolveUserFromSessionCookie(request);
  if (sessionUser) {
    return {
      userId: sessionUser.userId,
      source: "session-cookie",
      sessionId: sessionUser.sessionId,
      shouldSetPreferenceCookie: shouldSyncPreferenceCookie(request, sessionUser.userId),
      shouldSetSessionCookie: false,
    };
  }

  const fallbackCandidates = getCandidateUserIds(request).filter(
    (candidate) => candidate.source === "preference-cookie" || candidate.source === "legacy-header",
  );

  for (const candidate of fallbackCandidates) {
    if (!candidate.value) {
      continue;
    }

    const userId = normalizePreferenceUserId(candidate.value);
    const session = ensureSessionForUser(userId, currentSessionId);

    return {
      userId,
      source: candidate.source,
      sessionId: session.sessionId,
      shouldSetPreferenceCookie: shouldSyncPreferenceCookie(request, userId),
      shouldSetSessionCookie: session.shouldSetSessionCookie,
    };
  }

  const guestUser = createGuestPreferenceUser(request);
  return {
    ...guestUser,
    shouldSetSessionCookie: guestUser.shouldSetSessionCookie || !currentSessionId,
  };
}

export function attachPreferenceUserCookie(response: NextResponse, resolvedUser: ResolvedPreferenceUser) {
  if (resolvedUser.shouldSetPreferenceCookie) {
    response.cookies.set({
      name: PREFERENCE_USER_COOKIE_NAME,
      value: resolvedUser.userId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    });
  }

  if (resolvedUser.shouldSetSessionCookie) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: resolvedUser.sessionId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    });
  }
}
