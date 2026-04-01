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
import { listPersistedLiveInventoryForRoom } from "@/lib/server/live-shopping-records";
import { publishLiveShoppingEvent } from "@/lib/server/live-shopping-realtime";
import {
  buildLiveSessionControlPayload,
  canManageLiveShoppingEvent,
  parseLiveSessionTarget,
  resolveLiveShoppingEventTarget,
} from "@/lib/server/live-shopping-control-plane";
import {
  getLiveSessionRowByEventId,
  insertAuditLog,
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
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const target = parseLiveSessionTarget(rawBody);
  const event = resolveLiveShoppingEventTarget(target);
  if (!event) {
    const notFound = NextResponse.json({ message: "Session live introuvable." }, { status: 404 });
    attachPreferenceUserCookie(notFound, resolvedUser);
    return notFound;
  }

  if (!canManageLiveShoppingEvent({ authenticatedUser, event })) {
    const denied = NextResponse.json({ message: "Tu ne peux pas piloter cette enchere." }, { status: 403 });
    attachPreferenceUserCookie(denied, resolvedUser);
    return denied;
  }

  const existingSession = getLiveSessionRowByEventId(event.id);
  if (!existingSession) {
    const missing = NextResponse.json({ message: "Controle live indisponible pour cette session." }, { status: 404 });
    attachPreferenceUserCookie(missing, resolvedUser);
    return missing;
  }

  const lotId =
    isRecord(rawBody) && typeof rawBody.lotId === "string" && rawBody.lotId.trim().length > 0 ? rawBody.lotId.trim() : null;
  if (!lotId) {
    const invalid = NextResponse.json({ message: "lotId est requis." }, { status: 400 });
    attachPreferenceUserCookie(invalid, resolvedUser);
    return invalid;
  }

  const inventory = listPersistedLiveInventoryForRoom({
    liveSlug: event.slug,
    event,
  });
  const lot = inventory.find((entry) => entry.id === lotId) ?? null;
  if (!lot) {
    const notFound = NextResponse.json({ message: "Lot introuvable." }, { status: 404 });
    attachPreferenceUserCookie(notFound, resolvedUser);
    return notFound;
  }

  if (lot.mode !== "auction") {
    const invalid = NextResponse.json({ message: "Ce lot n est pas en mode enchere." }, { status: 409 });
    attachPreferenceUserCookie(invalid, resolvedUser);
    return invalid;
  }

  const requestedDurationMs =
    isRecord(rawBody) && typeof rawBody.durationMs === "number" && Number.isFinite(rawBody.durationMs)
      ? Math.trunc(rawBody.durationMs)
      : 60_000;
  const durationMs = Math.max(15_000, Math.min(300_000, requestedDurationMs));
  const now = Date.now();
  const auctionEndsAt = now + durationMs;
  const liveSession = updateLiveSessionControlRow({
    eventId: event.id,
    liveState: existingSession.live_state === "ended" ? "scheduled" : "live",
    currentLotId: lot.id,
    auctionStatus: "open",
    auctionEndsAt,
    startedAt: existingSession.started_at ?? now,
    endedAt: null,
  });

  insertAuditLog({
    userId: authenticatedUser.user.id,
    role: authenticatedUser.role,
    actionType: "open_auction",
    resourceType: "live_lot",
    resourceId: lot.id,
    metadata: JSON.stringify({
      eventId: event.id,
      durationMs,
      auctionEndsAt,
    }),
  });

  publishLiveShoppingEvent({
    type: "live.sync",
    userId: "__global__",
    eventId: event.id,
    actorUserId: authenticatedUser.user.id,
    payload: {
      action: "auction_open",
      lotId: lot.id,
      durationMs,
      auctionEndsAt,
      sessionControl: buildLiveSessionControlPayload(liveSession),
    },
  });

  const response = NextResponse.json({
    ok: true,
    lot,
    durationMs,
    auctionEndsAt,
    sessionControl: buildLiveSessionControlPayload(liveSession),
  });
  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
