import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";

export const AUTH_USER_COOKIE_NAME = "pictomag_auth_user_id";
export const AUTH_ROLE_COOKIE_NAME = "pictomag_auth_role";
export const AUTH_TOKEN_COOKIE_NAME = "pictomag_auth_token";
export const AUTH_USER_HEADER_NAME = "x-pictomag-auth-user-id";
export const AUTH_ROLE_HEADER_NAME = "x-pictomag-auth-role";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const AUTH_TOKEN_VERSION = "v1";
const AUTH_SECRET_FALLBACK = "pictomag-dev-auth-secret-change-me";

export type AuthRole = "buyer" | "seller" | "moderator" | "admin" | "finance_admin";
type AuthTokenPayload = {
  sub: string;
  role: AuthRole;
  iat: number;
  exp: number;
  version: typeof AUTH_TOKEN_VERSION;
};

const AUTH_ROLES = new Set<AuthRole>(["buyer", "seller", "moderator", "admin", "finance_admin"]);

export function normalizeAuthRole(role: unknown): AuthRole {
  if (typeof role !== "string") {
    return "buyer";
  }

  const normalized = role.trim().toLowerCase();
  return AUTH_ROLES.has(normalized as AuthRole) ? (normalized as AuthRole) : "buyer";
}

function getAuthSecret() {
  return process.env.PICTOMAG_AUTH_SECRET ?? AUTH_SECRET_FALLBACK;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signAuthTokenPayload(encodedPayload: string) {
  return createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");
}

function createAuthTokenPayload({
  userId,
  role,
}: {
  userId: string;
  role: AuthRole;
}): AuthTokenPayload {
  const nowSeconds = Math.trunc(Date.now() / 1000);
  return {
    sub: normalizePreferenceUserId(userId),
    role: normalizeAuthRole(role),
    iat: nowSeconds,
    exp: nowSeconds + AUTH_TOKEN_TTL_SECONDS,
    version: AUTH_TOKEN_VERSION,
  };
}

export function createSignedAuthToken({
  userId,
  role,
}: {
  userId: string;
  role: AuthRole;
}) {
  const payload = createAuthTokenPayload({ userId, role });
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signAuthTokenPayload(encodedPayload);
  return `${AUTH_TOKEN_VERSION}.${encodedPayload}.${signature}`;
}

export function verifySignedAuthToken(token: string | null | undefined): AuthTokenPayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const [version, encodedPayload, signature] = token.split(".");
  if (!version || !encodedPayload || !signature || version !== AUTH_TOKEN_VERSION) {
    return null;
  }

  const expectedSignature = signAuthTokenPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  try {
    const rawPayload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AuthTokenPayload>;
    if (
      typeof rawPayload.sub !== "string" ||
      typeof rawPayload.role !== "string" ||
      typeof rawPayload.iat !== "number" ||
      typeof rawPayload.exp !== "number" ||
      rawPayload.version !== AUTH_TOKEN_VERSION
    ) {
      return null;
    }

    const nowSeconds = Math.trunc(Date.now() / 1000);
    if (rawPayload.exp <= nowSeconds) {
      return null;
    }

    return {
      sub: normalizePreferenceUserId(rawPayload.sub),
      role: normalizeAuthRole(rawPayload.role),
      iat: rawPayload.iat,
      exp: rawPayload.exp,
      version: AUTH_TOKEN_VERSION,
    };
  } catch {
    return null;
  }
}

export function resolveAuthRole(request: NextRequest): AuthRole {
  const authToken = request.cookies.get(AUTH_TOKEN_COOKIE_NAME)?.value ?? null;
  const tokenPayload = verifySignedAuthToken(authToken);
  if (tokenPayload) {
    return tokenPayload.role;
  }

  const cookieRole = request.cookies.get(AUTH_ROLE_COOKIE_NAME)?.value;
  return normalizeAuthRole(cookieRole);
}

export function resolveAuthUserId(request: NextRequest): string | null {
  const authToken = request.cookies.get(AUTH_TOKEN_COOKIE_NAME)?.value ?? null;
  const tokenPayload = verifySignedAuthToken(authToken);
  if (tokenPayload) {
    return tokenPayload.sub;
  }

  const cookieUserId = request.cookies.get(AUTH_USER_COOKIE_NAME)?.value;
  if (cookieUserId) {
    return normalizePreferenceUserId(cookieUserId);
  }

  return null;
}

export function isRoleAllowed(role: AuthRole, allowed: readonly AuthRole[]) {
  return allowed.includes(role);
}

export function attachAuthCookies(
  response: NextResponse,
  payload: {
    userId: string;
    role: AuthRole;
  },
) {
  const normalizedUserId = normalizePreferenceUserId(payload.userId);
  const normalizedRole = normalizeAuthRole(payload.role);
  const signedToken = createSignedAuthToken({
    userId: normalizedUserId,
    role: normalizedRole,
  });

  response.cookies.set({
    name: AUTH_TOKEN_COOKIE_NAME,
    value: signedToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS,
  });

  response.cookies.set({
    name: AUTH_USER_COOKIE_NAME,
    value: normalizedUserId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  response.cookies.set({
    name: AUTH_ROLE_COOKIE_NAME,
    value: normalizedRole,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}
