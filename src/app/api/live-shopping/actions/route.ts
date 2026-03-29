import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyBidToRoomState } from "@/lib/live-shopping-room-state";
import { consumeLiveShoppingRateLimit } from "@/lib/server/live-shopping-rate-limit";
import { isRoleAllowed, resolveAuthRole } from "@/lib/server/auth-user";
import { publishLiveShoppingEvent } from "@/lib/server/live-shopping-realtime";
import {
  readLiveShoppingRoomStateServer,
  writeLiveShoppingRoomStateServer,
} from "@/lib/server/live-shopping-room-state-store";
import { attachPreferenceUserCookie, resolvePreferenceUser } from "@/lib/server/preference-user";
import {
  getActionIdempotencyRecord,
  insertActionIdempotencyRecord,
  insertAuditLog,
} from "@/lib/server/sqlite-store";
import {
  readLiveShoppingInventoryServer,
  readLiveShoppingOrdersServer,
  seedUserRuntimeStateIfMissing,
  writeLiveShoppingInventoryServer,
  writeLiveShoppingOrdersServer,
} from "@/lib/server/user-runtime-state-store";

export const runtime = "nodejs";
const IDEMPOTENCY_HEADER_NAME = "x-idempotency-key";

type LiveActionKind = "place_bid" | "checkout";
type LiveLotMode = "fixed" | "auction";

type LiveActionLotPayload = {
  id: string;
  title: string;
  mode: LiveLotMode;
  price: number;
  currentBid?: number | null;
  bidIncrement?: number | null;
  delivery?: string;
  stock?: number;
};

type LiveActionPayload = {
  action: LiveActionKind;
  eventId: number;
  eventSeller: string;
  lot: LiveActionLotPayload;
  amount?: number;
  quantity?: number;
  note?: string;
  paymentMethod?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asPositiveInteger(value: unknown, fallback = 1) {
  const parsed = asNumber(value);
  if (parsed === null) {
    return fallback;
  }

  const int = Math.trunc(parsed);
  return int > 0 ? int : fallback;
}

function parsePayload(value: unknown): LiveActionPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const action = asString(value.action);
  const eventId = asNumber(value.eventId);
  const eventSeller = asString(value.eventSeller);
  const lotValue = value.lot;

  if ((action !== "place_bid" && action !== "checkout") || eventId === null || !eventSeller || !isRecord(lotValue)) {
    return null;
  }

  const lotId = asString(lotValue.id);
  const lotTitle = asString(lotValue.title);
  const lotMode = asString(lotValue.mode);
  const lotPrice = asNumber(lotValue.price);

  if (!lotId || !lotTitle || (lotMode !== "fixed" && lotMode !== "auction") || lotPrice === null) {
    return null;
  }

  return {
    action,
    eventId,
    eventSeller,
    lot: {
      id: lotId,
      title: lotTitle,
      mode: lotMode,
      price: Math.max(0, lotPrice),
      currentBid: asNumber(lotValue.currentBid),
      bidIncrement: asNumber(lotValue.bidIncrement),
      delivery: asString(lotValue.delivery) ?? "48h",
      stock: asPositiveInteger(lotValue.stock, 1),
    },
    amount: asNumber(value.amount) ?? undefined,
    quantity: asPositiveInteger(value.quantity, 1),
    note: asString(value.note) ?? "",
    paymentMethod: asString(value.paymentMethod) ?? undefined,
  };
}

function asSerializableRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, current]) => [key, normalizeForHash(current)]);
    return Object.fromEntries(entries);
  }

  return value;
}

function hashPayload(value: unknown) {
  const normalized = normalizeForHash(value);
  const serialized = JSON.stringify(normalized);
  return createHash("sha256").update(serialized).digest("hex");
}

function resolveIdempotencyKey(request: NextRequest) {
  const rawValue = request.headers.get(IDEMPOTENCY_HEADER_NAME)?.trim() ?? null;
  if (!rawValue) {
    return null;
  }

  if (!/^[a-zA-Z0-9:_-]{8,200}$/.test(rawValue)) {
    return null;
  }

  return rawValue;
}

function parseStoredBody(value: string) {
  try {
    return asSerializableRecord(JSON.parse(value) as unknown);
  } catch {
    return {
      ok: true,
      message: "Reponse idempotente rejouee.",
    } satisfies Record<string, unknown>;
  }
}

function jsonWithPreferenceCookie(
  payload: Record<string, unknown>,
  {
    status = 200,
    idempotencyReplay = false,
    headers,
    resolvedUser,
  }: {
    status?: number;
    idempotencyReplay?: boolean;
    headers?: Record<string, string>;
    resolvedUser: ReturnType<typeof resolvePreferenceUser>;
  },
) {
  const responseHeaders: Record<string, string> = {
    ...(headers ?? {}),
    ...(idempotencyReplay ? { "x-idempotency-replayed": "1" } : {}),
  };
  const response = NextResponse.json(payload, {
    status,
    headers: Object.keys(responseHeaders).length > 0 ? responseHeaders : undefined,
  });
  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

export async function POST(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  const role = resolveAuthRole(request);

  if (!isRoleAllowed(role, ["buyer", "seller", "moderator", "admin"])) {
    return jsonWithPreferenceCookie(
      {
        message: "Role non autorise pour cette action.",
        role,
      },
      {
        status: 403,
        resolvedUser,
      },
    );
  }

  const idempotencyKey = resolveIdempotencyKey(request);

  let rawPayload: unknown = null;
  try {
    rawPayload = await request.json();
  } catch {
    return jsonWithPreferenceCookie(
      { message: "JSON body invalide." },
      {
        status: 400,
        resolvedUser,
      },
    );
  }

  const payload = parsePayload(rawPayload);
  if (!payload) {
    return jsonWithPreferenceCookie(
      { message: "Payload action live invalide." },
      {
        status: 400,
        resolvedUser,
      },
    );
  }

  const payloadFingerprint = hashPayload(payload);

  if (idempotencyKey) {
    const existingRecord = getActionIdempotencyRecord({
      userId: resolvedUser.userId,
      key: idempotencyKey,
      action: payload.action,
    });

    if (existingRecord) {
      if (existingRecord.request_fingerprint !== payloadFingerprint) {
        return jsonWithPreferenceCookie(
          {
            message: "Cle d idempotence deja utilisee avec un payload different.",
          },
          {
            status: 409,
            resolvedUser,
          },
        );
      }

      const storedBody = parseStoredBody(existingRecord.response_body);
      return jsonWithPreferenceCookie(storedBody, {
        status: existingRecord.status_code,
        idempotencyReplay: true,
        resolvedUser,
      });
    }
  }

  if (payload.action === "place_bid") {
    const bidBurst = consumeLiveShoppingRateLimit({
      scope: "live-bid-burst",
      userId: resolvedUser.userId,
      eventId: payload.eventId,
      limit: 12,
      windowMs: 10_000,
    });
    if (!bidBurst.ok) {
      return jsonWithPreferenceCookie(
        {
          message: "Trop d encheres en peu de temps. Reessaie dans un instant.",
          retryAfterMs: bidBurst.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil(bidBurst.retryAfterMs / 1000))),
          },
          resolvedUser,
        },
      );
    }

    const bidMinute = consumeLiveShoppingRateLimit({
      scope: "live-bid-minute",
      userId: resolvedUser.userId,
      eventId: payload.eventId,
      limit: 80,
      windowMs: 60_000,
    });
    if (!bidMinute.ok) {
      return jsonWithPreferenceCookie(
        {
          message: "Limite d encheres atteinte pour cette minute.",
          retryAfterMs: bidMinute.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil(bidMinute.retryAfterMs / 1000))),
          },
          resolvedUser,
        },
      );
    }
  }

  if (payload.action === "checkout") {
    const checkoutLimit = consumeLiveShoppingRateLimit({
      scope: "live-checkout-minute",
      userId: resolvedUser.userId,
      eventId: payload.eventId,
      limit: 8,
      windowMs: 60_000,
    });
    if (!checkoutLimit.ok) {
      return jsonWithPreferenceCookie(
        {
          message: "Trop de tentatives de paiement. Reessaie dans quelques secondes.",
          retryAfterMs: checkoutLimit.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil(checkoutLimit.retryAfterMs / 1000))),
          },
          resolvedUser,
        },
      );
    }
  }

  await seedUserRuntimeStateIfMissing(resolvedUser.userId);

  const [orders, inventory] = await Promise.all([
    readLiveShoppingOrdersServer(resolvedUser.userId),
    readLiveShoppingInventoryServer(resolvedUser.userId),
  ]);
  const roomState = await readLiveShoppingRoomStateServer(payload.eventId);

  const inventoryIndex = inventory.findIndex((product) => product.id === payload.lot.id);
  const inventoryProduct = inventoryIndex >= 0 ? inventory[inventoryIndex] : null;

  if (payload.action === "place_bid") {
    if (payload.lot.mode !== "auction") {
      return jsonWithPreferenceCookie(
        { message: "Ce lot n est pas en mode enchere." },
        {
          status: 409,
          resolvedUser,
        },
      );
    }

    const runtimeLotState = roomState.lotStates[payload.lot.id];
    const currentBid = Math.max(
      payload.lot.price,
      inventoryProduct?.currentBid ?? 0,
      runtimeLotState?.currentBid ?? 0,
      payload.lot.currentBid ?? 0,
    );
    const bidIncrement = inventoryProduct?.bidIncrement ?? payload.lot.bidIncrement ?? 1;
    const minimumBid = currentBid + bidIncrement;
    const offeredAmount = payload.amount ?? 0;

    if (offeredAmount < minimumBid) {
      return jsonWithPreferenceCookie(
        {
          message: `Offre minimale: ${minimumBid} EUR.`,
          minimumBid,
        },
        {
          status: 409,
          resolvedUser,
        },
      );
    }

    let nextInventory = inventory;
    if (inventoryProduct) {
      nextInventory = inventory.map((product) =>
        product.id !== payload.lot.id
          ? product
          : {
              ...product,
              currentBid: offeredAmount,
            },
      );
      await writeLiveShoppingInventoryServer(nextInventory, resolvedUser.userId);
    }
    const nextRoomState = await writeLiveShoppingRoomStateServer(
      payload.eventId,
      applyBidToRoomState({
        state: roomState,
        lotId: payload.lot.id,
        amount: offeredAmount,
        bidder: resolvedUser.userId,
      }),
    );

    const responsePayload = {
      ok: true,
      action: payload.action,
      acceptedBid: offeredAmount,
      minimumBid,
      inventory: nextInventory,
      orders,
      roomState: nextRoomState,
      userId: resolvedUser.userId,
      role,
    } satisfies Record<string, unknown>;

    if (idempotencyKey) {
      insertActionIdempotencyRecord({
        userId: resolvedUser.userId,
        key: idempotencyKey,
        action: payload.action,
        requestFingerprint: payloadFingerprint,
        responseBody: JSON.stringify(responsePayload),
        statusCode: 200,
      });
    }

    insertAuditLog({
      userId: resolvedUser.userId,
      role,
      actionType: "place_bid",
      resourceType: "live_lot",
      resourceId: payload.lot.id,
      metadata: JSON.stringify({
        eventId: payload.eventId,
        amount: offeredAmount,
        minimumBid,
      }),
    });

    publishLiveShoppingEvent({
      type: "live.sync",
      userId: resolvedUser.userId,
      eventId: payload.eventId,
      actorUserId: resolvedUser.userId,
      payload: {
        action: "place_bid",
        acceptedBid: offeredAmount,
        minimumBid,
        inventory: nextInventory,
        orders,
        roomState: nextRoomState,
      },
    });

    publishLiveShoppingEvent({
      type: "live.sync",
      userId: "__global__",
      eventId: payload.eventId,
      actorUserId: resolvedUser.userId,
      payload: {
        action: "place_bid",
        acceptedBid: offeredAmount,
        minimumBid,
        lotId: payload.lot.id,
        roomState: nextRoomState,
      },
    });

    return jsonWithPreferenceCookie(responsePayload, {
      resolvedUser,
    });
  }

  const quantity = payload.quantity ?? 1;
  const checkoutAmount =
    payload.lot.mode === "auction"
      ? Math.max(
          0,
          payload.amount ??
            roomState.lotStates[payload.lot.id]?.currentBid ??
            inventoryProduct?.currentBid ??
            payload.lot.currentBid ??
            payload.lot.price,
        )
      : Math.max(0, inventoryProduct?.price ?? payload.lot.price);

  if (checkoutAmount <= 0) {
    return jsonWithPreferenceCookie(
      { message: "Montant de checkout invalide." },
      {
        status: 400,
        resolvedUser,
      },
    );
  }

  let nextInventory = inventory;
  let remainingStock = Math.max(0, (payload.lot.stock ?? quantity) - quantity);

  if (inventoryProduct) {
    if (inventoryProduct.quantity < quantity) {
      return jsonWithPreferenceCookie(
        {
          message: "Stock insuffisant pour finaliser la commande.",
          remainingStock: inventoryProduct.quantity,
        },
        {
          status: 409,
          resolvedUser,
        },
      );
    }

    remainingStock = inventoryProduct.quantity - quantity;
    nextInventory = inventory.map((product) => {
      if (product.id !== payload.lot.id) {
        return product;
      }

      return {
        ...product,
        quantity: remainingStock,
        status: remainingStock <= 0 ? "inactive" : product.status,
        currentBid:
          payload.lot.mode === "auction"
            ? Math.max(product.currentBid ?? product.price, checkoutAmount)
            : product.currentBid,
      };
    });
  }

  const fees = Math.max(4, Math.round(checkoutAmount * 0.08));
  const totalAmount = checkoutAmount * quantity + fees;
  const orderId = Date.now() + Math.trunc(Math.random() * 1000);

  const nextOrders = [
    {
      id: orderId,
      eventId: payload.eventId,
      title: payload.lot.title,
      buyer: "Vous",
      seller: payload.eventSeller,
      amount: totalAmount,
      quantity,
      stageIndex: 0,
      etaLabel: payload.lot.delivery ?? "48h",
      lastUpdate: "Paiement simule valide, preparation du lot en cours.",
      note: payload.note?.trim() || `Paiement ${payload.paymentMethod ?? "carte"} valide.`,
    },
    ...orders,
  ];

  await Promise.all([
    writeLiveShoppingOrdersServer(nextOrders, resolvedUser.userId),
    writeLiveShoppingInventoryServer(nextInventory, resolvedUser.userId),
  ]);
  let nextRoomState = roomState;
  if (payload.lot.mode === "auction") {
    nextRoomState = await writeLiveShoppingRoomStateServer(
      payload.eventId,
      applyBidToRoomState({
        state: roomState,
        lotId: payload.lot.id,
        amount: checkoutAmount,
        bidder: resolvedUser.userId,
      }),
    );
  }

  const responsePayload = {
    ok: true,
    action: payload.action,
    order: nextOrders[0],
    orders: nextOrders,
    inventory: nextInventory,
    remainingStock,
    roomState: nextRoomState,
    userId: resolvedUser.userId,
    role,
  } satisfies Record<string, unknown>;

  if (idempotencyKey) {
    insertActionIdempotencyRecord({
      userId: resolvedUser.userId,
      key: idempotencyKey,
      action: payload.action,
      requestFingerprint: payloadFingerprint,
      responseBody: JSON.stringify(responsePayload),
      statusCode: 200,
    });
  }

  insertAuditLog({
    userId: resolvedUser.userId,
    role,
    actionType: "checkout",
    resourceType: "live_lot",
    resourceId: payload.lot.id,
    metadata: JSON.stringify({
      eventId: payload.eventId,
      orderId: orderId,
      quantity,
      amount: checkoutAmount,
      totalAmount,
      paymentMethod: payload.paymentMethod ?? "card",
    }),
  });

  publishLiveShoppingEvent({
    type: "live.sync",
    userId: resolvedUser.userId,
    eventId: payload.eventId,
    actorUserId: resolvedUser.userId,
    payload: {
        action: "checkout",
        order: nextOrders[0],
        orders: nextOrders,
        inventory: nextInventory,
        remainingStock,
        roomState: nextRoomState,
      },
    });

  publishLiveShoppingEvent({
      type: "live.sync",
      userId: "__global__",
      eventId: payload.eventId,
      actorUserId: resolvedUser.userId,
      payload: {
        action: "checkout",
        lotId: payload.lot.id,
        roomState: nextRoomState,
      },
    });

  return jsonWithPreferenceCookie(responsePayload, {
    resolvedUser,
  });
}
