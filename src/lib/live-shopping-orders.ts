import type { LiveShoppingEvent, LiveShoppingLot, LiveShoppingOrder } from "@/lib/live-shopping-data";

export const LIVE_SHOPPING_ORDERS_STORAGE_KEY = "pictomag-live-shopping-orders";

export function readLiveShoppingOrders() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LIVE_SHOPPING_ORDERS_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as LiveShoppingOrder[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLiveShoppingOrders(orders: LiveShoppingOrder[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LIVE_SHOPPING_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

export function createLiveShoppingOrder({
  event,
  lot,
  quantity,
  total,
  note,
}: {
  event: LiveShoppingEvent;
  lot: LiveShoppingLot;
  quantity: number;
  total: number;
  note: string;
}) {
  const createdAt = Date.now();

  return {
    id: createdAt,
    eventId: event.id,
    title: lot.title,
    buyer: "Vous",
    seller: event.seller,
    amount: total,
    quantity,
    stageIndex: 0,
    etaLabel: lot.delivery,
    lastUpdate: "Commande creee pendant le live, paiement securise.",
    note: note.trim() || "Pas de note ajoutee pour ce lot.",
  } satisfies LiveShoppingOrder;
}
