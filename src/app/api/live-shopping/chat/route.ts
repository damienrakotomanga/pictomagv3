import { NextRequest, NextResponse } from "next/server";
import { appendChatMessageToRoomState } from "@/lib/live-shopping-room-state";
import { consumeLiveShoppingRateLimit } from "@/lib/server/live-shopping-rate-limit";
import { publishLiveShoppingEvent } from "@/lib/server/live-shopping-realtime";
import {
  patchLiveShoppingRoomStateServer,
  readLiveShoppingRoomStateServer,
} from "@/lib/server/live-shopping-room-state-store";
import {
  isRoleAllowed,
  resolveAuthenticatedAppUser,
} from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  createGuestPreferenceUser,
  resolveExistingPreferenceUser,
} from "@/lib/server/preference-user";
import { insertAuditLog } from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

type ChatPayload = {
  eventId?: unknown;
  body?: unknown;
  accent?: unknown;
};

function toPositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const parsed = Math.trunc(value);
  return parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const compatibilityUser =
    resolveExistingPreferenceUser(request, {
      allowQueryUserId: false,
    }) ?? createGuestPreferenceUser(request);
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  const resolvedUser = authenticatedUser
    ? bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token")
    : compatibilityUser;
  const rawEventId = request.nextUrl.searchParams.get("eventId");
  const parsedEventId = rawEventId ? Number.parseInt(rawEventId, 10) : NaN;
  const eventId = Number.isFinite(parsedEventId) && parsedEventId > 0 ? parsedEventId : null;

  if (!eventId) {
    const response = NextResponse.json({ message: "eventId est requis." }, { status: 400 });
    attachPreferenceUserCookie(response, resolvedUser);
    return response;
  }

  const roomState = await readLiveShoppingRoomStateServer(eventId);
  const response = NextResponse.json({
    eventId,
    roomState,
    userId: resolvedUser.userId,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

export async function POST(request: NextRequest) {
  const compatibilityUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (!authenticatedUser) {
    const denied = NextResponse.json(
      {
        message: "Authentification requise pour envoyer un message live.",
      },
      { status: 401 },
    );
    attachPreferenceUserCookie(denied, compatibilityUser);
    return denied;
  }

  const resolvedUser = bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token");
  const role = authenticatedUser.role;
  if (!isRoleAllowed(role, ["buyer", "seller", "moderator", "admin"])) {
    const denied = NextResponse.json(
      {
        message: "Role non autorise pour le chat live.",
      },
      { status: 403 },
    );
    attachPreferenceUserCookie(denied, resolvedUser);
    return denied;
  }

  let payload: ChatPayload | null = null;

  try {
    payload = (await request.json()) as ChatPayload;
  } catch {
    const response = NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
    attachPreferenceUserCookie(response, resolvedUser);
    return response;
  }

  const eventId = toPositiveInteger(payload?.eventId);
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const accent =
    typeof payload?.accent === "string" && payload.accent.trim().length > 0
      ? payload.accent.trim().slice(0, 24)
      : undefined;

  if (!eventId) {
    const response = NextResponse.json({ message: "eventId est requis." }, { status: 400 });
    attachPreferenceUserCookie(response, resolvedUser);
    return response;
  }

  if (!body) {
    const response = NextResponse.json({ message: "Le message est vide." }, { status: 400 });
    attachPreferenceUserCookie(response, resolvedUser);
    return response;
  }

  const burstLimit = consumeLiveShoppingRateLimit({
    scope: "live-chat-burst",
    userId: resolvedUser.userId,
    eventId,
    limit: 8,
    windowMs: 12_000,
  });
  if (!burstLimit.ok) {
    const response = NextResponse.json(
      {
        message: "Trop de messages envoyes trop vite. Reessaie dans un instant.",
        retryAfterMs: burstLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(burstLimit.retryAfterMs / 1000))),
        },
      },
    );
    attachPreferenceUserCookie(response, resolvedUser);
    return response;
  }

  const minuteLimit = consumeLiveShoppingRateLimit({
    scope: "live-chat-minute",
    userId: resolvedUser.userId,
    eventId,
    limit: 45,
    windowMs: 60_000,
  });
  if (!minuteLimit.ok) {
    const response = NextResponse.json(
      {
        message: "Limite de chat atteinte pour cette minute.",
        retryAfterMs: minuteLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(minuteLimit.retryAfterMs / 1000))),
        },
      },
    );
    attachPreferenceUserCookie(response, resolvedUser);
    return response;
  }

  const author =
    authenticatedUser.profile.username ||
    authenticatedUser.profile.display_name ||
    authenticatedUser.user.id;
  const isModerator = role === "moderator" || role === "admin";
  const roomState = await patchLiveShoppingRoomStateServer(eventId, (current) =>
    appendChatMessageToRoomState({
      state: current,
      author,
      body,
      mod: isModerator,
      accent,
    }),
  );
  const chatMessage = roomState.chat[roomState.chat.length - 1] ?? null;

  insertAuditLog({
    userId: authenticatedUser.user.id,
    role,
    actionType: "send_chat",
    resourceType: "live_room",
    resourceId: String(eventId),
    metadata: JSON.stringify({
      messageId: chatMessage?.id ?? null,
      bodyLength: body.length,
    }),
  });

  publishLiveShoppingEvent({
    type: "live.sync",
    userId: "__global__",
    eventId,
    actorUserId: authenticatedUser.user.id,
    payload: {
      action: "send_chat",
      roomState,
      chatMessage,
    },
  });

  const response = NextResponse.json({
    ok: true,
    eventId,
    roomState,
    chatMessage,
    userId: authenticatedUser.user.id,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
