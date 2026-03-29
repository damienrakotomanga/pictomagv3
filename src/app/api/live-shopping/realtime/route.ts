import { NextRequest, NextResponse } from "next/server";
import { resolveAuthRole } from "@/lib/server/auth-user";
import {
  ensureLiveShoppingWsServer,
  getLiveShoppingPresenceSnapshot,
  getLiveShoppingRealtimeStatus,
  waitForLiveShoppingRedisBridge,
} from "@/lib/server/live-shopping-realtime";
import { attachPreferenceUserCookie, resolvePreferenceUser } from "@/lib/server/preference-user";
import { createLiveShoppingWsTicket } from "@/lib/server/live-shopping-ws-auth";

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
  const role = resolveAuthRole(request);
  const eventId = parseEventId(request.nextUrl.searchParams.get("eventId"));
  const ws = ensureLiveShoppingWsServer();
  await waitForLiveShoppingRedisBridge();
  const realtimeStatus = getLiveShoppingRealtimeStatus();
  const presence = getLiveShoppingPresenceSnapshot(eventId);
  const protocol = request.nextUrl.protocol === "https:" ? "wss" : "ws";
  const wsHost = request.nextUrl.hostname;
  const wsTicket = ws.enabled
    ? createLiveShoppingWsTicket({
        userId: resolvedUser.userId,
        role,
        eventId,
      })
    : null;
  const wsUrl = ws.enabled
    ? `${protocol}://${wsHost}:${ws.port}/live-shopping/ws?ticket=${encodeURIComponent(wsTicket ?? "")}${
        eventId ? `&eventId=${eventId}` : ""
      }`
    : null;
  const sseUrl = `/api/live-shopping/stream${eventId ? `?eventId=${eventId}` : ""}`;

  const response = NextResponse.json(
    {
      ok: true,
      transport: ws.enabled ? "websocket" : "sse",
      wsUrl,
      wsPort: ws.port,
      protocolVersion: ws.protocolVersion,
      disabledReason: ws.disabledReason,
      sseUrl,
      userId: resolvedUser.userId,
      role,
      eventId,
      bridge: realtimeStatus.bridge,
      presence,
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
