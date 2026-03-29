import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_MIN_PASSWORD_LENGTH,
  attachAuthCookies,
  createAuthUserId,
  hashAuthPassword,
  normalizeAuthDisplayName,
  normalizeAuthEmail,
  normalizeAuthRole,
  resolveAvailableProfileUsername,
  serializePublicAuthUser,
  serializePublicProfile,
} from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
} from "@/lib/server/preference-user";
import { createUserWithProfile, getUserByEmail } from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

type RegisterPayload = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
  username?: unknown;
};

function buildDefaultDisplayName(email: string) {
  const localPart = email.split("@")[0] ?? "Pictomag User";
  return normalizeAuthDisplayName(localPart.replace(/[._-]+/g, " "), "Pictomag User");
}

export async function POST(request: NextRequest) {
  let payload: RegisterPayload | null = null;

  try {
    payload = (await request.json()) as RegisterPayload;
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const email = normalizeAuthEmail(payload?.email);
  const rawPassword = typeof payload?.password === "string" ? payload.password.trim() : "";

  if (!email) {
    return NextResponse.json({ message: "Adresse email invalide." }, { status: 400 });
  }

  if (rawPassword.length < AUTH_MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        message: `Le mot de passe doit contenir au moins ${AUTH_MIN_PASSWORD_LENGTH} caracteres.`,
      },
      { status: 400 },
    );
  }

  const existingUser = getUserByEmail(email);
  if (existingUser) {
    return NextResponse.json(
      {
        message: "Un compte existe deja pour cet email.",
      },
      { status: 409 },
    );
  }

  const displayName = normalizeAuthDisplayName(payload?.displayName, buildDefaultDisplayName(email));
  const username = resolveAvailableProfileUsername(payload?.username ?? displayName, email.split("@")[0] ?? displayName);
  const passwordHash = hashAuthPassword(rawPassword);
  const userId = createAuthUserId("user");

  const created = createUserWithProfile({
    id: userId,
    email,
    passwordHash,
    role: normalizeAuthRole("buyer"),
    authMode: "local",
    username,
    displayName,
  });

  if (!created.user || !created.profile) {
    return NextResponse.json({ message: "Impossible de creer le compte." }, { status: 500 });
  }

  const boundPreferenceUser = bindPreferenceUserToUserId(request, created.user.id, "auth-token");
  const response = NextResponse.json(
    {
      authenticated: true,
      compatibilityMode: false,
      sessionId: boundPreferenceUser.sessionId,
      role: normalizeAuthRole(created.user.role),
      user: serializePublicAuthUser(created.user),
      profile: serializePublicProfile(created.profile),
    },
    { status: 201 },
  );

  attachAuthCookies(response, {
    userId: created.user.id,
    role: normalizeAuthRole(created.user.role),
  });
  attachPreferenceUserCookie(response, boundPreferenceUser);

  return response;
}
