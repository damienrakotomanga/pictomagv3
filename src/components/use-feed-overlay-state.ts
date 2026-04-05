"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function useFeedOverlayState() {
  const [commentsVideoId, setCommentsVideoId] = useState<number | null>(null);
  const [shareVideoId, setShareVideoId] = useState<number | null>(null);
  const [timeLikeVideoId, setTimeLikeVideoId] = useState<number | null>(null);
  const [moreVideoId, setMoreVideoId] = useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const overlayLocked = useMemo(
    () =>
      commentsVideoId !== null ||
      shareVideoId !== null ||
      timeLikeVideoId !== null ||
      moreVideoId !== null ||
      isSearchOpen,
    [commentsVideoId, isSearchOpen, moreVideoId, shareVideoId, timeLikeVideoId],
  );

  useEffect(() => {
    if (!overlayLocked) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isSearchOpen) {
        setIsSearchOpen(false);
        return;
      }

      if (shareVideoId !== null) {
        setShareVideoId(null);
        return;
      }

      if (timeLikeVideoId !== null) {
        setTimeLikeVideoId(null);
        return;
      }

      if (moreVideoId !== null) {
        setMoreVideoId(null);
        return;
      }

      setCommentsVideoId(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [commentsVideoId, isSearchOpen, moreVideoId, overlayLocked, shareVideoId, timeLikeVideoId]);

  const closeOverlayPanels = useCallback(() => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen(false);
  }, []);

  const openComments = useCallback((videoId: number) => {
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen(false);
    setCommentsVideoId(videoId);
  }, []);

  const openShare = useCallback((videoId: number) => {
    setCommentsVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen(false);
    setShareVideoId(videoId);
  }, []);

  const openTimeLike = useCallback((videoId: number) => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen(false);
    setTimeLikeVideoId(videoId);
  }, []);

  const openMore = useCallback((videoId: number) => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setIsSearchOpen(false);
    setMoreVideoId(videoId);
  }, []);

  const toggleSearch = useCallback(() => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen((current) => !current);
  }, []);

  return {
    closeComments: () => setCommentsVideoId(null),
    closeMore: () => setMoreVideoId(null),
    closeOverlayPanels,
    closeSearch: () => setIsSearchOpen(false),
    closeShare: () => setShareVideoId(null),
    closeTimeLike: () => setTimeLikeVideoId(null),
    commentsVideoId,
    isSearchOpen,
    moreVideoId,
    openComments,
    openMore,
    openShare,
    openTimeLike,
    overlayLocked,
    shareVideoId,
    timeLikeVideoId,
    toggleSearch,
  };
}
