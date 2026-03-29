import { NextRequest, NextResponse } from "next/server";
import { attachPreferenceUserCookie, resolvePreferenceUser } from "@/lib/server/preference-user";
import { getLiveShoppingPresenceSnapshot } from "@/lib/server/live-shopping-realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseEventId(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  const eventId = parseEventId(request.nextUrl.searchParams.get("eventId"));
  const presence = getLiveShoppingPresenceSnapshot(eventId);

  const response = NextResponse.json(
    {
      ok: true,
      eventId,
      presence,
      userId: resolvedUser.userId,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

