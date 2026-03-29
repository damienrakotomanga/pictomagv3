import { NextRequest, NextResponse } from "next/server";
import {
  attachAuthCookies,
  normalizeAuthDisplayName,
  normalizeAuthUsername,
  normalizeAuthRole,
  resolveAuthenticatedAppUser,
  resolveAuthRole,
  resolveAvailableProfileUsername,
  serializePublicAuthUser,
  serializePublicProfile,
  type AuthRole,
} from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  createGuestPreferenceUser,
  resolveExistingPreferenceUser,
} from "@/lib/server/preference-user";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";
import {
  ensureCompatibilityUserWithProfile,
  getProfileByUserId,
  getUserById,
} from "@/lib/server/sqlite-store";

export const runtime = "nodejs";
const PRIVILEGED_ROLES = new Set<AuthRole>(["admin", "moderator", "finance_admin"]);

function canElevateToRole({
  desiredRole,
  currentRole,
}: {
  desiredRole: AuthRole;
  currentRole: AuthRole;
}) {
  if (!PRIVILEGED_ROLES.has(desiredRole)) {
    return true;
  }

  if (currentRole === "admin") {
    return true;
  }

  const allowDevElevation =
    process.env.NODE_ENV !== "production" &&
    process.env.PICTOMAG_ALLOW_DEV_ROLE_ELEVATION !== "0";

  return allowDevElevation;
}

export async function GET(request: NextRequest) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (authenticatedUser) {
    const boundPreferenceUser = bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token");
    const response = NextResponse.json({
      authenticated: true,
      compatibilityMode: authenticatedUser.compatibilityMode,
      sessionId: boundPreferenceUser.sessionId,
      role: authenticatedUser.role,
      user: serializePublicAuthUser(authenticatedUser.user),
      profile: serializePublicProfile(authenticatedUser.profile),
    });

    attachPreferenceUserCookie(response, boundPreferenceUser);
    return response;
  }

  const resolvedPreferenceUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const role = resolveAuthRole(request);
  const response = NextResponse.json({
    authenticated: false,
    compatibilityMode: true,
    userId: resolvedPreferenceUser?.userId ?? null,
    role,
    sessionId: resolvedPreferenceUser?.sessionId ?? null,
  });

  attachPreferenceUserCookie(response, resolvedPreferenceUser);
  return response;
}

export async function POST(request: NextRequest) {
  let payload: { userId?: unknown; role?: unknown } | null = null;

  try {
    payload = (await request.json()) as { userId?: unknown; role?: unknown };
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const resolvedPreferenceUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const currentAuthenticatedUser = resolveAuthenticatedAppUser(request);
  const currentRole = resolveAuthRole(request);
  const fallbackPreferenceUser = resolvedPreferenceUser ?? createGuestPreferenceUser(request);
  const userId =
    typeof payload?.userId === "string" && payload.userId.trim().length > 0
      ? normalizePreferenceUserId(payload.userId)
      : currentAuthenticatedUser?.user.id ?? fallbackPreferenceUser.userId;
  const role = normalizeAuthRole(payload?.role) as AuthRole;

  if (!canElevateToRole({ desiredRole: role, currentRole })) {
    const denied = NextResponse.json(
      {
        message: "Elevation de role refusee.",
        currentRole,
        requestedRole: role,
      },
      { status: 403 },
    );
    attachPreferenceUserCookie(denied, resolvedPreferenceUser ?? fallbackPreferenceUser);
    return denied;
  }

  const existingUser = getUserById(userId);
  if (existingUser?.auth_mode === "local") {
    const denied = NextResponse.json(
      {
        message: "Le mode de compatibilite ne peut pas prendre le controle d un compte local.",
        userId,
      },
      { status: 409 },
    );
    attachPreferenceUserCookie(denied, resolvedPreferenceUser ?? fallbackPreferenceUser);
    return denied;
  }

  const existingProfile = getProfileByUserId(userId);
  const username =
    existingProfile?.username ??
    resolveAvailableProfileUsername(
      normalizeAuthUsername(userId) ?? userId,
      normalizeAuthUsername(userId) ?? userId,
    );
  const displayName = existingProfile?.display_name ?? normalizeAuthDisplayName(userId, userId);
  ensureCompatibilityUserWithProfile({
    userId,
    role,
    username,
    displayName,
  });

  const refreshedUser = getUserById(userId);
  const refreshedProfile = getProfileByUserId(userId);
  if (!refreshedUser || !refreshedProfile) {
    return NextResponse.json({ message: "Impossible d initialiser la session de compatibilite." }, { status: 500 });
  }

  const boundPreferenceUser = bindPreferenceUserToUserId(request, refreshedUser.id, "auth-token");
  const response = NextResponse.json({
    authenticated: true,
    compatibilityMode: true,
    role: normalizeAuthRole(refreshedUser.role),
    sessionId: boundPreferenceUser.sessionId,
    user: serializePublicAuthUser(refreshedUser),
    profile: serializePublicProfile(refreshedProfile),
  });

  attachAuthCookies(response, { userId: refreshedUser.id, role: normalizeAuthRole(refreshedUser.role) });
  attachPreferenceUserCookie(response, boundPreferenceUser);

  return response;
}
