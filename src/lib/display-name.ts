export function formatDisplayName(value: string | null | undefined, fallback = "Pictomag User") {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/^(\p{L})/u, (character) => character.toLocaleUpperCase("fr-FR"));
}
