"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function usePostInteractionOverlays({ manageBodyScroll = true }: { manageBodyScroll?: boolean } = {}) {
  const [commentsVideoId, setCommentsVideoId] = useState<number | null>(null);
  const [shareVideoId, setShareVideoId] = useState<number | null>(null);
  const [moreVideoId, setMoreVideoId] = useState<number | null>(null);
  const [timeLikeVideoId, setTimeLikeVideoId] = useState<number | null>(null);

  const overlayLocked = useMemo(
    () => commentsVideoId !== null || shareVideoId !== null || moreVideoId !== null || timeLikeVideoId !== null,
    [commentsVideoId, moreVideoId, shareVideoId, timeLikeVideoId],
  );

  const closeAll = useCallback(() => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setMoreVideoId(null);
    setTimeLikeVideoId(null);
  }, []);

  useEffect(() => {
    if (!overlayLocked) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (moreVideoId !== null) {
        setMoreVideoId(null);
        return;
      }

      if (timeLikeVideoId !== null) {
        setTimeLikeVideoId(null);
        return;
      }

      if (shareVideoId !== null) {
        setShareVideoId(null);
        return;
      }

      setCommentsVideoId(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [commentsVideoId, moreVideoId, overlayLocked, shareVideoId, timeLikeVideoId]);

  useEffect(() => {
    if (!manageBodyScroll) {
      return;
    }

    document.body.style.overflow = overlayLocked ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [manageBodyScroll, overlayLocked]);

  return {
    closeAll,
    closeComments: () => setCommentsVideoId(null),
    closeMore: () => setMoreVideoId(null),
    closeShare: () => setShareVideoId(null),
    closeTimeLike: () => setTimeLikeVideoId(null),
    commentsVideoId,
    moreVideoId,
    openComments: (videoId: number) => setCommentsVideoId(videoId),
    openMore: (videoId: number) => setMoreVideoId(videoId),
    openShare: (videoId: number) => setShareVideoId(videoId),
    openTimeLike: (videoId: number) => setTimeLikeVideoId(videoId),
    overlayLocked,
    shareVideoId,
    timeLikeVideoId,
  };
}
