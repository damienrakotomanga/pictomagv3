import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolvePreferenceUser,
} from "@/lib/server/preference-user";
import {
  formatSseEvent,
  getLiveShoppingPresenceSnapshot,
  registerLiveShoppingPresence,
  subscribeLiveShoppingEvents,
  type LiveShoppingRealtimeEvent,
} from "@/lib/server/live-shopping-realtime";
import { readLiveShoppingRoomStateServer } from "@/lib/server/live-shopping-room-state-store";
import {
  getPersistedLiveSessionEventById,
  listPersistedLiveInventoryForRoom,
  listPersistedLiveOrdersForUser,
} from "@/lib/server/live-shopping-records";

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
  const compatibilityUser = resolvePreferenceUser(request, {
    allowQueryUserId: false,
  });
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  const resolvedUser = authenticatedUser
    ? bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token")
    : compatibilityUser;
  const eventId = parseEventId(request.nextUrl.searchParams.get("eventId"));
  const event = eventId ? getPersistedLiveSessionEventById(eventId) : null;
  const liveSlug = event?.slug ?? null;

  const [orders, inventory, roomState] = await Promise.all([
    authenticatedUser
      ? Promise.resolve(
          listPersistedLiveOrdersForUser(authenticatedUser.user.id, {
            eventId: eventId ?? undefined,
          }),
        )
      : Promise.resolve([]),
    liveSlug
      ? Promise.resolve(
          listPersistedLiveInventoryForRoom({
            liveSlug,
            event,
          }),
        )
      : Promise.resolve([]),
    eventId ? readLiveShoppingRoomStateServer(eventId) : Promise.resolve(null),
  ]);
  const initialPresence = getLiveShoppingPresenceSnapshot(eventId);

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let detachListener: (() => void) | null = null;
  let abortHandler: (() => void) | null = null;
  let closed = false;
  let removePresence: (() => void) | null = null;

  const cleanup = () => {
    if (closed) {
      return;
    }

    closed = true;

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (detachListener) {
      detachListener();
      detachListener = null;
    }

    if (abortHandler) {
      request.signal.removeEventListener("abort", abortHandler);
      abortHandler = null;
    }

    if (removePresence) {
      removePresence();
      removePresence = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (event: LiveShoppingRealtimeEvent) => {
        controller.enqueue(encoder.encode(formatSseEvent(event)));
      };

      push({
        type: "live.sync",
        userId: resolvedUser.userId,
        eventId: eventId ?? undefined,
        payload: {
          orders,
          inventory,
          roomState,
          presence: initialPresence,
          connected: true,
        },
        occurredAt: Date.now(),
      });

      removePresence = registerLiveShoppingPresence({
        userId: resolvedUser.userId,
        eventId,
        transport: "sse",
      });

      detachListener = subscribeLiveShoppingEvents((event) => {
        const isGlobalEvent = event.userId === "__global__";
        if (!isGlobalEvent && event.userId !== resolvedUser.userId) {
          return;
        }

        if (eventId !== null && event.eventId !== undefined && event.eventId !== eventId) {
          return;
        }

        if (eventId === null && isGlobalEvent && typeof event.eventId === "number") {
          return;
        }

        push(event);
      });

      heartbeatTimer = setInterval(() => {
        if (closed) {
          return;
        }

        push({
          type: "system.heartbeat",
          userId: resolvedUser.userId,
          eventId: eventId ?? undefined,
          payload: { ok: true },
          occurredAt: Date.now(),
        });
      }, 15000);

      abortHandler = () => {
        cleanup();
        controller.close();
      };

      request.signal.addEventListener("abort", abortHandler, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  const response = new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
