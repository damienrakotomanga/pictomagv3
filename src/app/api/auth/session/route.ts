import { NextRequest, NextResponse } from "next/server";
import {
  attachAuthCookies,
  normalizeAuthRole,
  resolveAuthRole,
  resolveAuthUserId,
  type AuthRole,
} from "@/lib/server/auth-user";
import { attachPreferenceUserCookie, resolvePreferenceUser } from "@/lib/server/preference-user";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";

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
  const resolvedPreferenceUser = resolvePreferenceUser(request);
  const authUserId = resolveAuthUserId(request);
  const role = resolveAuthRole(request);

  const response = NextResponse.json({
    userId: authUserId ?? resolvedPreferenceUser.userId,
    role,
    sessionId: resolvedPreferenceUser.sessionId,
  });

  attachPreferenceUserCookie(response, resolvedPreferenceUser);
  if (!authUserId) {
    attachAuthCookies(response, {
      userId: resolvedPreferenceUser.userId,
      role,
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  let payload: { userId?: unknown; role?: unknown } | null = null;

  try {
    payload = (await request.json()) as { userId?: unknown; role?: unknown };
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const resolvedPreferenceUser = resolvePreferenceUser(request);
  const currentRole = resolveAuthRole(request);
  const userId =
    typeof payload?.userId === "string" && payload.userId.trim().length > 0
      ? normalizePreferenceUserId(payload.userId)
      : resolvedPreferenceUser.userId;
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
    attachPreferenceUserCookie(denied, resolvedPreferenceUser);
    return denied;
  }

  const response = NextResponse.json({
    userId,
    role,
    sessionId: resolvedPreferenceUser.sessionId,
  });

  attachAuthCookies(response, { userId, role });
  attachPreferenceUserCookie(response, {
    ...resolvedPreferenceUser,
    userId,
    shouldSetPreferenceCookie: true,
  });

  return response;
}
