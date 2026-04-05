"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type PostInteractionVideo } from "@/components/post-interaction-drawers";
import {
  type ClassicFeedCardItem,
  type FeedMediaItem,
  type PublicPost,
  toClassicFeedCardItem,
  toFeedMediaItem,
} from "@/lib/posts";
import { getSoundSlugForTrack } from "@/lib/sound-library";

export type PhotoTile = {
  id: string;
  postId: number;
  src: string;
  alt: string;
};

type SearchPostResult = {
  id: number;
  title: string;
  meta: string;
};

type SearchCreatorResult = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  badge: string;
};

type SearchSoundResult = {
  id: string;
  label: string;
  meta: string;
};

type StoryCard = {
  id: number;
  name: string;
  avatar: string;
  live?: boolean;
};

function parseCompactCount(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(/,/g, "");
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toClassicDrawerVideo(item: ClassicFeedCardItem): PostInteractionVideo | null {
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
    author: item.handle.replace(/^@/, "") || item.author,
    title: item.title,
    music: item.eyebrow,
    duration: item.duration,
    timeLikeCount: parseCompactCount(item.timelikeCount),
    viewerHasTimeLike: item.viewerHasTimeLike,
    viewerTimeLikeActiveMs: item.viewerTimeLikeActiveMs,
    viewerTimeLikeMaxProgress: item.viewerTimeLikeMaxProgress,
  };
}

export function useFeedSurfaceData(videoLayoutCount: number) {
  const [feedVideos, setFeedVideos] = useState<FeedMediaItem[]>([]);
  const [classicFeedItems, setClassicFeedItems] = useState<ClassicFeedCardItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      const loadScope = async (scope: "feed" | "classic") => {
        const response = await fetch(`/api/posts?scope=${scope}&limit=12`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Impossible de charger ${scope}.`);
        }

        const payload = (await response.json()) as { posts?: PublicPost[] };
        return Array.isArray(payload.posts) ? payload.posts : [];
      };

      try {
        const [feedPosts, classicPosts] = await Promise.all([loadScope("feed"), loadScope("classic")]);

        if (cancelled) {
          return;
        }

        setFeedVideos(feedPosts.map((post) => toFeedMediaItem(post)).filter((post): post is FeedMediaItem => Boolean(post)));
        setClassicFeedItems(
          classicPosts.map((post) => toClassicFeedCardItem(post)).filter((post): post is ClassicFeedCardItem => Boolean(post)),
        );
      } catch {
        // Keep the current state untouched when the network call fails.
      }
    };

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedFeedVideos = useMemo(() => feedVideos.slice(0, videoLayoutCount), [feedVideos, videoLayoutCount]);
  const resolvedClassicDrawerVideos = useMemo(
    () =>
      classicFeedItems.flatMap((item) => {
        const video = toClassicDrawerVideo(item);
        return video ? [video] : [];
      }),
    [classicFeedItems],
  );
  const drawerVideos = useMemo(
    () => [...resolvedFeedVideos, ...resolvedClassicDrawerVideos],
    [resolvedClassicDrawerVideos, resolvedFeedVideos],
  );
  const searchPosts = useMemo(() => {
    const seen = new Set<number>();
    const results: SearchPostResult[] = [];

    for (const item of classicFeedItems) {
      if (seen.has(item.id)) {
        continue;
      }

      seen.add(item.id);
      results.push({
        id: item.id,
        title: item.title,
        meta: `${item.eyebrow} - ${item.handle}`,
      });
    }

    for (const item of resolvedFeedVideos) {
      if (seen.has(item.id)) {
        continue;
      }

      seen.add(item.id);
      results.push({
        id: item.id,
        title: item.title,
        meta: `@${item.author} - ${item.music}`,
      });
    }

    return results.slice(0, 12);
  }, [classicFeedItems, resolvedFeedVideos]);
  const searchCreators = useMemo(() => {
    const creators = new Map<string, SearchCreatorResult>();

    for (const item of classicFeedItems) {
      const creatorId = item.authorUsername?.trim() || item.handle.replace(/^@/, "") || String(item.id);

      if (creators.has(creatorId)) {
        continue;
      }

      creators.set(creatorId, {
        id: creatorId,
        name: item.author,
        handle: item.handle,
        avatar: item.avatar,
        badge: item.eyebrow,
      });
    }

    for (const item of resolvedFeedVideos) {
      const creatorId = item.authorUsername.trim().toLowerCase();

      if (!creatorId || creators.has(creatorId)) {
        continue;
      }

      creators.set(creatorId, {
        id: creatorId,
        name: item.authorDisplayName,
        handle: `@${item.authorUsername}`,
        avatar: item.authorAvatar,
        badge: "Video",
      });
    }

    return [...creators.values()].slice(0, 12);
  }, [classicFeedItems, resolvedFeedVideos]);
  const searchSounds = useMemo(() => {
    const sounds = new Map<string, SearchSoundResult>();

    for (const item of resolvedFeedVideos) {
      const label = item.music.trim();

      if (!label) {
        continue;
      }

      const soundId = getSoundSlugForTrack(label);

      if (sounds.has(soundId)) {
        continue;
      }

      sounds.set(soundId, {
        id: soundId,
        label,
        meta: `@${item.author} - ${item.duration}`,
      });
    }

    return [...sounds.values()].slice(0, 12);
  }, [resolvedFeedVideos]);
  const storyCards = useMemo<StoryCard[]>(
    () =>
      searchCreators.slice(0, 8).map((creator, index) => ({
        id: index + 1,
        name: creator.name.split(/\s+/)[0] ?? creator.name,
        avatar: creator.avatar,
        live: index === 0 && resolvedFeedVideos.length > 0,
      })),
    [resolvedFeedVideos.length, searchCreators],
  );
  const photoTiles = useMemo(() => {
    const tiles: PhotoTile[] = [];

    for (const item of classicFeedItems) {
      if (!item.media) {
        continue;
      }

      if (item.media.kind === "image" && item.media.src) {
        tiles.push({
          id: `${item.id}-cover`,
          postId: item.id,
          src: item.media.src,
          alt: item.title,
        });
        continue;
      }

      if (item.media.kind === "gallery" && item.media.gallery) {
        item.media.gallery.forEach((src, index) => {
          tiles.push({
            id: `${item.id}-${index}`,
            postId: item.id,
            src,
            alt: `${item.title} ${index + 1}`,
          });
        });
      }
    }

    return tiles;
  }, [classicFeedItems]);

  const updateCommentCount = useCallback((videoId: number, nextCount: number) => {
    const formatted = new Intl.NumberFormat("fr-FR").format(nextCount);
    setFeedVideos((current) => current.map((item) => (item.id === videoId ? { ...item, commentCount: nextCount } : item)));
    setClassicFeedItems((current) =>
      current.map((item) => (item.videoId === videoId ? { ...item, commentCount: formatted } : item)),
    );
  }, []);

  const findDrawerVideo = useCallback(
    (videoId: number | null) => (videoId !== null ? drawerVideos.find((video) => video.id === videoId) ?? null : null),
    [drawerVideos],
  );

  return {
    classicFeedItems,
    findDrawerVideo,
    photoTiles,
    resolvedFeedVideos,
    searchCreators,
    searchPosts,
    searchSounds,
    storyCards,
    updateCommentCount,
  };
}
