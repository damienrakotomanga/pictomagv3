"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ClassicFeedView } from "@/components/classic-feed-view";
import { FeedClassicEmptyState, FeedPhotoEmptyState } from "@/components/feed-surface-empty-state";
import { FeedVideoCluster } from "@/components/feed-video-cluster";
import { type HeaderNavItemId } from "@/components/animated-header-nav";
import { FeedShellChrome } from "@/components/feed-shell-chrome";
import { SearchPanel } from "@/components/feed-search-panel";
import {
  CommentsDrawer,
  MoreActionsDrawer,
  ShareDrawer,
  TimeLikeDrawer,
  type TimeLikeSnapshot,
} from "@/components/post-interaction-drawers";
import { useFeedOverlayState } from "@/components/use-feed-overlay-state";
import { useFeedSurfaceData } from "@/components/use-feed-surface-data";
import { useFeedVideoSnap } from "@/components/use-feed-video-snap";

type ContentMode = "classic" | "video" | "photo";

type PostLayout = {
  id: number;
  left: number;
  top: number;
};

const postLayouts: PostLayout[] = [
  { id: 1, left: 470, top: 265 },
  { id: 2, left: 470, top: 1186 },
  { id: 3, left: 463, top: 2107 },
  { id: 4, left: 470, top: 3028 },
  { id: 5, left: 470, top: 3949 },
  { id: 6, left: 470, top: 4870 },
];

const BASE_POST_HEIGHT = 875;
const CLASSIC_PAGE_HEIGHT = 3050;
const PHOTO_GRID_TOP = postLayouts[0]!.top;
const PHOTO_GRID_TILE_HEIGHT = 447;
const PHOTO_GRID_GAP = 5;

function DirectionIcon({ direction }: { direction: "up" | "down" }) {
  const path =
    direction === "up"
      ? "M12 17V7M12 7L7 12M12 7L17 12"
      : "M12 7V17M12 17L7 12M12 17L17 12";

  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6">
      <path d={path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function FeedPage({ initialMode = "classic" }: { initialMode?: ContentMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [contentMode, setContentMode] = useState<ContentMode>(initialMode);
  const [expandedPostHeight, setExpandedPostHeight] = useState<number>(BASE_POST_HEIGHT);
  const [timeLikeSnapshots, setTimeLikeSnapshots] = useState<Record<number, TimeLikeSnapshot>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const {
    classicFeedItems,
    findDrawerVideo,
    photoTiles,
    resolvedFeedVideos,
    searchCreators,
    searchPosts,
    searchSounds,
    storyCards,
    updateCommentCount,
  } = useFeedSurfaceData(postLayouts.length);
  const {
    closeComments,
    closeMore,
    closeOverlayPanels,
    closeSearch,
    closeShare,
    closeTimeLike,
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
  } = useFeedOverlayState();
  const showPhotoTool = pathname === "/photos";

  useEffect(() => {
    setContentMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const updateExpandedPostHeight = () => {
      const nextHeight = Math.max(620, Math.min(window.innerHeight - 94, 1360));
      setExpandedPostHeight((current) => (Math.abs(current - nextHeight) < 1 ? current : nextHeight));
    };

    updateExpandedPostHeight();
    window.addEventListener("resize", updateExpandedPostHeight);

    return () => {
      window.removeEventListener("resize", updateExpandedPostHeight);
    };
  }, []);

  const activeVideoLayoutIds = useMemo(
    () => resolvedFeedVideos.map((_, index) => postLayouts[index]!.id),
    [resolvedFeedVideos],
  );

  const handleTimeLikeStateChange = useCallback((videoId: number, snapshot: TimeLikeSnapshot) => {
    setTimeLikeSnapshots((current) => {
      const previous = current[videoId];

      if (
        previous &&
        previous.count === snapshot.count &&
        previous.triggered === snapshot.triggered &&
        Math.abs(previous.activeMs - snapshot.activeMs) < 220 &&
        Math.abs(previous.maxProgress - snapshot.maxProgress) < 0.01 &&
        Math.abs(previous.progressValue - snapshot.progressValue) < 0.01
      ) {
        return current;
      }

      return {
        ...current,
        [videoId]: snapshot,
      };
    });
  }, []);

  const handleCommentCountChange = useCallback((videoId: number, nextCount: number) => {
    updateCommentCount(videoId, nextCount);
  }, [updateCommentCount]);

  const handleNavItemClick = useCallback((itemId: HeaderNavItemId) => {
    if (itemId === "search") {
      toggleSearch();
      return;
    }

    if (itemId === "watch") {
      closeOverlayPanels();
      router.push("/live-shopping");
      return;
    }

    if (itemId === "shop") {
      closeOverlayPanels();
      router.push("/marketplace");
      return;
    }

    closeSearch();
  }, [closeOverlayPanels, closeSearch, router, toggleSearch]);

  const handleTopActionClick = useCallback(
    (actionId: string) => {
      if (actionId !== "create") {
        return;
      }

      closeOverlayPanels();
      router.push("/compose");
    },
    [closeOverlayPanels, router],
  );
  const handleOpenCreator = useCallback(
    (handle: string) => {
      closeOverlayPanels();
      router.push(`/u/${handle.replace(/^@/, "")}`);
    },
    [closeOverlayPanels, router],
  );
  const handleOpenPost = useCallback(
    (postId: number) => {
      closeOverlayPanels();
      router.push(`/posts/${postId}`);
    },
    [closeOverlayPanels, router],
  );
  const handleOpenSound = useCallback(
    (soundId: string) => {
      closeOverlayPanels();
      router.push(`/sounds/${soundId}`);
    },
    [closeOverlayPanels, router],
  );

  const { focusedPostId, handleSectionRef, handleSnapStep, releaseSnapLock } = useFeedVideoSnap({
    activeVideoLayoutIds,
    enabled: contentMode === "video",
    wheelLocked: overlayLocked,
  });

  const switchContentMode = useCallback(
    (nextMode: ContentMode) => {
      closeOverlayPanels();
      releaseSnapLock();
      setContentMode(nextMode);
      window.scrollTo({ top: 0, behavior: "auto" });

      if (pathname === "/photos" && nextMode !== "photo") {
        router.replace("/");
      }
    },
    [closeOverlayPanels, pathname, releaseSnapLock, router],
  );

  const expandedExtraHeight = Math.max(0, Math.round(expandedPostHeight - BASE_POST_HEIGHT));
  const focusedIndex = postLayouts.findIndex((layout) => layout.id === focusedPostId);
  const dynamicPostLayouts = postLayouts.map((layout, index) => ({
    ...layout,
    top: focusedIndex !== -1 && index > focusedIndex ? layout.top + expandedExtraHeight : layout.top,
  }));
  const activeVideoLayouts = dynamicPostLayouts.slice(0, resolvedFeedVideos.length);
  const activeVideoPageHeight =
    activeVideoLayouts.length > 0
      ? activeVideoLayouts[activeVideoLayouts.length - 1]!.top +
        (focusedPostId === activeVideoLayouts[activeVideoLayouts.length - 1]!.id ? expandedPostHeight : BASE_POST_HEIGHT) +
        240
      : PHOTO_GRID_TOP + 220;
  const photoGridRows = Math.max(1, Math.ceil(photoTiles.length / 4));
  const photoGridHeight =
    photoGridRows * PHOTO_GRID_TILE_HEIGHT + Math.max(0, photoGridRows - 1) * PHOTO_GRID_GAP;
  const photoPageHeight = PHOTO_GRID_TOP + photoGridHeight + 140;
  const pageHeight =
    contentMode === "classic"
      ? CLASSIC_PAGE_HEIGHT
      : contentMode === "photo"
        ? photoPageHeight
        : activeVideoPageHeight;
  const isClassicMode = contentMode === "classic";
  const isVideoMode = contentMode === "video";

  return (
    <div className="overflow-x-auto bg-white">
      <div className="w-full bg-white">
        <div
          className="relative mx-auto w-[1440px] bg-white text-black"
          style={{ height: pageHeight }}
        >
          <FeedShellChrome
            isSearchOpen={isSearchOpen}
            onNavItemClick={handleNavItemClick}
            onTopActionClick={handleTopActionClick}
            stories={storyCards}
            isClassicMode={isClassicMode}
            isVideoMode={isVideoMode}
            isPhotoMode={contentMode === "photo"}
            showPhotoTool={showPhotoTool}
            onSelectMode={switchContentMode}
          />

          {isClassicMode ? (
            classicFeedItems.length > 0 ? (
              <ClassicFeedView
                onOpenPost={handleOpenPost}
                onOpenComments={openComments}
                onOpenShare={openShare}
                onOpenTimeLike={openTimeLike}
                onOpenMore={openMore}
                trackingEnabled={!overlayLocked}
                onTimeLikeStateChange={handleTimeLikeStateChange}
                items={classicFeedItems}
              />
            ) : (
              <FeedClassicEmptyState onCreate={() => router.push("/compose")} />
            )
          ) : isVideoMode ? (
            <>
              {activeVideoLayouts.map((layout, index) => {
                const media = resolvedFeedVideos[index];

                if (!media) {
                  return null;
                }

                return (
                  <FeedVideoCluster
                    key={`cluster-${layout.id}-${media.id}`}
                    layoutId={layout.id}
                    left={layout.left}
                    top={layout.top}
                    media={media}
                    expanded={focusedPostId === layout.id}
                    trackingEnabled={!overlayLocked}
                    moreOpen={moreVideoId === media.id}
                    onSectionRef={handleSectionRef}
                    onOpenComments={openComments}
                    onOpenShare={openShare}
                    onOpenTimeLike={openTimeLike}
                    onOpenMore={openMore}
                    onTimeLikeStateChange={handleTimeLikeStateChange}
                  />
                );
              })}

              <div className="shorts-nav fixed right-[42px] top-1/2 z-[140] flex -translate-y-1/2 flex-col gap-4">
                <button
                  type="button"
                  aria-label="Previous short"
                  onClick={() => handleSnapStep(-1)}
                  className="shorts-nav-btn"
                >
                  <DirectionIcon direction="up" />
                </button>
                <button
                  type="button"
                  aria-label="Next short"
                  onClick={() => handleSnapStep(1)}
                  className="shorts-nav-btn"
                >
                  <DirectionIcon direction="down" />
                </button>
              </div>
            </>
          ) : (
            <section
              className="absolute left-1/2 grid w-[1091px] -translate-x-1/2 grid-cols-4 gap-[5px]"
              style={{ top: PHOTO_GRID_TOP }}
            >
              {photoTiles.length > 0 ? (
                photoTiles.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => handleOpenPost(tile.postId)}
                    className="hover-lift group relative h-[447px] overflow-hidden rounded-[2px] bg-[#d9d9d9] text-left"
                  >
                    <Image
                      src={tile.src}
                      alt={tile.alt}
                      fill
                      sizes="269px"
                      className="object-cover transition duration-300 group-hover:scale-[1.015]"
                    />
                    <div className="absolute inset-0 bg-black/10 transition duration-300 group-hover:bg-black/5" />
                  </button>
                ))
              ) : (
                <FeedPhotoEmptyState />
              )}
            </section>
          )}

          <CommentsDrawer
            video={findDrawerVideo(commentsVideoId)}
            open={commentsVideoId !== null}
            onClose={closeComments}
            onCommentCountChange={handleCommentCountChange}
          />
          <ShareDrawer
            key={shareVideoId !== null ? `share-${shareVideoId}` : "share-closed"}
            video={findDrawerVideo(shareVideoId)}
            open={shareVideoId !== null}
            onClose={closeShare}
          />
          <MoreActionsDrawer
            key={moreVideoId !== null ? `more-${moreVideoId}` : "more-closed"}
            video={findDrawerVideo(moreVideoId)}
            open={moreVideoId !== null}
            onClose={closeMore}
          />
          <TimeLikeDrawer
            key={timeLikeVideoId !== null ? `timelike-${timeLikeVideoId}` : "timelike-closed"}
            video={findDrawerVideo(timeLikeVideoId)}
            snapshot={timeLikeVideoId !== null ? timeLikeSnapshots[timeLikeVideoId] ?? null : null}
            open={timeLikeVideoId !== null}
            onClose={closeTimeLike}
          />
          <SearchPanel
            open={isSearchOpen}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={closeSearch}
            posts={searchPosts}
            creators={searchCreators}
            sounds={searchSounds}
            onOpenCreator={handleOpenCreator}
            onOpenSound={handleOpenSound}
            onOpenPost={handleOpenPost}
          />
        </div>
      </div>
    </div>
  );
}
