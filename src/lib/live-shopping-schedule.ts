export type LiveShoppingScheduleVisibility = "public" | "followers" | "private";
export type LiveShoppingScheduledLiveState = "scheduled" | "live" | "paused" | "ended";

export type LiveShoppingScheduledLive = {
  id: string;
  title: string;
  liveDate: string;
  liveTime: string;
  repeatValue: string;
  categoryId: string;
  categoryLabel: string;
  saleFormat: string;
  tags: string[];
  moderators: string[];
  coverName: string | null;
  previewName: string | null;
  freePickup: boolean;
  shippingDefault: string;
  shippingFees: string;
  disablePreBids: boolean;
  waitlistEnabled: boolean;
  replayEnabled: boolean;
  language: string;
  explicitLanguage: boolean;
  mutedWords: string;
  discoveryMode: LiveShoppingScheduleVisibility;
  liveState: LiveShoppingScheduledLiveState;
  liveSessionSlug: string | null;
  liveSessionStartedAt: number | null;
  liveSessionUpdatedAt: number;
  createdAt: number;
  updatedAt: number;
};

export const liveShoppingScheduleSeed: LiveShoppingScheduledLive[] = [];

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function normalizeLiveShoppingScheduledLive(
  value: LiveShoppingScheduledLive | Partial<LiveShoppingScheduledLive>,
): LiveShoppingScheduledLive {
  const now = Date.now();
  const discoveryMode =
    value.discoveryMode === "followers" || value.discoveryMode === "private" ? value.discoveryMode : "public";
  const liveStateCandidate = value.liveState;
  const liveState: LiveShoppingScheduledLiveState =
    liveStateCandidate === "live" ||
    liveStateCandidate === "paused" ||
    liveStateCandidate === "ended"
      ? liveStateCandidate
      : "scheduled";
  const liveSessionSlug =
    typeof value.liveSessionSlug === "string" && value.liveSessionSlug.trim().length > 0
      ? value.liveSessionSlug
      : null;
  const liveSessionStartedAt =
    typeof value.liveSessionStartedAt === "number" && Number.isFinite(value.liveSessionStartedAt)
      ? value.liveSessionStartedAt
      : null;

  return {
    id:
      typeof value.id === "string" && value.id.trim().length > 0
        ? value.id
        : `schedule-${now}-${Math.trunc(Math.random() * 100_000)}`,
    title: typeof value.title === "string" ? value.title.trim() : "",
    liveDate: typeof value.liveDate === "string" ? value.liveDate : "",
    liveTime: typeof value.liveTime === "string" ? value.liveTime : "",
    repeatValue: typeof value.repeatValue === "string" ? value.repeatValue : "Ne se repete pas",
    categoryId: typeof value.categoryId === "string" ? value.categoryId : "trading-card-games",
    categoryLabel: typeof value.categoryLabel === "string" ? value.categoryLabel : "Trading Card Games",
    saleFormat: typeof value.saleFormat === "string" ? value.saleFormat : "Enchere live",
    tags: normalizeStringArray(value.tags).slice(0, 3),
    moderators: normalizeStringArray(value.moderators).slice(0, 12),
    coverName: typeof value.coverName === "string" && value.coverName.trim().length > 0 ? value.coverName : null,
    previewName:
      typeof value.previewName === "string" && value.previewName.trim().length > 0 ? value.previewName : null,
    freePickup: value.freePickup === undefined ? true : Boolean(value.freePickup),
    shippingDefault: typeof value.shippingDefault === "string" ? value.shippingDefault : "Expedition 48h",
    shippingFees: typeof value.shippingFees === "string" ? value.shippingFees : "6,90 EUR",
    disablePreBids: Boolean(value.disablePreBids),
    waitlistEnabled: value.waitlistEnabled === undefined ? true : Boolean(value.waitlistEnabled),
    replayEnabled: value.replayEnabled === undefined ? true : Boolean(value.replayEnabled),
    language: typeof value.language === "string" ? value.language : "Francais",
    explicitLanguage: Boolean(value.explicitLanguage),
    mutedWords: typeof value.mutedWords === "string" ? value.mutedWords : "",
    discoveryMode,
    liveState,
    liveSessionSlug,
    liveSessionStartedAt,
    liveSessionUpdatedAt:
      typeof value.liveSessionUpdatedAt === "number" && Number.isFinite(value.liveSessionUpdatedAt)
        ? value.liveSessionUpdatedAt
        : now,
    createdAt: typeof value.createdAt === "number" && Number.isFinite(value.createdAt) ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : now,
  };
}
