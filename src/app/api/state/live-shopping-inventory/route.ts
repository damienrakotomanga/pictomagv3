import { NextRequest, NextResponse } from "next/server";
import { attachPreferenceUserCookie, resolvePreferenceUser } from "@/lib/server/preference-user";
import {
  readLiveShoppingInventoryServer,
  seedUserRuntimeStateIfMissing,
  writeLiveShoppingInventoryServer,
} from "@/lib/server/user-runtime-state-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  await seedUserRuntimeStateIfMissing(resolvedUser.userId);
  const inventory = await readLiveShoppingInventoryServer(resolvedUser.userId);
  const response = NextResponse.json({
    inventory,
    userId: resolvedUser.userId,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

export async function PUT(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  let payload: { inventory?: unknown } | null = null;

  try {
    payload = (await request.json()) as { inventory?: unknown };
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const inventory = await writeLiveShoppingInventoryServer(payload?.inventory, resolvedUser.userId);
  const response = NextResponse.json({
    inventory,
    userId: resolvedUser.userId,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
