import {
  liveShoppingEvents,
  type LiveShoppingEvent,
  type LiveShoppingLot,
  type LiveShoppingOrder,
} from "@/lib/live-shopping-data";
import {
  normalizeLiveInventoryProduct,
  type LiveInventoryProduct,
} from "@/lib/live-shopping-inventory";
import {
  normalizeLiveShoppingScheduledLive,
  type LiveShoppingScheduledLive,
} from "@/lib/live-shopping-schedule";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";
import {
  createGigRow,
  createOrderRow,
  getGigRowBySlug,
  getLiveInventoryStorageId,
  getLiveInventoryRowById,
  getLiveSessionRowByEventId,
  getLiveSessionRowBySlug,
  getProfileByUserId,
  listLiveInventoryRows,
  listLiveScheduleRows,
  listOrderRowsForLiveSessionEvent,
  listOrderRowsForUser,
  replaceLiveInventoryRowsForOwner,
  replaceLiveScheduleRowsForOwner,
  type StoredLiveInventoryRow,
  type StoredLiveScheduleRow,
  type StoredOrderRow,
} from "@/lib/server/sqlite-store";

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function findStaticLiveEventById(eventId: number) {
  return liveShoppingEvents.find((entry) => entry.id === eventId) ?? null;
}

function findStaticLiveEventBySlug(slug: string) {
  return liveShoppingEvents.find((entry) => entry.slug === slug) ?? null;
}

function getLiveInventorySlugAliases(liveSlug: string) {
  const aliases = new Set<string>([liveSlug]);

  if (liveSlug.startsWith("scheduled-live-")) {
    const scheduledId = liveSlug.slice("scheduled-live-".length);
    if (scheduledId) {
      aliases.add(`schedule:${scheduledId}`);
    }
  }

  if (liveSlug.startsWith("schedule:")) {
    const scheduledId = liveSlug.slice("schedule:".length);
    if (scheduledId) {
      aliases.add(`scheduled-live-${scheduledId}`);
    }
  }

  return [...aliases];
}

function normalizePersistedEventPayload(
  value: string | null | undefined,
  fallback: LiveShoppingEvent | null,
): LiveShoppingEvent | null {
  const parsed = parseJson<LiveShoppingEvent>(value);
  if (parsed && typeof parsed.id === "number" && typeof parsed.slug === "string") {
    return parsed;
  }

  return fallback;
}

function fallbackInventoryProductFromLot({
  event,
  lot,
}: {
  event: LiveShoppingEvent;
  lot: LiveShoppingLot;
}): LiveInventoryProduct {
  return normalizeLiveInventoryProduct({
    id: lot.id,
    title: lot.title,
    categoryId: event.categoryId,
    categoryLabel: event.category,
    description: lot.subtitle,
    quantity: Math.max(0, lot.stock),
    price: Math.max(0, lot.price),
    status: lot.stock > 0 ? "active" : "inactive",
    mode: lot.mode === "auction" ? "auction" : "fixed",
    currentBid: lot.mode === "auction" ? lot.currentBid ?? lot.price : null,
    bidIncrement: lot.mode === "auction" ? lot.bidIncrement ?? Math.max(1, Math.round(lot.price * 0.05)) : null,
    reserveForLive: true,
    liveSlug: event.slug,
    flashSale: false,
    acceptOffers: true,
    cover: lot.cover,
    deliveryProfile: lot.delivery,
    dangerousGoods: "Pas de matieres dangereuses",
    costPerItem: "",
    sku: `LIVE-${lot.id}`,
    createdAt: Date.now(),
  });
}

function normalizePersistedInventoryRow({
  row,
  fallbackEvent,
}: {
  row: StoredLiveInventoryRow;
  fallbackEvent?: LiveShoppingEvent | null;
}) {
  const parsed = parseJson<Partial<LiveInventoryProduct>>(row.payload_json);
  if (parsed && typeof parsed.id === "string") {
    const status =
      parsed.status === "active" || parsed.status === "draft" || parsed.status === "inactive"
        ? parsed.status
        : row.status === "active" || row.status === "draft" || row.status === "inactive"
          ? row.status
          : "active";

    return normalizeLiveInventoryProduct({
      ...parsed,
      id: parsed.id,
      title: typeof parsed.title === "string" ? parsed.title : row.title,
      categoryId: typeof parsed.categoryId === "string" ? parsed.categoryId : row.category_id,
      categoryLabel:
        typeof parsed.categoryLabel === "string"
          ? parsed.categoryLabel
          : fallbackEvent?.category ?? "Divers",
      description: typeof parsed.description === "string" ? parsed.description : "",
      quantity: typeof parsed.quantity === "number" ? parsed.quantity : 0,
      price: typeof parsed.price === "number" ? parsed.price : 0,
      status,
      mode: parsed.mode === "auction" ? "auction" : "fixed",
      currentBid: typeof parsed.currentBid === "number" ? parsed.currentBid : null,
      bidIncrement: typeof parsed.bidIncrement === "number" ? parsed.bidIncrement : null,
      reserveForLive: parsed.reserveForLive === true || row.reserve_for_live === 1,
      liveSlug:
        typeof parsed.liveSlug === "string"
          ? parsed.liveSlug
          : row.live_slug,
      flashSale: parsed.flashSale === true,
      acceptOffers: parsed.acceptOffers !== false,
      cover: typeof parsed.cover === "string" ? parsed.cover : fallbackEvent?.cover ?? "/figma-assets/photo-feed/photo-grid-6.jpg",
      deliveryProfile:
        typeof parsed.deliveryProfile === "string"
          ? parsed.deliveryProfile
          : "Expedition 48h",
      dangerousGoods:
        typeof parsed.dangerousGoods === "string"
          ? parsed.dangerousGoods
          : "Pas de matieres dangereuses",
      costPerItem: typeof parsed.costPerItem === "string" ? parsed.costPerItem : "",
      sku: typeof parsed.sku === "string" ? parsed.sku : `LIVE-${row.id}`,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : row.created_at,
    });
  }

  if (fallbackEvent) {
    const fallbackLot = fallbackEvent.items.find((item) => item.id === row.id || row.id.endsWith(`::${item.id}`));
    if (fallbackLot) {
      return fallbackInventoryProductFromLot({
        event: fallbackEvent,
        lot: fallbackLot,
      });
    }
  }

  return normalizeLiveInventoryProduct({
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    categoryLabel: fallbackEvent?.category ?? "Divers",
    description: "",
    quantity: 0,
    price: 0,
    status: row.status === "active" || row.status === "draft" || row.status === "inactive" ? row.status : "draft",
    mode: "fixed",
    currentBid: null,
    bidIncrement: null,
    reserveForLive: row.reserve_for_live === 1,
    liveSlug: row.live_slug,
    flashSale: false,
    acceptOffers: true,
    cover: fallbackEvent?.cover ?? "/figma-assets/photo-feed/photo-grid-6.jpg",
    deliveryProfile: "Expedition 48h",
    dangerousGoods: "Pas de matieres dangereuses",
    costPerItem: "",
    sku: `LIVE-${row.id}`,
    createdAt: row.created_at,
  });
}

function normalizePersistedScheduleRow(row: StoredLiveScheduleRow) {
  const parsed = parseJson<Partial<LiveShoppingScheduledLive>>(row.payload_json);
  return normalizeLiveShoppingScheduledLive({
    ...parsed,
    id: typeof parsed?.id === "string" ? parsed.id : row.id,
    liveState:
      parsed?.liveState === "live" || parsed?.liveState === "paused" || parsed?.liveState === "ended"
        ? parsed.liveState
        : "scheduled",
    liveSessionSlug:
      typeof parsed?.liveSessionSlug === "string"
        ? parsed.liveSessionSlug
        : row.live_slug,
    createdAt: typeof parsed?.createdAt === "number" ? parsed.createdAt : row.created_at,
    updatedAt: typeof parsed?.updatedAt === "number" ? parsed.updatedAt : row.updated_at,
  });
}

function resolveDisplayName(userId: string, fallback: string) {
  const profile = getProfileByUserId(userId);
  return profile?.display_name ?? fallback;
}

function toLiveShoppingOrder({
  row,
  fallbackEvent,
}: {
  row: StoredOrderRow;
  fallbackEvent?: LiveShoppingEvent | null;
}): LiveShoppingOrder {
  const noteList = parseJson<string[]>(row.notes_json) ?? [];
  return {
    id: row.id,
    eventId: row.live_session_event_id ?? fallbackEvent?.id ?? 0,
    title: row.title,
    buyer: resolveDisplayName(row.buyer_user_id, "Vous"),
    seller: resolveDisplayName(row.seller_user_id, fallbackEvent?.seller ?? "Vendeur"),
    amount: row.budget,
    quantity: row.quantity,
    stageIndex: row.stage_index,
    etaLabel: row.due_date,
    lastUpdate: row.last_update,
    note: noteList[0] ?? row.brief ?? "",
  };
}

export function getLiveShoppingOwnerUserId(event: Pick<LiveShoppingEvent, "handle" | "seller">) {
  const candidate = typeof event.handle === "string" ? event.handle.replace(/^@/, "").trim() : "";
  return normalizePreferenceUserId(candidate || event.seller);
}

export function getPersistedLiveSessionEventById(eventId: number) {
  const row = getLiveSessionRowByEventId(eventId);
  const fallback = findStaticLiveEventById(eventId);
  return normalizePersistedEventPayload(row?.payload_json, fallback);
}

export function getPersistedLiveSessionEventBySlug(slug: string) {
  const row = getLiveSessionRowBySlug(slug);
  const fallback = findStaticLiveEventBySlug(slug);
  return normalizePersistedEventPayload(row?.payload_json, fallback);
}

export function listPersistedLiveInventoryForOwner(ownerUserId: string) {
  return listLiveInventoryRows({
    ownerUserId: normalizePreferenceUserId(ownerUserId),
  }).map((row) => normalizePersistedInventoryRow({ row }));
}

export function replacePersistedLiveInventoryForOwner({
  ownerUserId,
  inventory,
}: {
  ownerUserId: string;
  inventory: LiveInventoryProduct[];
}) {
  const normalizedOwnerUserId = normalizePreferenceUserId(ownerUserId);
  const normalizedInventory = inventory.map((item) => normalizeLiveInventoryProduct(item));

  const replacedRows = replaceLiveInventoryRowsForOwner({
    ownerUserId: normalizedOwnerUserId,
    inventory: normalizedInventory.map((item) => ({
      id: getLiveInventoryStorageId({
        ownerUserId: normalizedOwnerUserId,
        liveSlug: item.liveSlug,
        productId: item.id,
      }),
      title: item.title,
      categoryId: item.categoryId,
      status: item.status,
      reserveForLive: item.reserveForLive,
      liveSlug: item.liveSlug,
      payloadJson: JSON.stringify(item),
      createdAt: item.createdAt,
    })),
  });

  return replacedRows.map((row) => normalizePersistedInventoryRow({ row }));
}

export function upsertPersistedLiveRoomInventory({
  ownerUserId,
  liveSlug,
  inventory,
}: {
  ownerUserId: string;
  liveSlug: string;
  inventory: LiveInventoryProduct[];
}) {
  const normalizedOwnerUserId = normalizePreferenceUserId(ownerUserId);
  const liveSlugAliases = new Set(getLiveInventorySlugAliases(liveSlug));
  const preserved = listPersistedLiveInventoryForOwner(normalizedOwnerUserId).filter(
    (item) => !liveSlugAliases.has(item.liveSlug ?? ""),
  );
  const nextRoomInventory = new Map<string, LiveInventoryProduct>();

  for (const item of inventory) {
    const normalizedItem = normalizeLiveInventoryProduct({
      ...item,
      liveSlug,
    });
    nextRoomInventory.set(normalizedItem.id, normalizedItem);
  }

  return replacePersistedLiveInventoryForOwner({
    ownerUserId: normalizedOwnerUserId,
    inventory: [...preserved, ...nextRoomInventory.values()],
  });
}

export function listPersistedLiveInventoryForRoom({
  liveSlug,
  event,
}: {
  liveSlug: string;
  event?: LiveShoppingEvent | null;
}) {
  const persistedRows = getLiveInventorySlugAliases(liveSlug).flatMap((alias) =>
    listLiveInventoryRows({ liveSlug: alias }),
  );
  if (persistedRows.length > 0) {
    const uniqueRows = new Map<string, LiveInventoryProduct>();
    for (const row of persistedRows) {
      const normalizedProduct = normalizePersistedInventoryRow({
        row,
        fallbackEvent: event ?? null,
      });
      uniqueRows.set(normalizedProduct.id, normalizedProduct);
    }

    return [...uniqueRows.values()];
  }

  if (!event) {
    return [];
  }

  return event.items.map((lot) =>
    fallbackInventoryProductFromLot({
      event,
      lot,
    }),
  );
}

export function listPersistedLiveScheduleForOwner(ownerUserId: string) {
  return listLiveScheduleRows({
    ownerUserId: normalizePreferenceUserId(ownerUserId),
  }).map((row) => normalizePersistedScheduleRow(row));
}

export function replacePersistedLiveScheduleForOwner({
  ownerUserId,
  schedule,
}: {
  ownerUserId: string;
  schedule: LiveShoppingScheduledLive[];
}) {
  const normalizedOwnerUserId = normalizePreferenceUserId(ownerUserId);
  const rows = replaceLiveScheduleRowsForOwner({
    ownerUserId: normalizedOwnerUserId,
    schedule: schedule.map((item) => {
      const normalizedItem = normalizeLiveShoppingScheduledLive(item);
      return {
        id: normalizedItem.id,
        liveState: normalizedItem.liveState,
        liveSlug: normalizedItem.liveSessionSlug,
        payloadJson: JSON.stringify(normalizedItem),
        createdAt: normalizedItem.createdAt,
      };
    }),
  });

  return rows.map((row) => normalizePersistedScheduleRow(row));
}

export function listPersistedLiveOrdersForUser(
  userId: string,
  options?: {
    eventId?: number;
  },
) {
  return listOrderRowsForUser(normalizePreferenceUserId(userId), {
    source: "live-shopping",
  })
    .filter((row) => (options?.eventId ? row.live_session_event_id === options.eventId : true))
    .map((row) =>
      toLiveShoppingOrder({
        row,
        fallbackEvent: row.live_session_event_id ? getPersistedLiveSessionEventById(row.live_session_event_id) : null,
      }),
    );
}

export function listPersistedLiveOrdersForEvent(eventId: number) {
  return listOrderRowsForLiveSessionEvent(eventId).map((row) =>
    toLiveShoppingOrder({
      row,
      fallbackEvent: getPersistedLiveSessionEventById(eventId),
    }),
  );
}

export function createLiveShoppingOrderRecord({
  buyerUserId,
  event,
  lot,
  quantity,
  note,
  paymentMethod,
  amount,
}: {
  buyerUserId: string;
  event: LiveShoppingEvent;
  lot: LiveInventoryProduct;
  quantity: number;
  note?: string;
  paymentMethod?: string;
  amount: number;
}) {
  const sellerUserId = getLiveShoppingOwnerUserId(event);
  const liveGigSlug = `live-${event.slug}-${normalizePreferenceUserId(lot.id)}`;
  let gig = getGigRowBySlug(liveGigSlug);

  if (!gig) {
    gig = createGigRow({
      sellerUserId,
      slugOverride: liveGigSlug,
      title: lot.title,
      subtitle: lot.description || event.subtitle,
      category: event.category,
      cover: lot.cover,
      priceFrom: Math.max(1, lot.price),
      deliveryLabel: lot.deliveryProfile || "48h",
      responseLabel: "Live instantane",
      timelikeTrust: 96,
      completedOrders: 0,
      queueSize: 0,
      status: "active",
      packagesJson: JSON.stringify([
        {
          id: "live",
          name: "Lot live",
          price: Math.max(1, lot.price),
          deliveryDays: 3,
          revisions: "0 revision",
          description: lot.description || event.subtitle,
          features: [event.title, "Commande issue du live", lot.deliveryProfile || "Expedition 48h"],
          recommended: true,
        },
      ]),
      deliverablesJson: JSON.stringify(["Lot reserve pendant le live"]),
      tagsJson: JSON.stringify(event.tags.slice(0, 6)),
    });
  }

  if (!gig) {
    return { error: "Impossible de preparer le lot live." as const };
  }

  const createdRow = createOrderRow({
    gigId: gig.id,
    buyerUserId: normalizePreferenceUserId(buyerUserId),
    sellerUserId,
    source: "live-shopping",
    packageId: "live",
    title: lot.title,
    budget: Math.max(0, amount),
    quantity,
    dueDate: lot.deliveryProfile || "48h",
    stageIndex: 0,
    lastUpdate: "Commande live confirmee",
    paymentReleased: false,
    timelikeTrust: 96,
    brief: note?.trim() || `Paiement ${paymentMethod ?? "carte"} valide.`,
    notesJson: JSON.stringify([
      note?.trim() || `Paiement ${paymentMethod ?? "carte"} valide.`,
      "Commande creee pendant le direct.",
    ]),
    liveSessionEventId: event.id,
    liveItemId: lot.id,
  });

  if (!createdRow) {
    return { error: "Impossible de creer la commande live." as const };
  }

  return {
    order: toLiveShoppingOrder({
      row: createdRow,
      fallbackEvent: event,
    }),
  };
}

export function findPersistedInventoryProductForRoom({
  ownerUserId,
  liveSlug,
  productId,
}: {
  ownerUserId: string;
  liveSlug: string | null;
  productId: string;
}) {
  const storageId = getLiveInventoryStorageId({
    ownerUserId: normalizePreferenceUserId(ownerUserId),
    liveSlug,
    productId,
  });
  const row = getLiveInventoryRowById(storageId);
  return row ? normalizePersistedInventoryRow({ row }) : null;
}
