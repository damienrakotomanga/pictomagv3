import type { NextRequest } from "next/server";
import type { AuthenticatedAppUser } from "@/lib/server/auth-user";
import type { LiveShoppingEvent } from "@/lib/live-shopping-data";
import {
  getPersistedLiveSessionEventById,
  getPersistedLiveSessionEventBySlug,
  getLiveShoppingOwnerUserId,
} from "@/lib/server/live-shopping-records";
import type { StoredLiveSessionRow } from "@/lib/server/sqlite-store";

type LiveSessionTargetInput = {
  eventId?: number | null;
  liveSlug?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseLiveSessionTarget(value: unknown): LiveSessionTargetInput {
  if (!isRecord(value)) {
    return {};
  }

  const rawEventId = value.eventId;
  const rawLiveSlug = value.liveSlug;
  const eventId =
    typeof rawEventId === "number" && Number.isFinite(rawEventId) && rawEventId > 0
      ? Math.trunc(rawEventId)
      : null;
  const liveSlug =
    typeof rawLiveSlug === "string" && rawLiveSlug.trim().length > 0
      ? rawLiveSlug.trim()
      : null;

  return {
    eventId,
    liveSlug,
  };
}

export function parseLiveSessionTargetFromRequest(request: NextRequest): LiveSessionTargetInput {
  const eventIdRaw = request.nextUrl.searchParams.get("eventId");
  const liveSlugRaw = request.nextUrl.searchParams.get("liveSlug");
  const eventId =
    eventIdRaw && Number.isFinite(Number.parseInt(eventIdRaw, 10)) && Number.parseInt(eventIdRaw, 10) > 0
      ? Number.parseInt(eventIdRaw, 10)
      : null;
  const liveSlug = liveSlugRaw?.trim() ? liveSlugRaw.trim() : null;

  return {
    eventId,
    liveSlug,
  };
}

export function resolveLiveShoppingEventTarget({
  eventId,
  liveSlug,
}: LiveSessionTargetInput): LiveShoppingEvent | null {
  if (typeof eventId === "number" && eventId > 0) {
    return getPersistedLiveSessionEventById(eventId);
  }

  if (typeof liveSlug === "string" && liveSlug.trim().length > 0) {
    return getPersistedLiveSessionEventBySlug(liveSlug.trim());
  }

  return null;
}

export function canManageLiveShoppingEvent({
  authenticatedUser,
  event,
}: {
  authenticatedUser: AuthenticatedAppUser;
  event: Pick<LiveShoppingEvent, "handle" | "seller">;
}) {
  if (authenticatedUser.role === "admin" || authenticatedUser.role === "moderator") {
    return true;
  }

  if (authenticatedUser.role !== "seller") {
    return false;
  }

  return getLiveShoppingOwnerUserId(event) === authenticatedUser.user.id;
}

export function buildLiveSessionControlPayload(session: StoredLiveSessionRow | null) {
  if (!session) {
    return null;
  }

  return {
    eventId: session.event_id,
    liveState: session.live_state,
    mediaProvider: session.media_provider,
    mediaRoomName: session.media_room_name,
    mediaStreamId: session.media_stream_id,
    mediaStatus: session.media_status,
    publishMode: session.publish_mode,
    currentLotId: session.current_lot_id,
    auctionStatus: session.auction_status,
    auctionEndsAt: session.auction_ends_at,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

export function resolveLiveMediaProvider() {
  const configured = process.env.PICTOMAG_LIVE_MEDIA_PROVIDER?.trim().toLowerCase();
  if (configured === "srs") {
    return "srs";
  }

  return "livekit";
}

export function buildLiveMediaRoomName(event: Pick<LiveShoppingEvent, "slug">, fallbackRoomName?: string | null) {
  if (fallbackRoomName && fallbackRoomName.trim().length > 0) {
    return fallbackRoomName.trim();
  }

  return `live-${event.slug}`;
}

export function resolveMediaBaseUrl({
  provider,
  ingestProtocol,
}: {
  provider: string;
  ingestProtocol: string;
}) {
  if (provider === "srs") {
    return ingestProtocol === "whip"
      ? process.env.SRS_WHIP_BASE_URL?.trim() ?? null
      : process.env.SRS_RTMP_BASE_URL?.trim() ?? null;
  }

  return ingestProtocol === "whip"
    ? process.env.LIVEKIT_WHIP_BASE_URL?.trim() ?? null
    : process.env.LIVEKIT_RTMP_BASE_URL?.trim() ?? null;
}

export function resolvePlaybackHint({
  provider,
  roomName,
}: {
  provider: string;
  roomName: string;
}) {
  if (provider === "srs") {
    return process.env.SRS_WHEP_BASE_URL?.trim()
      ? `${process.env.SRS_WHEP_BASE_URL?.trim()?.replace(/\/$/, "")}/${roomName}`
      : null;
  }

  const wsUrl = process.env.LIVEKIT_WS_URL?.trim() ?? process.env.LIVEKIT_URL?.trim() ?? null;
  if (!wsUrl) {
    return null;
  }

  return `${wsUrl.replace(/\/$/, "")}?room=${encodeURIComponent(roomName)}`;
}
