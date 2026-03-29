import { NextRequest, NextResponse } from "next/server";
import {
  resolveAuthenticatedAppUser,
  serializePublicAuthUser,
  serializePublicProfile,
} from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolvePreferenceUser,
} from "@/lib/server/preference-user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const resolvedPreferenceUser = resolvePreferenceUser(request);
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (!authenticatedUser) {
    const denied = NextResponse.json(
      {
        message: "Authentification requise.",
      },
      { status: 401 },
    );
    attachPreferenceUserCookie(denied, resolvedPreferenceUser);
    return denied;
  }

  const boundPreferenceUser = bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token");
  const response = NextResponse.json({
    authenticated: true,
    compatibilityMode: authenticatedUser.compatibilityMode,
    role: authenticatedUser.role,
    user: serializePublicAuthUser(authenticatedUser.user),
    profile: serializePublicProfile(authenticatedUser.profile),
  });

  attachPreferenceUserCookie(response, boundPreferenceUser);
  return response;
}
