export type LiveInventoryStatus = "active" | "draft" | "inactive";
export type LiveInventoryMode = "fixed" | "auction";

export type LiveInventoryProduct = {
  id: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
  description: string;
  quantity: number;
  price: number;
  status: LiveInventoryStatus;
  mode: LiveInventoryMode;
  currentBid: number | null;
  bidIncrement: number | null;
  reserveForLive: boolean;
  liveSlug: string | null;
  flashSale: boolean;
  acceptOffers: boolean;
  cover: string;
  deliveryProfile: string;
  dangerousGoods: string;
  costPerItem: string;
  sku: string;
  createdAt: number;
};

export const LIVE_SHOPPING_INVENTORY_STORAGE_KEY = "pictomag-live-shopping-inventory";

export const liveShoppingInventorySeed: LiveInventoryProduct[] = [
  {
    id: "tcg-sealed-box",
    title: "Display One Piece OP premium",
    categoryId: "trading-card-games",
    categoryLabel: "Trading Card Games",
    description: "Display scelle reserve aux sessions live premium.",
    quantity: 6,
    price: 240,
    status: "active",
    mode: "fixed",
    currentBid: null,
    bidIncrement: null,
    reserveForLive: true,
    liveSlug: "jp-p2pdd-one-piece-live-14",
    flashSale: false,
    acceptOffers: true,
    cover: "/figma-assets/photo-feed/photo-grid-6.jpg",
    deliveryProfile: "Expedition 48h",
    dangerousGoods: "Pas de matieres dangereuses",
    costPerItem: "162",
    sku: "OP-DISPLAY-240",
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
  },
  {
    id: "beauty-gloss-drop",
    title: "Gloss trio edition live",
    categoryId: "beauty",
    categoryLabel: "Beaute",
    description: "Trio de gloss a sortir pendant les ventes live.",
    quantity: 18,
    price: 38,
    status: "draft",
    mode: "fixed",
    currentBid: null,
    bidIncrement: null,
    reserveForLive: true,
    liveSlug: null,
    flashSale: true,
    acceptOffers: false,
    cover: "/figma-assets/photo-feed/photo-grid-3.jpg",
    deliveryProfile: "Expedition 72h",
    dangerousGoods: "Pas de matieres dangereuses",
    costPerItem: "11",
    sku: "GLOSS-LIVE-TRIO",
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
  },
];

export function normalizeLiveInventoryProduct(product: LiveInventoryProduct | (Omit<LiveInventoryProduct, "currentBid" | "bidIncrement"> & { currentBid?: number | null; bidIncrement?: number | null })) {
  return {
    ...product,
    currentBid:
      typeof product.currentBid === "number"
        ? product.currentBid
        : product.mode === "auction"
          ? product.price
          : null,
    bidIncrement:
      typeof product.bidIncrement === "number"
        ? product.bidIncrement
        : product.mode === "auction"
          ? Math.max(1, Math.round(product.price * 0.05))
          : null,
  } satisfies LiveInventoryProduct;
}

export function readLiveShoppingInventory() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LIVE_SHOPPING_INVENTORY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Array<LiveInventoryProduct>;
    return Array.isArray(parsed) ? parsed.map((product) => normalizeLiveInventoryProduct(product)) : null;
  } catch {
    return null;
  }
}

export function writeLiveShoppingInventory(products: LiveInventoryProduct[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIVE_SHOPPING_INVENTORY_STORAGE_KEY, JSON.stringify(products));
}

export function createLiveShoppingInventoryProduct(
  input: Omit<LiveInventoryProduct, "id" | "createdAt">,
) {
  return normalizeLiveInventoryProduct({
    ...input,
    id: `inventory-${Date.now()}`,
    createdAt: Date.now(),
  });
}
