import { liveShoppingOrdersSeed, type LiveShoppingOrder } from "@/lib/live-shopping-data";
import {
  liveShoppingInventorySeed,
  normalizeLiveInventoryProduct,
  type LiveInventoryProduct,
} from "@/lib/live-shopping-inventory";
import {
  liveShoppingScheduleSeed,
  normalizeLiveShoppingScheduledLive,
  type LiveShoppingScheduledLive,
} from "@/lib/live-shopping-schedule";
import { seedOrders, type ProjectOrder } from "@/lib/marketplace-data";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";
import { getUserRuntimeStateRow, upsertUserRuntimeStateRow } from "@/lib/server/sqlite-store";

function cloneWithJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeMarketplaceOrder(value: unknown): ProjectOrder | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asNumber(value.id);
  const gigId = asNumber(value.gigId);

  if (id === null || gigId === null) {
    return null;
  }

  const stageIndex = Math.max(0, Math.trunc(asNumber(value.stageIndex) ?? 0));
  const notes = normalizeStringArray(value.notes);

  return {
    id,
    gigId,
    title: asString(value.title) ?? "Commande",
    client: asString(value.client) ?? "Vous",
    seller: asString(value.seller) ?? "Vendeur",
    budget: Math.max(0, asNumber(value.budget) ?? 0),
    dueDate: asString(value.dueDate) ?? "A definir",
    stageIndex,
    lastUpdate: asString(value.lastUpdate) ?? "Commande en cours",
    paymentReleased: asBoolean(value.paymentReleased) ?? false,
    timelikeTrust: clamp(asNumber(value.timelikeTrust) ?? 0, 0, 100),
    brief: asString(value.brief) ?? "",
    notes: notes.length > 0 ? notes : ["Commande creee"],
  };
}

function normalizeMarketplaceOrders(value: unknown, fallback: ProjectOrder[]) {
  if (value === undefined) {
    return cloneWithJson(fallback);
  }

  if (!Array.isArray(value)) {
    return cloneWithJson(fallback);
  }

  return value.map((item) => normalizeMarketplaceOrder(item)).filter((item): item is ProjectOrder => item !== null);
}

function normalizeLiveShoppingOrder(value: unknown): LiveShoppingOrder | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asNumber(value.id);
  const eventId = asNumber(value.eventId);

  if (id === null || eventId === null) {
    return null;
  }

  return {
    id,
    eventId,
    title: asString(value.title) ?? "Lot live",
    buyer: asString(value.buyer) ?? "Vous",
    seller: asString(value.seller) ?? "Vendeur",
    amount: Math.max(0, asNumber(value.amount) ?? 0),
    quantity: Math.max(0, Math.trunc(asNumber(value.quantity) ?? 1)),
    stageIndex: Math.max(0, Math.trunc(asNumber(value.stageIndex) ?? 0)),
    etaLabel: asString(value.etaLabel) ?? "A confirmer",
    lastUpdate: asString(value.lastUpdate) ?? "Commande en cours",
    note: asString(value.note) ?? "",
  };
}

function normalizeLiveShoppingOrders(value: unknown, fallback: LiveShoppingOrder[]) {
  if (value === undefined) {
    return cloneWithJson(fallback);
  }

  if (!Array.isArray(value)) {
    return cloneWithJson(fallback);
  }

  return value
    .map((item) => normalizeLiveShoppingOrder(item))
    .filter((item): item is LiveShoppingOrder => item !== null);
}

function normalizeLiveShoppingInventoryProduct(value: unknown): LiveInventoryProduct | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  if (!id) {
    return null;
  }

  const mode = value.mode === "auction" ? "auction" : "fixed";
  const status = value.status === "active" || value.status === "draft" || value.status === "inactive"
    ? value.status
    : "draft";
  const price = Math.max(0, Math.trunc(asNumber(value.price) ?? 0));
  const quantity = Math.max(0, Math.trunc(asNumber(value.quantity) ?? 0));
  const currentBid = asNumber(value.currentBid);
  const bidIncrement = asNumber(value.bidIncrement);

  return normalizeLiveInventoryProduct({
    id,
    title: asString(value.title) ?? "Produit live",
    categoryId: asString(value.categoryId) ?? "misc",
    categoryLabel: asString(value.categoryLabel) ?? "Divers",
    description: asString(value.description) ?? "",
    quantity,
    price,
    status,
    mode,
    currentBid,
    bidIncrement,
    reserveForLive: asBoolean(value.reserveForLive) ?? false,
    liveSlug: asString(value.liveSlug),
    flashSale: asBoolean(value.flashSale) ?? false,
    acceptOffers: asBoolean(value.acceptOffers) ?? true,
    cover: asString(value.cover) ?? "/figma-assets/photo-feed/photo-grid-6.jpg",
    deliveryProfile: asString(value.deliveryProfile) ?? "Expedition 72h",
    dangerousGoods: asString(value.dangerousGoods) ?? "Pas de matieres dangereuses",
    costPerItem: asString(value.costPerItem) ?? "",
    sku: asString(value.sku) ?? `LIVE-${id}`,
    createdAt: Math.max(0, asNumber(value.createdAt) ?? Date.now()),
  });
}

function normalizeLiveShoppingInventory(value: unknown, fallback: LiveInventoryProduct[]) {
  if (value === undefined) {
    return cloneWithJson(fallback);
  }

  if (!Array.isArray(value)) {
    return cloneWithJson(fallback);
  }

  return value
    .map((item) => normalizeLiveShoppingInventoryProduct(item))
    .filter((item): item is LiveInventoryProduct => item !== null);
}

function normalizeLiveShoppingScheduleItem(value: unknown): LiveShoppingScheduledLive | null {
  if (!isRecord(value)) {
    return null;
  }

  return normalizeLiveShoppingScheduledLive({
    id: asString(value.id) ?? undefined,
    title: asString(value.title) ?? undefined,
    liveDate: asString(value.liveDate) ?? undefined,
    liveTime: asString(value.liveTime) ?? undefined,
    repeatValue: asString(value.repeatValue) ?? undefined,
    categoryId: asString(value.categoryId) ?? undefined,
    categoryLabel: asString(value.categoryLabel) ?? undefined,
    saleFormat: asString(value.saleFormat) ?? undefined,
    tags: Array.isArray(value.tags) ? value.tags : undefined,
    moderators: Array.isArray(value.moderators) ? value.moderators : undefined,
    coverName: asString(value.coverName),
    previewName: asString(value.previewName),
    freePickup: asBoolean(value.freePickup) ?? undefined,
    shippingDefault: asString(value.shippingDefault) ?? undefined,
    shippingFees: asString(value.shippingFees) ?? undefined,
    disablePreBids: asBoolean(value.disablePreBids) ?? undefined,
    waitlistEnabled: asBoolean(value.waitlistEnabled) ?? undefined,
    replayEnabled: asBoolean(value.replayEnabled) ?? undefined,
    language: asString(value.language) ?? undefined,
    explicitLanguage: asBoolean(value.explicitLanguage) ?? undefined,
    mutedWords: asString(value.mutedWords) ?? undefined,
    liveState:
      value.liveState === "scheduled" ||
      value.liveState === "live" ||
      value.liveState === "paused" ||
      value.liveState === "ended"
        ? value.liveState
        : undefined,
    liveSessionSlug: asString(value.liveSessionSlug),
    liveSessionStartedAt: asNumber(value.liveSessionStartedAt) ?? undefined,
    liveSessionUpdatedAt: asNumber(value.liveSessionUpdatedAt) ?? undefined,
    discoveryMode:
      value.discoveryMode === "public" || value.discoveryMode === "followers" || value.discoveryMode === "private"
        ? value.discoveryMode
        : undefined,
    createdAt: asNumber(value.createdAt) ?? undefined,
    updatedAt: asNumber(value.updatedAt) ?? undefined,
  });
}

function normalizeLiveShoppingSchedule(value: unknown, fallback: LiveShoppingScheduledLive[]) {
  if (value === undefined) {
    return cloneWithJson(fallback);
  }

  if (!Array.isArray(value)) {
    return cloneWithJson(fallback);
  }

  return value
    .map((item) => normalizeLiveShoppingScheduleItem(item))
    .filter((item): item is LiveShoppingScheduledLive => item !== null);
}

function parseJson(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function ensureRuntimeStateRow(userId: string) {
  const normalizedUserId = normalizePreferenceUserId(userId);
  const existingRow = getUserRuntimeStateRow(normalizedUserId);

  const marketplaceOrders = normalizeMarketplaceOrders(parseJson(existingRow?.marketplace_orders) ?? undefined, seedOrders);
  const liveShoppingOrders = normalizeLiveShoppingOrders(
    parseJson(existingRow?.live_shopping_orders) ?? undefined,
    liveShoppingOrdersSeed,
  );
  const liveShoppingInventory = normalizeLiveShoppingInventory(
    parseJson(existingRow?.live_shopping_inventory) ?? undefined,
    liveShoppingInventorySeed,
  );
  const liveShoppingSchedule = normalizeLiveShoppingSchedule(
    parseJson(existingRow?.live_shopping_schedule) ?? undefined,
    liveShoppingScheduleSeed,
  );

  upsertUserRuntimeStateRow({
    userId: normalizedUserId,
    marketplaceOrdersJson: JSON.stringify(marketplaceOrders),
    liveShoppingOrdersJson: JSON.stringify(liveShoppingOrders),
    liveShoppingInventoryJson: JSON.stringify(liveShoppingInventory),
    liveShoppingScheduleJson: JSON.stringify(liveShoppingSchedule),
  });

  return {
    userId: normalizedUserId,
    marketplaceOrders,
    liveShoppingOrders,
    liveShoppingInventory,
    liveShoppingSchedule,
  };
}

export async function readMarketplaceOrdersServer(userId: string) {
  return ensureRuntimeStateRow(userId).marketplaceOrders;
}

export async function writeMarketplaceOrdersServer(orders: unknown, userId: string) {
  const current = ensureRuntimeStateRow(userId);
  const normalizedOrders = normalizeMarketplaceOrders(orders, current.marketplaceOrders);

  upsertUserRuntimeStateRow({
    userId: current.userId,
    marketplaceOrdersJson: JSON.stringify(normalizedOrders),
    liveShoppingOrdersJson: JSON.stringify(current.liveShoppingOrders),
    liveShoppingInventoryJson: JSON.stringify(current.liveShoppingInventory),
    liveShoppingScheduleJson: JSON.stringify(current.liveShoppingSchedule),
  });

  return normalizedOrders;
}

export async function readLiveShoppingOrdersServer(userId: string) {
  return ensureRuntimeStateRow(userId).liveShoppingOrders;
}

export async function writeLiveShoppingOrdersServer(orders: unknown, userId: string) {
  const current = ensureRuntimeStateRow(userId);
  const normalizedOrders = normalizeLiveShoppingOrders(orders, current.liveShoppingOrders);

  upsertUserRuntimeStateRow({
    userId: current.userId,
    marketplaceOrdersJson: JSON.stringify(current.marketplaceOrders),
    liveShoppingOrdersJson: JSON.stringify(normalizedOrders),
    liveShoppingInventoryJson: JSON.stringify(current.liveShoppingInventory),
    liveShoppingScheduleJson: JSON.stringify(current.liveShoppingSchedule),
  });

  return normalizedOrders;
}

export async function readLiveShoppingInventoryServer(userId: string) {
  return ensureRuntimeStateRow(userId).liveShoppingInventory;
}

export async function writeLiveShoppingInventoryServer(inventory: unknown, userId: string) {
  const current = ensureRuntimeStateRow(userId);
  const normalizedInventory = normalizeLiveShoppingInventory(inventory, current.liveShoppingInventory);

  upsertUserRuntimeStateRow({
    userId: current.userId,
    marketplaceOrdersJson: JSON.stringify(current.marketplaceOrders),
    liveShoppingOrdersJson: JSON.stringify(current.liveShoppingOrders),
    liveShoppingInventoryJson: JSON.stringify(normalizedInventory),
    liveShoppingScheduleJson: JSON.stringify(current.liveShoppingSchedule),
  });

  return normalizedInventory;
}

export async function readLiveShoppingScheduleServer(userId: string) {
  return ensureRuntimeStateRow(userId).liveShoppingSchedule;
}

export async function writeLiveShoppingScheduleServer(schedule: unknown, userId: string) {
  const current = ensureRuntimeStateRow(userId);
  const normalizedSchedule = normalizeLiveShoppingSchedule(schedule, current.liveShoppingSchedule);

  upsertUserRuntimeStateRow({
    userId: current.userId,
    marketplaceOrdersJson: JSON.stringify(current.marketplaceOrders),
    liveShoppingOrdersJson: JSON.stringify(current.liveShoppingOrders),
    liveShoppingInventoryJson: JSON.stringify(current.liveShoppingInventory),
    liveShoppingScheduleJson: JSON.stringify(normalizedSchedule),
  });

  return normalizedSchedule;
}

export async function seedUserRuntimeStateIfMissing(userId: string) {
  ensureRuntimeStateRow(userId);
}
