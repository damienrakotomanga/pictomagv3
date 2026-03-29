export type PublicPostSurface = "reel" | "classic";
export type PublicPostKind = "video" | "photo" | "letter" | "gallery" | "note";
export type PublicPostMediaType = "image" | "video";

export type PublicPostMedia = {
  id: number;
  postId: number;
  mediaType: PublicPostMediaType;
  src: string;
  posterSrc: string | null;
  altText: string;
  position: number;
};

export type PublicPostAuthor = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  websiteUrl: string | null;
};

export type PublicPost = {
  id: number;
  userId: string;
  surface: PublicPostSurface;
  kind: PublicPostKind;
  title: string;
  body: string;
  trackName: string;
  durationLabel: string;
  timelikeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number;
  author: PublicPostAuthor;
  media: PublicPostMedia[];
};

export type PublicProfileBundle = {
  user: {
    id: string;
    email: string | null;
    role: string;
    authMode: string;
    createdAt: number;
    updatedAt: number;
    lastLoginAt: number | null;
  } | null;
  profile: PublicPostAuthor;
  stats: {
    posts: number;
  };
  posts: PublicPost[];
};

export type FeedMediaItem = {
  id: number;
  kind: "video" | "photo";
  src: string;
  author: string;
  title: string;
  music: string;
  duration: string;
  timeLikeCount: number;
};

export type ClassicFeedCardItem = {
  id: number;
  videoId: number;
  variant: "letter" | "gallery" | "video" | "note";
  author: string;
  handle: string;
  avatar: string;
  timestamp: string;
  eyebrow: string;
  title: string;
  body: string;
  duration: string;
  timelikeCount: string;
  commentCount: string;
  shareCount: string;
  media?: {
    kind: "image" | "video" | "gallery";
    src?: string;
    poster?: string;
    gallery?: string[];
  };
};

export type ProfileAlbumItem = {
  id: number;
  src: string;
  alt: string;
};

export type ProfileVideoItem = {
  id: number;
  title: string;
  caption: string;
  poster: string;
  src: string;
  duration: string;
};

function formatCompactCount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatRelativeTimestamp(timestamp: number, now = Date.now()) {
  const diffMs = Math.max(0, now - timestamp);
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `il y a ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `il y a ${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `il y a ${diffDays} j`;
}

export function toFeedMediaItem(post: PublicPost): FeedMediaItem | null {
  if (post.surface !== "reel") {
    return null;
  }

  const primaryMedia = post.media[0];
  if (!primaryMedia) {
    return null;
  }

  return {
    id: post.id,
    kind: primaryMedia.mediaType === "video" ? "video" : "photo",
    src: primaryMedia.src,
    author: post.author.username,
    title: post.title,
    music: post.trackName,
    duration: post.durationLabel,
    timeLikeCount: post.timelikeCount,
  };
}

export function toClassicFeedCardItem(post: PublicPost): ClassicFeedCardItem | null {
  if (post.surface !== "classic") {
    return null;
  }

  const baseItem: ClassicFeedCardItem = {
    id: post.id,
    videoId: post.id,
    variant: post.kind === "gallery" ? "gallery" : post.kind === "video" ? "video" : post.kind === "note" ? "note" : "letter",
    author: post.author.displayName,
    handle: `@${post.author.username}`,
    avatar: post.author.avatarUrl ?? "/figma-assets/avatar-user.png",
    timestamp: formatRelativeTimestamp(post.publishedAt),
    eyebrow:
      post.kind === "gallery"
        ? "Serie photo"
        : post.kind === "video"
          ? "Video"
          : post.kind === "note"
            ? "Note rapide"
            : "Lettre ouverte",
    title: post.title,
    body: post.body,
    duration: post.durationLabel,
    timelikeCount: formatCompactCount(post.timelikeCount),
    commentCount: formatCompactCount(post.commentCount),
    shareCount: formatCompactCount(post.shareCount),
  };

  if (post.kind === "gallery") {
    return {
      ...baseItem,
      media: {
        kind: "gallery",
        gallery: post.media
          .filter((media) => media.mediaType === "image")
          .sort((left, right) => left.position - right.position)
          .map((media) => media.src),
      },
    };
  }

  if (post.kind === "video") {
    const media = post.media.find((entry) => entry.mediaType === "video");
    return {
      ...baseItem,
      media: media
        ? {
            kind: "video",
            src: media.src,
            poster: media.posterSrc ?? undefined,
          }
        : undefined,
    };
  }

  if (post.kind === "note" || post.kind === "photo") {
    const media = post.media.find((entry) => entry.mediaType === "image");
    return {
      ...baseItem,
      media: media
        ? {
            kind: "image",
            src: media.src,
          }
        : undefined,
    };
  }

  return baseItem;
}

export function toProfileAlbumItems(posts: PublicPost[]) {
  const images = posts
    .flatMap((post) =>
      post.media
        .filter((media) => media.mediaType === "image")
        .sort((left, right) => left.position - right.position)
        .map((media) => ({
          id: media.id,
          src: media.src,
          alt: media.altText || post.title,
        })),
    );

  return images;
}

export function toProfileVideoItems(posts: PublicPost[]) {
  return posts
    .flatMap((post) =>
      post.media
        .filter((media) => media.mediaType === "video")
        .sort((left, right) => left.position - right.position)
        .map((media) => ({
          id: media.id,
          title: post.title,
          caption: post.body,
          poster: media.posterSrc ?? "/figma-assets/photo-feed/photo-grid-3.jpg",
          src: media.src,
          duration: post.durationLabel,
        })),
    );
}
