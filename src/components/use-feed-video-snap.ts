"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseFeedVideoSnapArgs = {
  activeVideoLayoutIds: number[];
  enabled: boolean;
  wheelLocked: boolean;
};

export function useFeedVideoSnap({ activeVideoLayoutIds, enabled, wheelLocked }: UseFeedVideoSnapArgs) {
  const postSectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const pendingPostIdRef = useRef<number | null>(null);
  const snapLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapAlignTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapLockRef = useRef(false);
  const [focusedPostId, setFocusedPostId] = useState<number>(1);

  const getViewportAnchorY = useCallback(() => {
    const headerSafeArea = 96;
    const usableHeight = Math.max(window.innerHeight - headerSafeArea, 220);
    return headerSafeArea + usableHeight * 0.5;
  }, []);

  const getClosestPostId = useCallback(() => {
    const anchor = getViewportAnchorY();
    let closestId: number | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const layoutId of activeVideoLayoutIds) {
      const section = postSectionRefs.current[layoutId];

      if (!section) {
        continue;
      }

      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - anchor);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = layoutId;
      }
    }

    return closestId;
  }, [activeVideoLayoutIds, getViewportAnchorY]);

  const alignPostToViewport = useCallback(
    (postId: number, behavior: ScrollBehavior) => {
      const section = postSectionRefs.current[postId];

      if (!section) {
        return;
      }

      const anchor = getViewportAnchorY();
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const delta = sectionCenter - anchor;

      if (Math.abs(delta) < 6) {
        return;
      }

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const nextTop = Math.max(0, Math.min(maxScroll, window.scrollY + delta));
      window.scrollTo({ top: nextTop, behavior });
    },
    [getViewportAnchorY],
  );

  const releaseSnapLock = useCallback(() => {
    pendingPostIdRef.current = null;
    snapLockRef.current = false;

    if (snapLockTimeoutRef.current) {
      clearTimeout(snapLockTimeoutRef.current);
      snapLockTimeoutRef.current = null;
    }

    if (snapAlignTimeoutRef.current) {
      clearTimeout(snapAlignTimeoutRef.current);
      snapAlignTimeoutRef.current = null;
    }
  }, []);

  const scrollToPost = useCallback(
    (postId: number) => {
      pendingPostIdRef.current = postId;
      snapLockRef.current = true;
      setFocusedPostId((current) => (current === postId ? current : postId));

      if (snapLockTimeoutRef.current) {
        clearTimeout(snapLockTimeoutRef.current);
      }

      if (snapAlignTimeoutRef.current) {
        clearTimeout(snapAlignTimeoutRef.current);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          alignPostToViewport(postId, "smooth");
        });
      });

      snapAlignTimeoutRef.current = setTimeout(() => {
        alignPostToViewport(postId, "auto");
      }, 420);

      snapLockTimeoutRef.current = setTimeout(() => {
        alignPostToViewport(postId, "auto");
        releaseSnapLock();
      }, 760);
    },
    [alignPostToViewport, releaseSnapLock],
  );

  const handleSnapStep = useCallback(
    (direction: -1 | 1) => {
      if (activeVideoLayoutIds.length === 0) {
        return;
      }

      const fallbackId = getClosestPostId() ?? activeVideoLayoutIds[0];
      const currentId =
        pendingPostIdRef.current && activeVideoLayoutIds.includes(pendingPostIdRef.current)
          ? pendingPostIdRef.current
          : fallbackId;
      const currentIndex = activeVideoLayoutIds.indexOf(currentId);

      if (currentIndex === -1) {
        return;
      }

      const nextIndex = Math.max(0, Math.min(activeVideoLayoutIds.length - 1, currentIndex + direction));
      const nextId = activeVideoLayoutIds[nextIndex];

      if (nextId === currentId) {
        return;
      }

      scrollToPost(nextId);
    },
    [activeVideoLayoutIds, getClosestPostId, scrollToPost],
  );

  const handleSectionRef = useCallback((id: number, element: HTMLElement | null) => {
    postSectionRefs.current[id] = element;
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const updateFocusedPost = () => {
      if (snapLockRef.current && pendingPostIdRef.current !== null) {
        setFocusedPostId((current) =>
          current === pendingPostIdRef.current ? current : pendingPostIdRef.current!,
        );
        return;
      }

      const closestId = getClosestPostId();

      if (!closestId) {
        return;
      }

      setFocusedPostId((current) => (current === closestId ? current : closestId));
    };

    updateFocusedPost();
    window.addEventListener("scroll", updateFocusedPost, { passive: true });
    window.addEventListener("resize", updateFocusedPost);

    return () => {
      window.removeEventListener("scroll", updateFocusedPost);
      window.removeEventListener("resize", updateFocusedPost);
    };
  }, [enabled, getClosestPostId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleWheelStep = (event: WheelEvent) => {
      if (wheelLocked) {
        return;
      }

      if (Math.abs(event.deltaY) < 0.01) {
        return;
      }

      event.preventDefault();

      if (snapLockRef.current) {
        return;
      }

      handleSnapStep(event.deltaY > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", handleWheelStep, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheelStep);
    };
  }, [enabled, handleSnapStep, wheelLocked]);

  useEffect(() => releaseSnapLock, [releaseSnapLock]);

  const resolvedFocusedPostId =
    activeVideoLayoutIds.length === 0
      ? 1
      : activeVideoLayoutIds.includes(focusedPostId)
        ? focusedPostId
        : activeVideoLayoutIds[0]!;

  return {
    focusedPostId: resolvedFocusedPostId,
    handleSectionRef,
    handleSnapStep,
    releaseSnapLock,
  };
}
