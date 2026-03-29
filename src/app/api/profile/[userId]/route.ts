import { NextRequest, NextResponse } from "next/server";
import { getPublicProfileBundle } from "@/lib/server/post-records";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  const normalizedIdentifier = userId.trim();

  if (!normalizedIdentifier) {
    return NextResponse.json({ message: "Identifiant de profil invalide." }, { status: 400 });
  }

  const profileBundle = getPublicProfileBundle(normalizedIdentifier);
  if (!profileBundle) {
    return NextResponse.json({ message: "Profil introuvable." }, { status: 404 });
  }

  return NextResponse.json(profileBundle);
}
