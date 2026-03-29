import {
  type LiveShoppingPreferences,
  type MarketplacePreferences,
  liveShoppingPreferencesDefaults,
  marketplacePreferencesDefaults,
  normalizeLiveShoppingPreferences,
  normalizeMarketplacePreferences,
} from "@/lib/user-preferences";

async function safeReadPreferences<T>({
  endpoint,
  normalize,
  fallback,
}: {
  endpoint: string;
  normalize: (input: unknown) => T;
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

    const payload = (await response.json()) as { preferences?: unknown };
    return normalize(payload.preferences);
  } catch {
    return fallback;
  }
}

async function safeWritePreferences<T>({
  endpoint,
  normalize,
  fallback,
  preferences,
}: {
  endpoint: string;
  normalize: (input: unknown) => T;
  fallback: T;
  preferences: T;
}) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ preferences }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as { preferences?: unknown };
    return normalize(payload.preferences);
  } catch {
    return fallback;
  }
}

export function readMarketplacePreferencesFromApi() {
  return safeReadPreferences<MarketplacePreferences>({
    endpoint: "/api/preferences/marketplace",
    normalize: normalizeMarketplacePreferences,
    fallback: marketplacePreferencesDefaults,
  });
}

export function writeMarketplacePreferencesToApi(preferences: MarketplacePreferences) {
  return safeWritePreferences<MarketplacePreferences>({
    endpoint: "/api/preferences/marketplace",
    normalize: normalizeMarketplacePreferences,
    fallback: preferences,
    preferences,
  });
}

export function readLiveShoppingPreferencesFromApi() {
  return safeReadPreferences<LiveShoppingPreferences>({
    endpoint: "/api/preferences/live-shopping",
    normalize: normalizeLiveShoppingPreferences,
    fallback: liveShoppingPreferencesDefaults,
  });
}

export function writeLiveShoppingPreferencesToApi(preferences: LiveShoppingPreferences) {
  return safeWritePreferences<LiveShoppingPreferences>({
    endpoint: "/api/preferences/live-shopping",
    normalize: normalizeLiveShoppingPreferences,
    fallback: preferences,
    preferences,
  });
}
