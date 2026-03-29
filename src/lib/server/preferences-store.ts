import {
  liveShoppingPreferencesDefaults,
  marketplacePreferencesDefaults,
  normalizeLiveShoppingPreferences,
  normalizeMarketplacePreferences,
} from "@/lib/user-preferences";
import { getUserPreferencesRow, upsertUserPreferencesRow } from "@/lib/server/sqlite-store";

const DEFAULT_USER_ID = "anonymous";

export function normalizePreferenceUserId(userId: unknown) {
  if (typeof userId !== "string") {
    return DEFAULT_USER_ID;
  }

  const normalized = userId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized.length > 0 ? normalized : DEFAULT_USER_ID;
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

function ensureUserPreferencesRow(userId: string) {
  const normalizedUserId = normalizePreferenceUserId(userId);
  const existingRow = getUserPreferencesRow(normalizedUserId);

  const marketplace = normalizeMarketplacePreferences(
    parseJson(existingRow?.marketplace) ?? marketplacePreferencesDefaults,
  );
  const liveShopping = normalizeLiveShoppingPreferences(
    parseJson(existingRow?.live_shopping) ?? liveShoppingPreferencesDefaults,
  );

  upsertUserPreferencesRow({
    userId: normalizedUserId,
    marketplaceJson: JSON.stringify(marketplace),
    liveShoppingJson: JSON.stringify(liveShopping),
  });

  return {
    userId: normalizedUserId,
    marketplace,
    liveShopping,
  };
}

export async function readMarketplacePreferencesServer(userId: string) {
  return ensureUserPreferencesRow(userId).marketplace;
}

export async function writeMarketplacePreferencesServer(preferences: unknown, userId: string) {
  const current = ensureUserPreferencesRow(userId);
  const normalized = normalizeMarketplacePreferences(preferences);

  upsertUserPreferencesRow({
    userId: current.userId,
    marketplaceJson: JSON.stringify(normalized),
    liveShoppingJson: JSON.stringify(current.liveShopping),
  });

  return normalized;
}

export async function readLiveShoppingPreferencesServer(userId: string) {
  return ensureUserPreferencesRow(userId).liveShopping;
}

export async function writeLiveShoppingPreferencesServer(preferences: unknown, userId: string) {
  const current = ensureUserPreferencesRow(userId);
  const normalized = normalizeLiveShoppingPreferences(preferences);

  upsertUserPreferencesRow({
    userId: current.userId,
    marketplaceJson: JSON.stringify(current.marketplace),
    liveShoppingJson: JSON.stringify(normalized),
  });

  return normalized;
}

export async function seedPreferencesStoreIfMissing(userId: string) {
  ensureUserPreferencesRow(userId);
}
