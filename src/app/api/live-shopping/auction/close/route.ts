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
  buildLiveSessionControlPayload,
  canManageLiveShoppingEvent,
  parseLiveSessionTarget,
  resolveLiveShoppingEventTarget,
} from "@/lib/server/live-shopping-control-plane";
import {
  getLiveSessionRowByEventId,
  insertAuditLog,
  listLiveBidEventRows,
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
    const denied = NextResponse.json({ message: "Tu ne peux pas cloturer cette enchere." }, { status: 403 });
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
    isRecord(rawBody) && typeof rawBody.lotId === "string" && rawBody.lotId.trim().length > 0
      ? rawBody.lotId.trim()
      : existingSession.current_lot_id;
  if (!lotId) {
    const invalid = NextResponse.json({ message: "Aucun lot d enchere a cloturer." }, { status: 400 });
    attachPreferenceUserCookie(invalid, resolvedUser);
    return invalid;
  }

  const liveSession = updateLiveSessionControlRow({
    eventId: event.id,
    currentLotId: lotId,
    auctionStatus: "closed",
    auctionEndsAt: Date.now(),
  });
  const winningBid = listLiveBidEventRows({
    liveSessionEventId: event.id,
    lotId,
    limit: 1,
  })[0] ?? null;

  insertAuditLog({
    userId: authenticatedUser.user.id,
    role: authenticatedUser.role,
    actionType: "close_auction",
    resourceType: "live_lot",
    resourceId: lotId,
    metadata: JSON.stringify({
      eventId: event.id,
      winningBidId: winningBid?.id ?? null,
      winningAmount: winningBid?.amount ?? null,
    }),
  });

  publishLiveShoppingEvent({
    type: "live.sync",
    userId: "__global__",
    eventId: event.id,
    actorUserId: authenticatedUser.user.id,
    payload: {
      action: "auction_close",
      lotId,
      winningBid,
      sessionControl: buildLiveSessionControlPayload(liveSession),
    },
  });

  const response = NextResponse.json({
    ok: true,
    lotId,
    winningBid,
    sessionControl: buildLiveSessionControlPayload(liveSession),
  });
  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
