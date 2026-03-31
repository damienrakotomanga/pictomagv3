import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolveExistingPreferenceUser,
} from "@/lib/server/preference-user";
import {
  listPersistedLiveScheduleForOwner,
  replacePersistedLiveScheduleForOwner,
} from "@/lib/server/live-shopping-records";
import {
  normalizeLiveShoppingScheduledLive,
  type LiveShoppingScheduledLive,
} from "@/lib/live-shopping-schedule";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const compatibilityUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (!authenticatedUser) {
    const denied = NextResponse.json({ message: "Authentification requise." }, { status: 401 });
    attachPreferenceUserCookie(denied, compatibilityUser);
    return denied;
  }

  const resolvedUser = bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token");
  const schedule = listPersistedLiveScheduleForOwner(authenticatedUser.user.id);

  const response = NextResponse.json({
    schedule,
    userId: authenticatedUser.user.id,
  });
  attachPreferenceUserCookie(response, resolvedUser);

  return response;
}

export async function PUT(request: NextRequest) {
  const compatibilityUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (!authenticatedUser) {
    const denied = NextResponse.json({ message: "Authentification requise." }, { status: 401 });
    attachPreferenceUserCookie(denied, compatibilityUser);
    return denied;
  }

  const resolvedUser = bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token");
  let payload: { schedule?: unknown } | null = null;

  try {
    payload = (await request.json()) as { schedule?: unknown };
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const incomingSchedule = Array.isArray(payload?.schedule) ? payload.schedule : [];
  const schedule = replacePersistedLiveScheduleForOwner({
    ownerUserId: authenticatedUser.user.id,
    schedule: incomingSchedule.map((entry) =>
      normalizeLiveShoppingScheduledLive(entry as LiveShoppingScheduledLive),
    ),
  });
  const response = NextResponse.json({
    schedule,
    userId: authenticatedUser.user.id,
  });
  attachPreferenceUserCookie(response, resolvedUser);

  return response;
}
