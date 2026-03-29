import { NextRequest, NextResponse } from "next/server";
import {
  attachAuthCookies,
  normalizeAuthEmail,
  normalizeAuthRole,
  serializePublicAuthUser,
  serializePublicProfile,
  verifyAuthPassword,
} from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
} from "@/lib/server/preference-user";
import { getProfileByUserId, getUserByEmail, touchUserLogin } from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: NextRequest) {
  let payload: LoginPayload | null = null;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const email = normalizeAuthEmail(payload?.email);
  const rawPassword = typeof payload?.password === "string" ? payload.password : "";

  if (!email || rawPassword.trim().length === 0) {
    return NextResponse.json({ message: "Email ou mot de passe invalide." }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user || user.auth_mode !== "local" || !verifyAuthPassword(rawPassword, user.password_hash)) {
    return NextResponse.json({ message: "Identifiants invalides." }, { status: 401 });
  }

  const profile = getProfileByUserId(user.id);
  if (!profile) {
    return NextResponse.json({ message: "Profil introuvable pour ce compte." }, { status: 500 });
  }

  touchUserLogin(user.id);
  const refreshedUser = getUserByEmail(email);
  const boundPreferenceUser = bindPreferenceUserToUserId(request, user.id, "auth-token");
  const response = NextResponse.json({
    authenticated: true,
    compatibilityMode: false,
    sessionId: boundPreferenceUser.sessionId,
    role: normalizeAuthRole(user.role),
    user: serializePublicAuthUser(refreshedUser ?? user),
    profile: serializePublicProfile(profile),
  });

  attachAuthCookies(response, {
    userId: user.id,
    role: normalizeAuthRole(user.role),
  });
  attachPreferenceUserCookie(response, boundPreferenceUser);

  return response;
}
