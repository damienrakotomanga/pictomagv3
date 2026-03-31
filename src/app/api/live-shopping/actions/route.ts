import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyBidToRoomState } from "@/lib/live-shopping-room-state";
import { consumeLiveShoppingRateLimit } from "@/lib/server/live-shopping-rate-limit";
import {
  createLiveShoppingOrderRecord,
  getLiveShoppingOwnerUserId,
  getPersistedLiveSessionEventById,
  getPersistedLiveSessionEventBySlug,
  listPersistedLiveInventoryForRoom,
  listPersistedLiveOrdersForUser,
  upsertPersistedLiveRoomInventory,
} from "@/lib/server/live-shopping-records";
import { publishLiveShoppingEvent } from "@/lib/server/live-shopping-realtime";
import {
  readLiveShoppingRoomStateServer,
  writeLiveShoppingRoomStateServer,
} from "@/lib/server/live-shopping-room-state-store";
import {
  isRoleAllowed,
  resolveAuthenticatedAppUser,
} from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolveExistingPreferenceUser,
} from "@/lib/server/preference-user";
import {
  getActionIdempotencyRecord,
  insertActionIdempotencyRecord,
  insertAuditLog,
} from "@/lib/server/sqlite-store";

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
  liveSlug?: string;
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
  const liveSlug = asString(value.liveSlug);
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
    liveSlug: liveSlug ?? undefined,
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
    resolvedUser: ReturnType<typeof resolveExistingPreferenceUser> | ReturnType<typeof bindPreferenceUserToUserId>;
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
  const compatibilityUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (!authenticatedUser) {
    return jsonWithPreferenceCookie(
      {
        message: "Authentification requise pour interagir avec le live.",
      },
      {
        status: 401,
        resolvedUser: compatibilityUser,
      },
    );
  }

  const resolvedUser = bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token");
  const role = authenticatedUser.role;

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
      userId: authenticatedUser.user.id,
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

      return jsonWithPreferenceCookie(parseStoredBody(existingRecord.response_body), {
        status: existingRecord.status_code,
        idempotencyReplay: true,
        resolvedUser,
      });
    }
  }

  const burstLimit = consumeLiveShoppingRateLimit({
    scope: `live-action-${payload.action}-burst`,
    userId: authenticatedUser.user.id,
    eventId: payload.eventId,
    limit: payload.action === "place_bid" ? 6 : 4,
    windowMs: 10_000,
  });

  if (!burstLimit.ok) {
    return jsonWithPreferenceCookie(
      {
        message: "Trop d actions live en peu de temps. Reessaie dans un instant.",
        retryAfterMs: burstLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(burstLimit.retryAfterMs / 1000))),
        },
        resolvedUser,
      },
    );
  }

  const minuteLimit = consumeLiveShoppingRateLimit({
    scope: `live-action-${payload.action}-minute`,
    userId: authenticatedUser.user.id,
    eventId: payload.eventId,
    limit: payload.action === "place_bid" ? 30 : 20,
    windowMs: 60_000,
  });

  if (!minuteLimit.ok) {
    return jsonWithPreferenceCookie(
      {
        message: "Limite d actions live atteinte pour cette minute.",
        retryAfterMs: minuteLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(minuteLimit.retryAfterMs / 1000))),
        },
        resolvedUser,
      },
    );
  }

  const event =
    getPersistedLiveSessionEventById(payload.eventId) ??
    (payload.liveSlug ? getPersistedLiveSessionEventBySlug(payload.liveSlug) : null);
  if (!event) {
    return jsonWithPreferenceCookie(
      {
        message: "Session live introuvable.",
      },
      {
        status: 404,
        resolvedUser,
      },
    );
  }

  const ownerUserId = getLiveShoppingOwnerUserId(event);
  const inventory = listPersistedLiveInventoryForRoom({
    liveSlug: event.slug,
    event,
  });
  const inventoryProduct = inventory.find((product) => product.id === payload.lot.id) ?? null;
  const roomState = await readLiveShoppingRoomStateServer(event.id);
  const orders = listPersistedLiveOrdersForUser(authenticatedUser.user.id, {
    eventId: event.id,
  });

  if (!inventoryProduct) {
    return jsonWithPreferenceCookie(
      {
        message: "Lot live introuvable.",
      },
      {
        status: 404,
        resolvedUser,
      },
    );
  }

  if (payload.action === "place_bid") {
    if (inventoryProduct.mode !== "auction") {
      return jsonWithPreferenceCookie(
        {
          message: "Ce lot ne prend pas d encheres.",
        },
        {
          status: 409,
          resolvedUser,
        },
      );
    }

    const increment = Math.max(1, inventoryProduct.bidIncrement ?? payload.lot.bidIncrement ?? 1);
    const currentBid = Math.max(
      inventoryProduct.price,
      roomState.lotStates[payload.lot.id]?.currentBid ??
        inventoryProduct.currentBid ??
        payload.lot.currentBid ??
        inventoryProduct.price,
    );
    const minimumBid = currentBid + increment;
    const offeredAmount = Math.max(minimumBid, payload.amount ?? minimumBid);

    const nextInventory = upsertPersistedLiveRoomInventory({
      ownerUserId,
      liveSlug: event.slug,
      inventory: inventory.map((product) =>
        product.id !== payload.lot.id
          ? product
          : {
              ...product,
              currentBid: offeredAmount,
            },
      ),
    });

    const nextRoomState = await writeLiveShoppingRoomStateServer(
      payload.eventId,
      applyBidToRoomState({
        state: roomState,
        lotId: payload.lot.id,
        amount: offeredAmount,
        bidder: authenticatedUser.profile.username,
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
      userId: authenticatedUser.user.id,
      role,
    } satisfies Record<string, unknown>;

    if (idempotencyKey) {
      insertActionIdempotencyRecord({
        userId: authenticatedUser.user.id,
        key: idempotencyKey,
        action: payload.action,
        requestFingerprint: payloadFingerprint,
        responseBody: JSON.stringify(responsePayload),
        statusCode: 200,
      });
    }

    insertAuditLog({
      userId: authenticatedUser.user.id,
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
      userId: authenticatedUser.user.id,
      eventId: payload.eventId,
      actorUserId: authenticatedUser.user.id,
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
      actorUserId: authenticatedUser.user.id,
      payload: {
        action: "place_bid",
        acceptedBid: offeredAmount,
        minimumBid,
        lotId: payload.lot.id,
        inventory: nextInventory,
        roomState: nextRoomState,
      },
    });

    return jsonWithPreferenceCookie(responsePayload, {
      resolvedUser,
    });
  }

  const quantity = payload.quantity ?? 1;
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

  const checkoutAmount =
    inventoryProduct.mode === "auction"
      ? Math.max(
          inventoryProduct.price,
          payload.amount ??
            roomState.lotStates[payload.lot.id]?.currentBid ??
            inventoryProduct.currentBid ??
            payload.lot.currentBid ??
            inventoryProduct.price,
        )
      : Math.max(0, inventoryProduct.price);

  if (checkoutAmount <= 0) {
    return jsonWithPreferenceCookie(
      { message: "Montant de checkout invalide." },
      {
        status: 400,
        resolvedUser,
      },
    );
  }

  const remainingStock = inventoryProduct.quantity - quantity;
  const nextInventory = upsertPersistedLiveRoomInventory({
    ownerUserId,
    liveSlug: event.slug,
    inventory: inventory.map((product) => {
      if (product.id !== payload.lot.id) {
        return product;
      }

      return {
        ...product,
        quantity: remainingStock,
        status: remainingStock <= 0 ? "inactive" : product.status,
        currentBid:
          inventoryProduct.mode === "auction"
            ? Math.max(product.currentBid ?? product.price, checkoutAmount)
            : product.currentBid,
      };
    }),
  });

  let nextRoomState = roomState;
  if (inventoryProduct.mode === "auction") {
    nextRoomState = await writeLiveShoppingRoomStateServer(
      payload.eventId,
      applyBidToRoomState({
        state: roomState,
        lotId: payload.lot.id,
        amount: checkoutAmount,
        bidder: authenticatedUser.profile.username,
      }),
    );
  }

  const fees = Math.max(4, Math.round(checkoutAmount * 0.08));
  const totalAmount = checkoutAmount * quantity + fees;
  const orderResult = createLiveShoppingOrderRecord({
    buyerUserId: authenticatedUser.user.id,
    event,
    lot: {
      ...inventoryProduct,
      quantity: remainingStock,
      currentBid:
        inventoryProduct.mode === "auction"
          ? Math.max(inventoryProduct.currentBid ?? inventoryProduct.price, checkoutAmount)
          : inventoryProduct.currentBid,
    },
    quantity,
    note: payload.note,
    paymentMethod: payload.paymentMethod,
    amount: totalAmount,
  });

  if ("error" in orderResult) {
    return jsonWithPreferenceCookie(
      {
        message: orderResult.error,
      },
      {
        status: 500,
        resolvedUser,
      },
    );
  }

  const nextOrders = listPersistedLiveOrdersForUser(authenticatedUser.user.id, {
    eventId: event.id,
  });

  const responsePayload = {
    ok: true,
    action: payload.action,
    order: orderResult.order,
    orders: nextOrders,
    inventory: nextInventory,
    remainingStock,
    roomState: nextRoomState,
    userId: authenticatedUser.user.id,
    role,
  } satisfies Record<string, unknown>;

  if (idempotencyKey) {
    insertActionIdempotencyRecord({
      userId: authenticatedUser.user.id,
      key: idempotencyKey,
      action: payload.action,
      requestFingerprint: payloadFingerprint,
      responseBody: JSON.stringify(responsePayload),
      statusCode: 200,
    });
  }

  insertAuditLog({
    userId: authenticatedUser.user.id,
    role,
    actionType: "checkout",
    resourceType: "live_lot",
    resourceId: payload.lot.id,
    metadata: JSON.stringify({
      eventId: payload.eventId,
      orderId: orderResult.order.id,
      quantity,
      amount: checkoutAmount,
      totalAmount,
      paymentMethod: payload.paymentMethod ?? "card",
    }),
  });

  publishLiveShoppingEvent({
    type: "live.sync",
    userId: authenticatedUser.user.id,
    eventId: payload.eventId,
    actorUserId: authenticatedUser.user.id,
    payload: {
      action: "checkout",
      order: orderResult.order,
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
    actorUserId: authenticatedUser.user.id,
    payload: {
      action: "checkout",
      lotId: payload.lot.id,
      inventory: nextInventory,
      roomState: nextRoomState,
    },
  });

  return jsonWithPreferenceCookie(responsePayload, {
    resolvedUser,
  });
}
