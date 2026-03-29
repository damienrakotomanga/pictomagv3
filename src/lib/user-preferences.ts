export type MarketplaceFilterId = "subcategory" | "budget" | "delivery" | "location" | "level" | "speaks";
export type MarketplaceDiscoverSort = "recommended" | "price-asc" | "price-desc" | "trust-desc" | "delivery-fast";
export type SellerAnalyticsRange = "7d" | "30d" | "90d";

export type MarketplaceFilterDefinition = {
  id: MarketplaceFilterId;
  label: string;
  options: string[];
};

export type MarketplacePreferences = {
  discoverFilters: Record<MarketplaceFilterId, string>;
  discoverSort: MarketplaceDiscoverSort;
  sellerAnalyticsRange: SellerAnalyticsRange;
};

export const marketplaceFilterDefinitions: MarketplaceFilterDefinition[] = [
  {
    id: "subcategory",
    label: "Subcategory",
    options: ["All", "Design", "Branding", "Motion", "Video", "Audio", "Strategy", "No-code"],
  },
  {
    id: "budget",
    label: "Budget",
    options: ["All", "Jusqu a 200 EUR", "200 EUR - 400 EUR", "400 EUR - 700 EUR", "700 EUR et +"],
  },
  {
    id: "delivery",
    label: "Delivery time",
    options: ["All", "24 h", "3 jours", "5 jours", "6 jours et +"],
  },
  {
    id: "location",
    label: "Location",
    options: ["All", "France", "Belgique", "Suisse", "Canada", "Remote"],
  },
  {
    id: "level",
    label: "Level",
    options: ["All", "Top retenu", "Seller pro", "Motion expert", "Audio lab", "Business clarity"],
  },
  {
    id: "speaks",
    label: "Speaks",
    options: ["All", "FR", "EN", "ES"],
  },
];

export const discoverSortOptions: { id: MarketplaceDiscoverSort; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix decroissant" },
  { id: "trust-desc", label: "TimeLike Trust" },
  { id: "delivery-fast", label: "Livraison la plus rapide" },
];

export const sellerAnalyticsRangeOptions: { id: SellerAnalyticsRange; label: string; multiplier: number }[] = [
  { id: "7d", label: "Last 7 days", multiplier: 0.34 },
  { id: "30d", label: "Last 30 days", multiplier: 1 },
  { id: "90d", label: "Last 90 days", multiplier: 2.45 },
];

export const marketplacePreferencesDefaults: MarketplacePreferences = {
  discoverFilters: {
    subcategory: "All",
    budget: "All",
    delivery: "All",
    location: "All",
    level: "All",
    speaks: "All",
  },
  discoverSort: "recommended",
  sellerAnalyticsRange: "30d",
};

const marketplaceDiscoverSortValues = new Set<MarketplaceDiscoverSort>(discoverSortOptions.map((option) => option.id));
const sellerAnalyticsRangeValues = new Set<SellerAnalyticsRange>(sellerAnalyticsRangeOptions.map((option) => option.id));

export type LiveShoppingPaymentMethod = "card" | "wallet" | "bank";
export type LiveShoppingRoomFilter = "all" | "auction" | "fixed";
export type LiveShoppingRoomSortMode = "featured" | "price-asc" | "price-desc" | "stock-desc";

export type LiveShoppingPreferences = {
  paymentMethod: LiveShoppingPaymentMethod;
  roomFilter: LiveShoppingRoomFilter;
  roomSortMode: LiveShoppingRoomSortMode;
};

export const liveShoppingPreferencesDefaults: LiveShoppingPreferences = {
  paymentMethod: "card",
  roomFilter: "all",
  roomSortMode: "featured",
};

const paymentMethodValues = new Set<LiveShoppingPaymentMethod>(["card", "wallet", "bank"]);
const roomFilterValues = new Set<LiveShoppingRoomFilter>(["all", "auction", "fixed"]);
const roomSortModeValues = new Set<LiveShoppingRoomSortMode>(["featured", "price-asc", "price-desc", "stock-desc"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeMarketplacePreferences(input: unknown): MarketplacePreferences {
  if (!isRecord(input)) {
    return marketplacePreferencesDefaults;
  }

  const rawFilters = isRecord(input.discoverFilters) ? input.discoverFilters : {};
  const discoverFilters = marketplaceFilterDefinitions.reduce<Record<MarketplaceFilterId, string>>((next, definition) => {
    const rawValue = rawFilters[definition.id];
    next[definition.id] =
      typeof rawValue === "string" && definition.options.includes(rawValue)
        ? rawValue
        : marketplacePreferencesDefaults.discoverFilters[definition.id];
    return next;
  }, { ...marketplacePreferencesDefaults.discoverFilters });

  const discoverSort =
    typeof input.discoverSort === "string" && marketplaceDiscoverSortValues.has(input.discoverSort as MarketplaceDiscoverSort)
      ? (input.discoverSort as MarketplaceDiscoverSort)
      : marketplacePreferencesDefaults.discoverSort;

  const sellerAnalyticsRange =
    typeof input.sellerAnalyticsRange === "string" &&
    sellerAnalyticsRangeValues.has(input.sellerAnalyticsRange as SellerAnalyticsRange)
      ? (input.sellerAnalyticsRange as SellerAnalyticsRange)
      : marketplacePreferencesDefaults.sellerAnalyticsRange;

  return {
    discoverFilters,
    discoverSort,
    sellerAnalyticsRange,
  };
}

export function normalizeLiveShoppingPreferences(input: unknown): LiveShoppingPreferences {
  if (!isRecord(input)) {
    return liveShoppingPreferencesDefaults;
  }

  const paymentMethod =
    typeof input.paymentMethod === "string" && paymentMethodValues.has(input.paymentMethod as LiveShoppingPaymentMethod)
      ? (input.paymentMethod as LiveShoppingPaymentMethod)
      : liveShoppingPreferencesDefaults.paymentMethod;

  const roomFilter =
    typeof input.roomFilter === "string" && roomFilterValues.has(input.roomFilter as LiveShoppingRoomFilter)
      ? (input.roomFilter as LiveShoppingRoomFilter)
      : liveShoppingPreferencesDefaults.roomFilter;

  const roomSortMode =
    typeof input.roomSortMode === "string" && roomSortModeValues.has(input.roomSortMode as LiveShoppingRoomSortMode)
      ? (input.roomSortMode as LiveShoppingRoomSortMode)
      : liveShoppingPreferencesDefaults.roomSortMode;

  return {
    paymentMethod,
    roomFilter,
    roomSortMode,
  };
}
