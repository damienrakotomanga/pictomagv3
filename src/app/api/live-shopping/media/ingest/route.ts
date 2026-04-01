import { NextRequest, NextResponse } from "next/server";
import {
  isRoleAllowed,
  resolveAuthenticatedAppUser,
} from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolveExistingPreferenceUser,
} from "@/lib/server/preference-user";
import { publishLiveShoppingEvent } from "@/lib/server/live-shopping-realtime";
import {
  buildLiveMediaRoomName,
  buildLiveSessionControlPayload,
  canManageLiveShoppingEvent,
  parseLiveSessionTarget,
  resolveLiveMediaProvider,
  resolveLiveShoppingEventTarget,
  resolveMediaBaseUrl,
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

  if (!isRoleAllowed(authenticatedUser.role, ["seller", "moderator", "admin"])) {
    const denied = NextResponse.json({ message: "Role non autorise." }, { status: 403 });
    attachPreferenceUserCookie(denied, resolvedUser);
    return denied;
  }

  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    rawBody = {};
  }

  const target = parseLiveSessionTarget(rawBody);
  const event = resolveLiveShoppingEventTarget(target);
  if (!event) {
    const notFound = NextResponse.json({ message: "Session live introuvable." }, { status: 404 });
    attachPreferenceUserCookie(notFound, resolvedUser);
    return notFound;
  }

  if (!canManageLiveShoppingEvent({ authenticatedUser, event })) {
    const denied = NextResponse.json({ message: "Tu ne peux pas configurer cet ingest." }, { status: 403 });
    attachPreferenceUserCookie(denied, resolvedUser);
    return denied;
  }

  const existingSession = getLiveSessionRowByEventId(event.id);
  if (!existingSession) {
    const missing = NextResponse.json({ message: "Controle live indisponible pour cette session." }, { status: 404 });
    attachPreferenceUserCookie(missing, resolvedUser);
    return missing;
  }

  const requestedProtocol =
    isRecord(rawBody) && typeof rawBody.ingestProtocol === "string" ? rawBody.ingestProtocol.trim().toLowerCase() : "";
  const ingestProtocol = requestedProtocol === "whip" ? "whip" : "rtmp";
  const requestedPublishMode =
    isRecord(rawBody) && typeof rawBody.publishMode === "string" ? rawBody.publishMode.trim().toLowerCase() : "";
  const publishMode = requestedPublishMode === "mobile" ? "mobile" : "desktop";
  const provider = resolveLiveMediaProvider();
  const roomName = buildLiveMediaRoomName(event, existingSession.media_room_name);
  const mediaStreamId = existingSession.media_stream_id ?? `${provider}:${event.id}:${ingestProtocol}`;
  const playbackHint = resolvePlaybackHint({
    provider,
    roomName,
  });
  const mediaStream = upsertLiveMediaStreamRow({
    id: mediaStreamId,
    liveSessionEventId: event.id,
    provider,
    roomName,
    ingestProtocol,
    providerStreamId: mediaStreamId,
    publisherIdentity: authenticatedUser.user.id,
    playbackHint,
    state: "ready",
  });
  const liveSession = updateLiveSessionControlRow({
    eventId: event.id,
    mediaProvider: provider,
    mediaRoomName: roomName,
    mediaStreamId,
    mediaStatus: "ready",
    publishMode,
  });
  const publishBaseUrl = resolveMediaBaseUrl({
    provider,
    ingestProtocol,
  });
  const publishUrl = publishBaseUrl ? `${publishBaseUrl.replace(/\/$/, "")}/${roomName}` : null;
  const publishKey = `pictomag-${event.id}-${ingestProtocol}`;

  insertAuditLog({
    userId: authenticatedUser.user.id,
    role: authenticatedUser.role,
    actionType: "create_ingest",
    resourceType: "live_session",
    resourceId: String(event.id),
    metadata: JSON.stringify({
      provider,
      ingestProtocol,
      publishMode,
      mediaStreamId,
      roomName,
    }),
  });

  publishLiveShoppingEvent({
    type: "live.sync",
    userId: "__global__",
    eventId: event.id,
    actorUserId: authenticatedUser.user.id,
    payload: {
      action: "media_ingest_ready",
      mediaStream,
      sessionControl: buildLiveSessionControlPayload(liveSession),
    },
  });

  const response = NextResponse.json({
    ok: true,
    integrationReady: false,
    provider,
    ingestProtocol,
    publishMode,
    roomName,
    publishUrl,
    publishKey,
    mediaStream,
    sessionControl: buildLiveSessionControlPayload(liveSession),
  });
  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
