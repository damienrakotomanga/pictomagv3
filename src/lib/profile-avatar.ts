const DEFAULT_AVATAR = "/figma-assets/avatar-user.png";

export function resolveProfileAvatarSrc(
  value: string | null | undefined,
  fallback: string = DEFAULT_AVATAR,
) {
  const normalized = value?.trim();

  if (!normalized) {
    return fallback;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  if (normalized.startsWith("data:image/")) {
    return normalized;
  }

  return fallback;
}

export { DEFAULT_AVATAR };
