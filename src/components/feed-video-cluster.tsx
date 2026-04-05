"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { FeedVideoActionRail } from "@/components/feed-video-action-rail";
import { type TimeLikeSnapshot } from "@/components/post-interaction-drawers";
import { useFeedVideoTimeLike } from "@/components/use-feed-video-timelike";
import { type FeedMediaItem } from "@/lib/posts";
import { getSoundSlugForTrack } from "@/lib/sound-library";

export function FeedVideoCluster({
  layoutId,
  left,
  top,
  media,
  expanded,
  trackingEnabled,
  moreOpen,
  onSectionRef,
  onOpenComments,
  onOpenShare,
  onOpenTimeLike,
  onOpenMore,
  onTimeLikeStateChange,
}: {
  layoutId: number;
  left: number;
  top: number;
  media: FeedMediaItem;
  expanded: boolean;
  trackingEnabled: boolean;
  moreOpen: boolean;
  onSectionRef: (id: number, element: HTMLElement | null) => void;
  onOpenComments: (videoId: number) => void;
  onOpenShare: (videoId: number) => void;
  onOpenTimeLike: (videoId: number) => void;
  onOpenMore: (videoId: number) => void;
  onTimeLikeStateChange: (videoId: number, snapshot: TimeLikeSnapshot) => void;
}) {
  const router = useRouter();
  const soundSlug = getSoundSlugForTrack(media.music);
  const {
    handleCancelTimeLike,
    handleCloseDislikePrompt,
    handleOpenDislikePrompt,
    isDislikePromptOpen,
    timeLikeBurstTick,
    timeLikeBurstVisible,
    timeLikeProgress,
    timeLikeState,
    videoRef,
  } = useFeedVideoTimeLike({
    media,
    expanded,
    trackingEnabled,
    onTimeLikeStateChange,
  });

  const handleOpenAuthorProfile = useCallback(() => {
    router.push(`/u/${encodeURIComponent(media.authorUsername)}`);
  }, [media.authorUsername, router]);

  const handleOpenPostDetail = useCallback(() => {
    router.push(`/posts/${media.id}`);
  }, [media.id, router]);

  const handleOpenSound = useCallback(() => {
    router.push(`/sounds/${soundSlug}`);
  }, [router, soundSlug]);

  const commentCountLabel = new Intl.NumberFormat("fr-FR").format(media.commentCount);
  const shareCountLabel = new Intl.NumberFormat("fr-FR").format(media.shareCount);
  const timeLikeCountLabel = new Intl.NumberFormat("fr-FR").format(timeLikeState.count);

  return (
    <section
      ref={(element) => onSectionRef(layoutId, element)}
      className={`post-cluster absolute ${expanded ? "post-cluster-focus post-cluster-is-active" : ""}`}
      style={{ left, top }}
    >
      <article className="post-video-card absolute left-0 top-0 overflow-hidden rounded-[4px]">
        <video
          ref={videoRef}
          key={media.src}
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/figma-assets/hero-feed.jpg"
          src={media.src}
          aria-label={`Video de ${media.authorDisplayName}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(180deg,rgba(3,5,9,0)_0%,rgba(3,5,9,0.03)_36%,rgba(3,5,9,0.14)_72%,rgba(3,5,9,0.48)_100%)]" />

        <div className="video-meta-dock absolute inset-x-0 bottom-0">
          <div className="video-meta-copy">
            <button
              type="button"
              onClick={handleOpenAuthorProfile}
              className="video-meta-user text-left transition hover:opacity-80"
            >
              @{media.authorUsername}
            </button>
            <div className="video-meta-caption-row">
              <button
                type="button"
                onClick={handleOpenPostDetail}
                className="video-meta-title cursor-pointer border-0 bg-transparent p-0 text-left transition hover:opacity-80"
              >
                {media.title}
              </button>
              <button
                type="button"
                onClick={handleOpenPostDetail}
                className="video-meta-more cursor-pointer border-0 bg-transparent p-0 transition hover:opacity-80"
              >
                Voir le post
              </button>
            </div>
          </div>
        </div>
      </article>

      <FeedVideoActionRail
        media={media}
        moreOpen={moreOpen}
        soundSlug={soundSlug}
        commentCountLabel={commentCountLabel}
        shareCountLabel={shareCountLabel}
        timeLikeCountLabel={timeLikeCountLabel}
        timeLikeTriggered={timeLikeState.triggered}
        timeLikeProgress={timeLikeProgress}
        timeLikeBurstVisible={timeLikeBurstVisible}
        timeLikeBurstTick={timeLikeBurstTick}
        isDislikePromptOpen={isDislikePromptOpen}
        activeMs={timeLikeState.activeMs}
        onOpenAuthorProfile={handleOpenAuthorProfile}
        onOpenComments={() => onOpenComments(media.id)}
        onOpenShare={() => onOpenShare(media.id)}
        onOpenTimeLike={() => onOpenTimeLike(media.id)}
        onOpenMore={() => onOpenMore(media.id)}
        onOpenSound={handleOpenSound}
        onOpenDislikePrompt={handleOpenDislikePrompt}
        onCloseDislikePrompt={handleCloseDislikePrompt}
        onCancelTimeLike={handleCancelTimeLike}
      />
    </section>
  );
}
