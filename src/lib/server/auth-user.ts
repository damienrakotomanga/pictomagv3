import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";
import {
  getProfileByUserId,
  getProfileByUsername,
  getUserById,
  type StoredProfileRow,
  type StoredUserRow,
} from "@/lib/server/sqlite-store";

export const AUTH_USER_COOKIE_NAME = "pictomag_auth_user_id";
export const AUTH_ROLE_COOKIE_NAME = "pictomag_auth_role";
export const AUTH_TOKEN_COOKIE_NAME = "pictomag_auth_token";
export const AUTH_USER_HEADER_NAME = "x-pictomag-auth-user-id";
export const AUTH_ROLE_HEADER_NAME = "x-pictomag-auth-role";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const AUTH_TOKEN_VERSION = "v1";
const AUTH_SECRET_FALLBACK = "pictomag-dev-auth-secret-change-me";
const PASSWORD_HASH_VERSION = "scrypt-v1";
const PASSWORD_HASH_KEY_LENGTH = 64;
export const AUTH_MIN_PASSWORD_LENGTH = 8;

export type AuthRole = "buyer" | "seller" | "moderator" | "admin" | "finance_admin";
type AuthTokenPayload = {
  sub: string;
  role: AuthRole;
  iat: number;
  exp: number;
  version: typeof AUTH_TOKEN_VERSION;
};

const AUTH_ROLES = new Set<AuthRole>(["buyer", "seller", "moderator", "admin", "finance_admin"]);

export type PublicAuthUser = {
  id: string;
  email: string | null;
  role: AuthRole;
  authMode: StoredUserRow["auth_mode"];
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number | null;
};

export type PublicProfile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  websiteUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

export type AuthenticatedAppUser = {
  authenticated: true;
  compatibilityMode: boolean;
  role: AuthRole;
  user: StoredUserRow;
  profile: StoredProfileRow;
};

export function normalizeAuthRole(role: unknown): AuthRole {
  if (typeof role !== "string") {
    return "buyer";
  }

  const normalized = role.trim().toLowerCase();
  return AUTH_ROLES.has(normalized as AuthRole) ? (normalized as AuthRole) : "buyer";
}

export function normalizeAuthEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 320 || !normalized.includes("@")) {
    return null;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(normalized) ? normalized : null;
}

function normalizeUsernameBase(value: string) {
  const normalized = normalizePreferenceUserId(value).replace(/^anonymous$/, "");
  return normalized.length > 0 ? normalized.slice(0, 32) : null;
}

export function normalizeAuthUsername(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return normalizeUsernameBase(value.trim());
}

export function normalizeAuthDisplayName(value: unknown, fallback = "Pictomag User") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return normalized.length > 0 ? normalized : fallback;
}

export function createAuthUserId(prefix = "user") {
  return normalizePreferenceUserId(`${prefix}-${randomUUID()}`);
}

export function resolveAvailableProfileUsername(preferred: unknown, fallbackSeed = "user") {
  const preferredBase = normalizeAuthUsername(preferred);
  const fallbackBase = normalizeUsernameBase(fallbackSeed) ?? `user-${randomUUID().slice(0, 8)}`;
  const base = preferredBase ?? fallbackBase;

  let candidate = base;
  let suffix = 2;

  while (getProfileByUsername(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function hashAuthPassword(password: string) {
  const normalizedPassword = password.trim();
  const salt = randomUUID();
  const hash = scryptSync(normalizedPassword, salt, PASSWORD_HASH_KEY_LENGTH).toString("base64url");
  return `${PASSWORD_HASH_VERSION}.${salt}.${hash}`;
}

export function verifyAuthPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  const [version, salt, expectedHash] = storedHash.split(".");
  if (!version || !salt || !expectedHash || version !== PASSWORD_HASH_VERSION) {
    return false;
  }

  const actualHash = scryptSync(password.trim(), salt, PASSWORD_HASH_KEY_LENGTH);
  const expectedBuffer = Buffer.from(expectedHash, "base64url");

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
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

export function serializePublicAuthUser(user: StoredUserRow): PublicAuthUser {
  return {
    id: user.id,
    email: user.email,
    role: normalizeAuthRole(user.role),
    authMode: user.auth_mode,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}

export function serializePublicProfile(profile: StoredProfileRow): PublicProfile {
  return {
    userId: profile.user_id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    avatarUrl: profile.avatar_url,
    websiteUrl: profile.website_url,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export function resolveVerifiedAuthTokenPayload(request: NextRequest) {
  const authToken = request.cookies.get(AUTH_TOKEN_COOKIE_NAME)?.value ?? null;
  return verifySignedAuthToken(authToken);
}

export function resolveAuthenticatedAppUser(request: NextRequest): AuthenticatedAppUser | null {
  const tokenPayload = resolveVerifiedAuthTokenPayload(request);
  if (!tokenPayload) {
    return null;
  }

  const user = getUserById(tokenPayload.sub);
  if (!user) {
    return null;
  }

  const profile = getProfileByUserId(user.id);
  if (!profile) {
    return null;
  }

  return {
    authenticated: true,
    compatibilityMode: user.auth_mode === "compat",
    role: normalizeAuthRole(user.role),
    user,
    profile,
  };
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

export function clearAuthCookies(response: NextResponse) {
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set({
    name: AUTH_TOKEN_COOKIE_NAME,
    value: "",
    ...cookieBase,
  });

  response.cookies.set({
    name: AUTH_USER_COOKIE_NAME,
    value: "",
    ...cookieBase,
  });

  response.cookies.set({
    name: AUTH_ROLE_COOKIE_NAME,
    value: "",
    ...cookieBase,
  });
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
