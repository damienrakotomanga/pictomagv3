"use client";

import { type PostInteractionVideo } from "@/components/post-interaction-drawers";
import { type ClassicFeedCardItem, type PublicPost, toPostDisplayCardItem } from "@/lib/posts";

function parseCompactCount(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(/,/g, "");
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function toPostInteractionVideo(item: ClassicFeedCardItem): PostInteractionVideo | null {
  const media = item.media;

  if (!media) {
    return null;
  }

  const src =
    media.kind === "gallery"
      ? media.gallery?.[0] ?? ""
      : media.kind === "video"
        ? media.src ?? media.poster ?? ""
        : media.src ?? "";

  if (!src) {
    return null;
  }

  return {
    id: item.videoId,
    kind: media.kind === "video" ? "video" : "photo",
    src,
    author: (item.authorUsername ?? item.handle.replace(/^@/, "")).trim(),
    title: item.title,
    music: item.eyebrow ?? (media.kind === "video" ? "Video" : "Photo"),
    duration: item.duration,
    timeLikeCount: parseCompactCount(item.timelikeCount),
    viewerHasTimeLike: item.viewerHasTimeLike,
    viewerTimeLikeActiveMs: item.viewerTimeLikeActiveMs,
    viewerTimeLikeMaxProgress: item.viewerTimeLikeMaxProgress,
  };
}

export function toPostInteractionVideoFromPost(post: PublicPost): PostInteractionVideo | null {
  return toPostInteractionVideo(toPostDisplayCardItem(post));
}
