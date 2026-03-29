import { NextRequest, NextResponse } from "next/server";
import {
  readMarketplacePreferencesServer,
  seedPreferencesStoreIfMissing,
  writeMarketplacePreferencesServer,
} from "@/lib/server/preferences-store";
import { attachPreferenceUserCookie, resolvePreferenceUser } from "@/lib/server/preference-user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  await seedPreferencesStoreIfMissing(resolvedUser.userId);
  const preferences = await readMarketplacePreferencesServer(resolvedUser.userId);
  const response = NextResponse.json({
    preferences,
    userId: resolvedUser.userId,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

export async function PUT(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  let payload: { preferences?: unknown } | null = null;

  try {
    payload = (await request.json()) as { preferences?: unknown };
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const preferences = await writeMarketplacePreferencesServer(payload?.preferences, resolvedUser.userId);
  const response = NextResponse.json({
    preferences,
    userId: resolvedUser.userId,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
