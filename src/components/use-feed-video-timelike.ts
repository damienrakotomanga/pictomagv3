"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getTimeLikeProgress,
  getTimeLikeRule,
  parseDurationLabel,
  shouldTriggerTimeLike,
  type TimeLikeSnapshot,
} from "@/components/post-interaction-drawers";
import { type FeedMediaItem } from "@/lib/posts";
import { persistTimeLike, removeTimeLike } from "@/lib/timelike-client";

export function useFeedVideoTimeLike({
  media,
  expanded,
  trackingEnabled,
  onTimeLikeStateChange,
}: {
  media: FeedMediaItem;
  expanded: boolean;
  trackingEnabled: boolean;
  onTimeLikeStateChange: (videoId: number, snapshot: TimeLikeSnapshot) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timeLikeBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeLikeBurstVisible, setTimeLikeBurstVisible] = useState(false);
  const [timeLikeBurstTick, setTimeLikeBurstTick] = useState(0);
  const [isDislikePromptOpen, setIsDislikePromptOpen] = useState(false);
  const [resolvedDurationSeconds, setResolvedDurationSeconds] = useState(() => parseDurationLabel(media.duration));
  const [timeLikeState, setTimeLikeState] = useState(() => ({
    activeMs: media.viewerTimeLikeActiveMs ?? 0,
    maxProgress: media.viewerTimeLikeMaxProgress ?? 0,
    triggered: media.viewerHasTimeLike,
    count: media.timeLikeCount,
    dismissed: false,
    persisting: false,
  }));
  const timeLikeRule = getTimeLikeRule(media.kind, resolvedDurationSeconds);
  const timeLikeProgress = timeLikeState.triggered
    ? 1
    : getTimeLikeProgress(timeLikeRule, timeLikeState.activeMs, timeLikeState.maxProgress);

  useEffect(() => {
    onTimeLikeStateChange(media.id, {
      videoId: media.id,
      kind: media.kind,
      author: media.author,
      title: media.title,
      count: timeLikeState.count,
      triggered: timeLikeState.triggered,
      activeMs: timeLikeState.activeMs,
      maxProgress: timeLikeState.maxProgress,
      progressValue: timeLikeProgress,
      rule: timeLikeRule,
      durationSeconds: resolvedDurationSeconds,
    });
  }, [
    media.author,
    media.id,
    media.kind,
    media.title,
    onTimeLikeStateChange,
    resolvedDurationSeconds,
    timeLikeProgress,
    timeLikeRule,
    timeLikeState.activeMs,
    timeLikeState.count,
    timeLikeState.maxProgress,
    timeLikeState.triggered,
  ]);

  useEffect(() => {
    return () => {
      if (timeLikeBurstTimerRef.current) {
        clearTimeout(timeLikeBurstTimerRef.current);
      }
    };
  }, []);

  const launchTimeLikeBurst = useCallback(() => {
    if (timeLikeBurstTimerRef.current) {
      clearTimeout(timeLikeBurstTimerRef.current);
    }

    setTimeLikeBurstTick((prev) => prev + 1);
    setTimeLikeBurstVisible(true);
    timeLikeBurstTimerRef.current = setTimeout(() => {
      setTimeLikeBurstVisible(false);
    }, 980);
  }, []);

  const commitTimeLike = useCallback(
    async (activeMs: number, maxProgress: number) => {
      try {
        const response = await persistTimeLike({
          postId: media.id,
          activeMs,
          maxProgress,
        });

        setTimeLikeState((current) => ({
          ...current,
          activeMs: response.timelike?.activeMs ?? Math.max(current.activeMs, activeMs),
          maxProgress: response.timelike?.maxProgress ?? Math.max(current.maxProgress, maxProgress),
          triggered: true,
          count: response.totalCount,
          dismissed: false,
          persisting: false,
        }));

        launchTimeLikeBurst();
      } catch {
        setTimeLikeState((current) => ({
          ...current,
          persisting: false,
        }));
      }
    },
    [launchTimeLikeBurst, media.id],
  );

  useEffect(() => {
    const video = videoRef.current;

    if (!video || media.kind !== "video") {
      return;
    }

    const syncDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setResolvedDurationSeconds(video.duration);
      }
    };

    syncDuration();
    video.addEventListener("loadedmetadata", syncDuration);
    video.addEventListener("durationchange", syncDuration);

    return () => {
      video.removeEventListener("loadedmetadata", syncDuration);
      video.removeEventListener("durationchange", syncDuration);
    };
  }, [media.kind, media.src]);

  useEffect(() => {
    if (
      !expanded ||
      !trackingEnabled ||
      timeLikeState.triggered ||
      timeLikeState.dismissed ||
      timeLikeState.persisting ||
      isDislikePromptOpen
    ) {
      return;
    }

    let lastTick = performance.now();
    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - lastTick, 450);
      lastTick = now;

      if (document.hidden) {
        return;
      }

      const video = videoRef.current;
      const canAccumulate = media.kind === "photo" ? true : Boolean(video && !video.paused && !video.ended);

      if (!canAccumulate) {
        return;
      }

      const durationSeconds =
        media.kind === "video" && video && Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : resolvedDurationSeconds;
      const currentProgress =
        media.kind === "video" && video && durationSeconds > 0 ? Math.min(1, video.currentTime / durationSeconds) : 0;

      let nextPersistActiveMs: number | null = null;
      let nextPersistMaxProgress: number | null = null;

      setTimeLikeState((current) => {
        if (current.triggered || current.dismissed || current.persisting) {
          return current;
        }

        const nextActiveMs = current.activeMs + delta;
        const nextMaxProgress = Math.max(current.maxProgress, currentProgress);
        const rule = getTimeLikeRule(media.kind, durationSeconds);
        const shouldTrigger = shouldTriggerTimeLike(rule, nextActiveMs, nextMaxProgress);

        if (!shouldTrigger) {
          return {
            ...current,
            activeMs: nextActiveMs,
            maxProgress: nextMaxProgress,
          };
        }

        nextPersistActiveMs = nextActiveMs;
        nextPersistMaxProgress = nextMaxProgress;

        return {
          ...current,
          activeMs: nextActiveMs,
          maxProgress: nextMaxProgress,
          persisting: true,
        };
      });

      if (nextPersistActiveMs !== null && nextPersistMaxProgress !== null) {
        void commitTimeLike(nextPersistActiveMs, nextPersistMaxProgress);
      }
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    commitTimeLike,
    expanded,
    isDislikePromptOpen,
    media.kind,
    resolvedDurationSeconds,
    timeLikeState.dismissed,
    timeLikeState.persisting,
    timeLikeState.triggered,
    trackingEnabled,
  ]);

  const handleOpenDislikePrompt = useCallback(() => {
    setIsDislikePromptOpen(true);
  }, []);

  const handleCloseDislikePrompt = useCallback(() => {
    setIsDislikePromptOpen(false);
  }, []);

  const handleCancelTimeLike = useCallback(() => {
    setTimeLikeBurstVisible(false);

    if (!timeLikeState.triggered) {
      setTimeLikeState((current) => ({
        ...current,
        activeMs: 0,
        maxProgress: 0,
        dismissed: true,
      }));
      setIsDislikePromptOpen(false);
      return;
    }

    setTimeLikeState((current) => ({
      ...current,
      persisting: true,
    }));

    void removeTimeLike(media.id)
      .then((response) => {
        setTimeLikeState({
          activeMs: 0,
          maxProgress: 0,
          triggered: false,
          count: response.totalCount,
          dismissed: true,
          persisting: false,
        });
      })
      .catch(() => {
        setTimeLikeState((current) => ({
          ...current,
          persisting: false,
        }));
      })
      .finally(() => {
        setIsDislikePromptOpen(false);
      });
  }, [media.id, timeLikeState.triggered]);

  return {
    handleCancelTimeLike,
    handleCloseDislikePrompt,
    handleOpenDislikePrompt,
    isDislikePromptOpen,
    timeLikeBurstTick,
    timeLikeBurstVisible,
    timeLikeProgress,
    timeLikeRule,
    timeLikeState,
    videoRef,
  };
}
