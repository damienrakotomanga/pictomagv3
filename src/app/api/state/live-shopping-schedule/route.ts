import { NextRequest, NextResponse } from "next/server";
import { attachPreferenceUserCookie, resolvePreferenceUser } from "@/lib/server/preference-user";
import {
  readLiveShoppingScheduleServer,
  seedUserRuntimeStateIfMissing,
  writeLiveShoppingScheduleServer,
} from "@/lib/server/user-runtime-state-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  await seedUserRuntimeStateIfMissing(resolvedUser.userId);
  const schedule = await readLiveShoppingScheduleServer(resolvedUser.userId);

  const response = NextResponse.json({
    schedule,
    userId: resolvedUser.userId,
  });
  attachPreferenceUserCookie(response, resolvedUser);

  return response;
}

export async function PUT(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  let payload: { schedule?: unknown } | null = null;

  try {
    payload = (await request.json()) as { schedule?: unknown };
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const schedule = await writeLiveShoppingScheduleServer(payload?.schedule, resolvedUser.userId);
  const response = NextResponse.json({
    schedule,
    userId: resolvedUser.userId,
  });
  attachPreferenceUserCookie(response, resolvedUser);

  return response;
}
