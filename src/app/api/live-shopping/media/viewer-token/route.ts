import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolvePreferenceUser,
} from "@/lib/server/preference-user";
import {
  buildLiveMediaRoomName,
  buildLiveSessionControlPayload,
  parseLiveSessionTarget,
  parseLiveSessionTargetFromRequest,
  resolveLiveMediaProvider,
  resolveLiveShoppingEventTarget,
  resolvePlaybackHint,
} from "@/lib/server/live-shopping-control-plane";
import {
  getLiveSessionRowByEventId,
  listLiveMediaStreamRowsForSession,
} from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

async function buildViewerTokenResponse(request: NextRequest, rawBody?: unknown) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  const compatibilityUser = resolvePreferenceUser(request, {
    allowQueryUserId: false,
  });
  const resolvedUser = authenticatedUser
    ? bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token")
    : compatibilityUser;
  const target = rawBody ? parseLiveSessionTarget(rawBody) : parseLiveSessionTargetFromRequest(request);
  const event = resolveLiveShoppingEventTarget(target);

  if (!event) {
    const notFound = NextResponse.json({ message: "Session live introuvable." }, { status: 404 });
    attachPreferenceUserCookie(notFound, resolvedUser);
    return notFound;
  }

  const liveSession = getLiveSessionRowByEventId(event.id);
  if (!liveSession) {
    const missing = NextResponse.json({ message: "Controle live indisponible pour cette session." }, { status: 404 });
    attachPreferenceUserCookie(missing, resolvedUser);
    return missing;
  }

  const mediaStream = listLiveMediaStreamRowsForSession(event.id)[0] ?? null;
  const provider = liveSession.media_provider ?? resolveLiveMediaProvider();
  const roomName = liveSession.media_room_name ?? buildLiveMediaRoomName(event, null);
  const playbackHint =
    mediaStream?.playback_hint ??
    resolvePlaybackHint({
      provider,
      roomName,
    });

  const response = NextResponse.json({
    ok: true,
    integrationReady: false,
    token: null,
    provider,
    roomName,
    playbackHint,
    mediaStream,
    sessionControl: buildLiveSessionControlPayload(liveSession),
    viewerIdentity: authenticatedUser?.user.id ?? resolvedUser.userId,
    guest: !authenticatedUser,
    permissions: {
      canChat: Boolean(authenticatedUser),
      canBid: Boolean(authenticatedUser),
      canCheckout: Boolean(authenticatedUser),
    },
  });
  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

export async function GET(request: NextRequest) {
  return buildViewerTokenResponse(request);
}

export async function POST(request: NextRequest) {
  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    rawBody = {};
  }

  return buildViewerTokenResponse(request, rawBody);
}
