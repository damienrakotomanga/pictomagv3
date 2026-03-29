import type { LiveShoppingOrder } from "@/lib/live-shopping-data";
import type { LiveInventoryProduct } from "@/lib/live-shopping-inventory";
import type { LiveShoppingScheduledLive } from "@/lib/live-shopping-schedule";
import type { ProjectOrder } from "@/lib/marketplace-data";

async function safeReadState<T>({
  endpoint,
  key,
  fallback,
}: {
  endpoint: string;
  key: string;
  fallback: T;
}) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return (payload[key] as T) ?? fallback;
  } catch {
    return fallback;
  }
}

async function safeWriteState<T>({
  endpoint,
  key,
  payload,
  fallback,
}: {
  endpoint: string;
  key: string;
  payload: Record<string, unknown>;
  fallback: T;
}) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return fallback;
    }

    const body = (await response.json()) as Record<string, unknown>;
    return (body[key] as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function readMarketplaceOrdersFromApi(fallback: ProjectOrder[]) {
  return safeReadState<ProjectOrder[]>({
    endpoint: "/api/state/marketplace-orders",
    key: "orders",
    fallback,
  });
}

export function writeMarketplaceOrdersToApi(orders: ProjectOrder[]) {
  return safeWriteState<ProjectOrder[]>({
    endpoint: "/api/state/marketplace-orders",
    key: "orders",
    payload: { orders },
    fallback: orders,
  });
}

export function readLiveShoppingOrdersFromApi(fallback: LiveShoppingOrder[]) {
  return safeReadState<LiveShoppingOrder[]>({
    endpoint: "/api/state/live-shopping-orders",
    key: "orders",
    fallback,
  });
}

export function writeLiveShoppingOrdersToApi(orders: LiveShoppingOrder[]) {
  return safeWriteState<LiveShoppingOrder[]>({
    endpoint: "/api/state/live-shopping-orders",
    key: "orders",
    payload: { orders },
    fallback: orders,
  });
}

export function readLiveShoppingInventoryFromApi(fallback: LiveInventoryProduct[]) {
  return safeReadState<LiveInventoryProduct[]>({
    endpoint: "/api/state/live-shopping-inventory",
    key: "inventory",
    fallback,
  });
}

export function writeLiveShoppingInventoryToApi(inventory: LiveInventoryProduct[]) {
  return safeWriteState<LiveInventoryProduct[]>({
    endpoint: "/api/state/live-shopping-inventory",
    key: "inventory",
    payload: { inventory },
    fallback: inventory,
  });
}

export function readLiveShoppingScheduleFromApi(fallback: LiveShoppingScheduledLive[]) {
  return safeReadState<LiveShoppingScheduledLive[]>({
    endpoint: "/api/state/live-shopping-schedule",
    key: "schedule",
    fallback,
  });
}

export function writeLiveShoppingScheduleToApi(schedule: LiveShoppingScheduledLive[]) {
  return safeWriteState<LiveShoppingScheduledLive[]>({
    endpoint: "/api/state/live-shopping-schedule",
    key: "schedule",
    payload: { schedule },
    fallback: schedule,
  });
}
