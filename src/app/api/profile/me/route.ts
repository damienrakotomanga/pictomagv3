import { NextRequest, NextResponse } from "next/server";
import {
  normalizeAuthDisplayName,
  normalizeAuthUsername,
  resolveAuthenticatedAppUser,
  serializePublicAuthUser,
  serializePublicProfile,
} from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolveExistingPreferenceUser,
} from "@/lib/server/preference-user";
import { getProfileByUsername, updateProfileByUserId } from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const resolvedPreferenceUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
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

export async function PATCH(request: NextRequest) {
  const resolvedPreferenceUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
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

  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const requestedUsername = normalizeAuthUsername(payload?.username);
  const username = requestedUsername ?? authenticatedUser.profile.username;
  const displayName = normalizeAuthDisplayName(
    payload?.displayName,
    authenticatedUser.profile.display_name,
  );
  const bio = typeof payload?.bio === "string" ? payload.bio.trim().slice(0, 280) : authenticatedUser.profile.bio;
  const avatarUrl =
    typeof payload?.avatarUrl === "string"
      ? payload.avatarUrl.trim().slice(0, 600_000) || null
      : authenticatedUser.profile.avatar_url;
  const websiteUrl =
    typeof payload?.websiteUrl === "string"
      ? payload.websiteUrl.trim().slice(0, 2048) || null
      : authenticatedUser.profile.website_url;
  const markOnboardingCompleted = payload?.completeOnboarding === true;

  const existingUsernameProfile = getProfileByUsername(username);
  if (existingUsernameProfile && existingUsernameProfile.user_id !== authenticatedUser.user.id) {
    return NextResponse.json({ message: "Ce nom d utilisateur est deja pris." }, { status: 409 });
  }

  const profile = updateProfileByUserId({
    userId: authenticatedUser.user.id,
    username,
    displayName,
    bio,
    avatarUrl,
    websiteUrl,
    markOnboardingCompleted,
  });

  if (!profile) {
    return NextResponse.json({ message: "Impossible de mettre a jour le profil." }, { status: 500 });
  }

  const boundPreferenceUser = bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token");
  const response = NextResponse.json({
    authenticated: true,
    compatibilityMode: authenticatedUser.compatibilityMode,
    role: authenticatedUser.role,
    user: serializePublicAuthUser(authenticatedUser.user),
    profile: serializePublicProfile(profile),
  });

  attachPreferenceUserCookie(response, boundPreferenceUser);
  return response;
}
