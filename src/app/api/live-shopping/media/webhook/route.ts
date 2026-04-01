import { NextRequest, NextResponse } from "next/server";
import { publishLiveShoppingEvent } from "@/lib/server/live-shopping-realtime";
import {
  buildLiveMediaRoomName,
  buildLiveSessionControlPayload,
  parseLiveSessionTarget,
  resolveLiveMediaProvider,
  resolveLiveShoppingEventTarget,
  resolvePlaybackHint,
} from "@/lib/server/live-shopping-control-plane";
import {
  getLiveSessionRowByEventId,
  insertAuditLog,
  upsertLiveMediaStreamRow,
  updateLiveSessionControlRow,
} from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.PICTOMAG_LIVE_WEBHOOK_SECRET?.trim() ?? "";
  const receivedSecret = request.headers.get("x-pictomag-live-webhook-secret")?.trim() ?? "";
  if (configuredSecret && receivedSecret !== configuredSecret) {
    return NextResponse.json({ message: "Webhook live non autorise." }, { status: 401 });
  }

  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const target = parseLiveSessionTarget(rawBody);
  const event = resolveLiveShoppingEventTarget(target);
  if (!event) {
    return NextResponse.json({ message: "Session live introuvable." }, { status: 404 });
  }

  const existingSession = getLiveSessionRowByEventId(event.id);
  if (!existingSession) {
    return NextResponse.json({ message: "Controle live indisponible pour cette session." }, { status: 404 });
  }

  const provider =
    isRecord(rawBody) && typeof rawBody.provider === "string" && rawBody.provider.trim().length > 0
      ? rawBody.provider.trim().toLowerCase()
      : existingSession.media_provider ?? resolveLiveMediaProvider();
  const roomName =
    isRecord(rawBody) && typeof rawBody.roomName === "string" && rawBody.roomName.trim().length > 0
      ? rawBody.roomName.trim()
      : buildLiveMediaRoomName(event, existingSession.media_room_name);
  const state =
    isRecord(rawBody) && typeof rawBody.state === "string" && rawBody.state.trim().length > 0
      ? rawBody.state.trim().toLowerCase()
      : "running";
  const ingestProtocol =
    isRecord(rawBody) && typeof rawBody.ingestProtocol === "string" && rawBody.ingestProtocol.trim().length > 0
      ? rawBody.ingestProtocol.trim().toLowerCase()
      : "rtmp";
  const publishMode =
    isRecord(rawBody) && typeof rawBody.publishMode === "string" && rawBody.publishMode.trim().length > 0
      ? rawBody.publishMode.trim().toLowerCase()
      : existingSession.publish_mode ?? "desktop";
  const startedAt =
    isRecord(rawBody) && typeof rawBody.startedAt === "number" && Number.isFinite(rawBody.startedAt)
      ? Math.trunc(rawBody.startedAt)
      : state === "running"
        ? existingSession.started_at ?? Date.now()
        : existingSession.started_at;
  const endedAt =
    isRecord(rawBody) && typeof rawBody.endedAt === "number" && Number.isFinite(rawBody.endedAt)
      ? Math.trunc(rawBody.endedAt)
      : state === "ended" || state === "stopped"
        ? Date.now()
        : existingSession.ended_at;
  const mediaStreamId =
    isRecord(rawBody) && typeof rawBody.streamId === "string" && rawBody.streamId.trim().length > 0
      ? rawBody.streamId.trim()
      : existingSession.media_stream_id ?? `${provider}:${event.id}:${ingestProtocol}`;
  const mediaStream = upsertLiveMediaStreamRow({
    id: mediaStreamId,
    liveSessionEventId: event.id,
    provider,
    roomName,
    ingestProtocol,
    providerStreamId: mediaStreamId,
    publisherIdentity:
      isRecord(rawBody) && typeof rawBody.publisherIdentity === "string" ? rawBody.publisherIdentity.trim() : null,
    playbackHint: resolvePlaybackHint({ provider, roomName }),
    state,
  });
  const nextLiveState = state === "ended" || state === "stopped" ? "ended" : "live";
  const liveSession = updateLiveSessionControlRow({
    eventId: event.id,
    liveState: nextLiveState,
    mediaProvider: provider,
    mediaRoomName: roomName,
    mediaStreamId,
    mediaStatus: state,
    publishMode,
    startedAt,
    endedAt,
  });

  insertAuditLog({
    userId: "system:webhook",
    role: "system",
    actionType: "media_webhook",
    resourceType: "live_session",
    resourceId: String(event.id),
    metadata: JSON.stringify({
      provider,
      roomName,
      state,
      ingestProtocol,
      publishMode,
      mediaStreamId,
    }),
  });

  publishLiveShoppingEvent({
    type: "live.sync",
    userId: "__global__",
    eventId: event.id,
    actorUserId: "system:webhook",
    payload: {
      action: "media_webhook",
      mediaStream,
      sessionControl: buildLiveSessionControlPayload(liveSession),
    },
  });

  return NextResponse.json({
    ok: true,
    mediaStream,
    sessionControl: buildLiveSessionControlPayload(liveSession),
  });
}
