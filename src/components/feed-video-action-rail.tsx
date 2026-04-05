"use client";

import { type ComponentType, type CSSProperties, useEffect, useRef, useState, type SVGProps } from "react";
import type { AnimationItem } from "lottie-web";
import Image from "next/image";
import { Disc3, Ellipsis, Plus } from "lucide-react";
import commentAnimationData from "../../public/feed-rail-animations/feed-comment-icon.json";
import shareAnimationData from "../../public/feed-rail-animations/feed-share-icon.json";
import timeAnimationData from "../../public/feed-rail-animations/feed-time-icon.json";
import { type FeedMediaItem } from "@/lib/posts";

type ActionItem = {
  id: string;
  value?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  animationData?: Record<string, unknown>;
  animationFrame?: {
    width: number;
    height: number;
    offsetY?: number;
  };
};

type BurstParticle = {
  id: number;
  kind: "emoji" | "dot";
  x: number;
  y: number;
  rotate: number;
  delay: number;
  size: number;
  emoji?: string;
  from?: string;
  to?: string;
};

function CommentRailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 3C17.02 3 21 6.77 21 11.5C21 16.23 17.02 20 12 20C10.54 20 9.16 19.68 7.93 19.08L4 20L5.06 16.82C4.39 15.37 4 13.73 4 11.95C4 7.02 7.84 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.65" cy="11.5" r="1.05" fill="currentColor" />
      <circle cx="12" cy="11.5" r="1.05" fill="currentColor" />
      <circle cx="15.35" cy="11.5" r="1.05" fill="currentColor" />
    </svg>
  );
}

function ShareRailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M11 20V15.4H9.7C6.42 15.4 4.12 17.01 3 20C3 14.08 5.88 10.1 11 10.1V5L21 12.5L11 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagRailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M3 4.5396L8 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.26476 5.50389C7.49995 6.03106 11.2709 1.53105 17.5 2.03105C18.7709 4.03105 18.4999 6.03106 17.9999 8.03106C19.9999 9.03106 20.9999 10.0311 21.4999 12.0311C15.4999 12.5311 12.4999 17.0311 5.99995 15.0311"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.9165 7.33733L9.76022 8.38648M9.36294 6.94005L8.31379 8.78377"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2201 5.88062L15.0638 6.92977M14.6665 5.48334L13.6174 7.32705"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.2051 11.8939L10.5611 11.5211C11.5813 10.4527 13.1073 10.0336 14.5301 10.431L15.0266 10.5696"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveRailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="13" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 13V10.45M12 13L13.8 14.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.25 3.9H14.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.25 5.45L17.6 4.15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const actionItems: ActionItem[] = [
  {
    id: "comments",
    icon: CommentRailIcon,
    animationData: commentAnimationData,
    animationFrame: {
      width: 30,
      height: 30,
    },
  },
  {
    id: "shares",
    icon: ShareRailIcon,
    animationData: shareAnimationData,
    animationFrame: {
      width: 26,
      height: 26,
    },
  },
  {
    id: "dislike",
    value: "Dislike",
    icon: FlagRailIcon,
  },
  {
    id: "save",
    icon: SaveRailIcon,
    animationData: timeAnimationData,
    animationFrame: {
      width: 30,
      height: 36,
      offsetY: 0,
    },
  },
];

const primaryActionItems = actionItems.filter((item) => item.id !== "dislike");
const dislikeActionItem = actionItems.find((item) => item.id === "dislike")!;

const saveHeartBurstParticles: BurstParticle[] = [
  { id: 1, kind: "emoji", emoji: "\u2665", x: -22, y: -26, rotate: -16, delay: 0, size: 12 },
  { id: 2, kind: "emoji", emoji: "\u2665", x: -10, y: -34, rotate: -8, delay: 40, size: 10 },
  { id: 3, kind: "emoji", emoji: "\u2665", x: 8, y: -36, rotate: 8, delay: 80, size: 11 },
  { id: 4, kind: "emoji", emoji: "\u2665", x: 20, y: -24, rotate: 16, delay: 120, size: 12 },
  { id: 5, kind: "emoji", emoji: "\u2665", x: -18, y: -4, rotate: -22, delay: 160, size: 9 },
  { id: 6, kind: "emoji", emoji: "\u2665", x: 18, y: -6, rotate: 22, delay: 200, size: 9 },
  { id: 7, kind: "dot", x: -26, y: -14, rotate: -20, delay: 30, size: 5, from: "#ffd3eb", to: "#ff71ab" },
  { id: 8, kind: "dot", x: 26, y: -16, rotate: 18, delay: 90, size: 5, from: "#ffd7ed", to: "#ff5f9d" },
];

function PostAction({
  item,
  onClick,
  value,
  active = false,
  progress = 0,
  burstVisible = false,
  burstKey = 0,
}: {
  item: ActionItem;
  onClick?: () => void;
  value?: string;
  active?: boolean;
  progress?: number;
  burstVisible?: boolean;
  burstKey?: number;
}) {
  const Icon = item.icon;
  const lottieRef = useRef<HTMLSpanElement | null>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const isTimeLike = item.id === "save";

  useEffect(() => {
    if (!item.animationData) {
      setLoaded(false);
      return;
    }

    setLoaded(false);

    let active = true;
    let domLoadedHandler: (() => void) | null = null;

    const loadAnimation = async () => {
      if (!lottieRef.current) {
        return;
      }

      const { default: lottie } = await import("lottie-web");

      if (!active || !lottieRef.current) {
        return;
      }

      const animation = lottie.loadAnimation({
        container: lottieRef.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: item.animationData,
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: true,
        },
      });

      domLoadedHandler = () => {
        if (!active) {
          return;
        }

        const svg = lottieRef.current?.querySelector("svg");

        if (svg) {
          svg.setAttribute("width", "100%");
          svg.setAttribute("height", "100%");
          svg.style.width = "100%";
          svg.style.height = "100%";
          svg.style.display = "block";
        }

        animation.goToAndStop(0, true);
        setLoaded(true);
      };

      animation.addEventListener("DOMLoaded", domLoadedHandler);
      animationRef.current = animation;
    };

    void loadAnimation();

    return () => {
      active = false;
      setLoaded(false);

      if (animationRef.current && domLoadedHandler) {
        animationRef.current.removeEventListener("DOMLoaded", domLoadedHandler);
      }

      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, [item.animationData]);

  const handlePointerEnter = () => {
    animationRef.current?.goToAndPlay(0, true);
  };

  const handlePointerLeave = () => {
    animationRef.current?.goToAndStop(0, true);
  };

  const animationFrame = item.animationFrame ?? {
    width: 28,
    height: 28,
    offsetY: 0,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onFocus={handlePointerEnter}
      onBlur={handlePointerLeave}
      className={`feed-action-item feed-action-item-${item.id} group relative cursor-pointer ${
        isTimeLike ? "feed-action-item-timelike" : ""
      } ${active ? "feed-action-item-active" : ""}`}
    >
      <div
        className={`feed-action-circle relative transition-all duration-300 ${
          isTimeLike ? "feed-action-circle-timelike" : ""
        }`}
        style={
          isTimeLike
            ? ({
                "--timelike-progress": `${Math.max(0, Math.min(1, progress))}`,
              } as CSSProperties)
            : undefined
        }
      >
        {isTimeLike && active ? (
          <div className="feed-timelike-aura" aria-hidden>
            <span className="feed-timelike-heart feed-timelike-heart-left">{"\u2665"}</span>
            <span className="feed-timelike-heart feed-timelike-heart-mid">{"\u2665"}</span>
            <span className="feed-timelike-heart feed-timelike-heart-right">{"\u2665"}</span>
          </div>
        ) : null}
        {isTimeLike && burstVisible ? (
          <div key={burstKey} className="feed-action-burst" aria-hidden>
            {saveHeartBurstParticles.map((particle) => (
              <span
                key={particle.id}
                className={`feed-action-burst-particle ${
                  particle.kind === "emoji" ? "feed-action-burst-heart" : "feed-action-burst-dot"
                }`}
                style={
                  {
                    "--burst-x": `${particle.x}px`,
                    "--burst-y": `${particle.y}px`,
                    "--burst-rot": `${particle.rotate}deg`,
                    "--burst-delay": `${particle.delay}ms`,
                    "--burst-size": `${particle.size}px`,
                    "--burst-from": particle.from ?? "#ffd4e5",
                    "--burst-to": particle.to ?? "#ff5b98",
                  } as CSSProperties
                }
              >
                {particle.kind === "emoji" ? particle.emoji : ""}
              </span>
            ))}
          </div>
        ) : null}
        {!loaded ? (
          <Icon className="feed-action-icon absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2" />
        ) : null}
        {item.animationData ? (
          <span
            ref={lottieRef}
            className={`feed-action-lottie feed-action-lottie-${item.id} pointer-events-none absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              width: `${animationFrame.width}px`,
              height: `${animationFrame.height}px`,
              marginTop: `${animationFrame.offsetY ?? 0}px`,
            }}
            aria-hidden
          />
        ) : null}
      </div>
      <p className="feed-action-label text-center transition-colors duration-300">{value ?? item.value}</p>
    </button>
  );
}

export function FeedVideoActionRail({
  media,
  moreOpen,
  soundSlug,
  commentCountLabel,
  shareCountLabel,
  timeLikeCountLabel,
  timeLikeTriggered,
  timeLikeProgress,
  timeLikeBurstVisible,
  timeLikeBurstTick,
  isDislikePromptOpen,
  activeMs,
  onOpenAuthorProfile,
  onOpenComments,
  onOpenShare,
  onOpenTimeLike,
  onOpenMore,
  onOpenSound,
  onOpenDislikePrompt,
  onCloseDislikePrompt,
  onCancelTimeLike,
}: {
  media: FeedMediaItem;
  moreOpen: boolean;
  soundSlug: string;
  commentCountLabel: string;
  shareCountLabel: string;
  timeLikeCountLabel: string;
  timeLikeTriggered: boolean;
  timeLikeProgress: number;
  timeLikeBurstVisible: boolean;
  timeLikeBurstTick: number;
  isDislikePromptOpen: boolean;
  activeMs: number;
  onOpenAuthorProfile: () => void;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onOpenTimeLike: () => void;
  onOpenMore: () => void;
  onOpenSound: () => void;
  onOpenDislikePrompt: () => void;
  onCloseDislikePrompt: () => void;
  onCancelTimeLike: () => void;
}) {
  return (
    <aside className="post-rail absolute" aria-label="Video actions">
      <div className="post-rail-main">
        <button
          type="button"
          aria-label={`Voir le profil de ${media.authorDisplayName}`}
          onClick={onOpenAuthorProfile}
          className="post-follow cursor-pointer border-0 bg-transparent p-0 text-left"
        >
          <span className="relative block h-[50px] w-[50px] overflow-hidden rounded-full ring-1 ring-white/35 shadow-[0_10px_20px_rgba(0,0,0,0.22)]">
            <Image src={media.authorAvatar} alt={media.authorDisplayName} fill sizes="50px" className="object-cover" />
          </span>
          <span className="mt-2 block w-full text-center text-[11px] font-semibold leading-[1.15] text-white/94">
            @{media.authorUsername}
          </span>
        </button>

        <div className="post-actions">
          {primaryActionItems.map((item) => (
            <PostAction
              key={item.id}
              item={item}
              onClick={
                item.id === "comments" ? onOpenComments : item.id === "shares" ? onOpenShare : item.id === "save" ? onOpenTimeLike : undefined
              }
              value={
                item.id === "comments"
                  ? commentCountLabel
                  : item.id === "shares"
                    ? shareCountLabel
                    : item.id === "save"
                      ? timeLikeCountLabel
                      : undefined
              }
              active={item.id === "save" ? timeLikeTriggered : false}
              progress={item.id === "save" ? timeLikeProgress : 0}
              burstVisible={item.id === "save" ? timeLikeBurstVisible : false}
              burstKey={item.id === "save" ? timeLikeBurstTick : 0}
            />
          ))}

          <div className="feed-action-slot-dislike relative">
            <PostAction item={dislikeActionItem} onClick={onOpenDislikePrompt} />

            {isDislikePromptOpen ? (
              <div className="timelike-cancel-popover" role="dialog" aria-label="Retirer le TimeLike">
                <p className="timelike-cancel-kicker">{timeLikeTriggered ? "TimeLike actif" : "Signal en cours"}</p>
                <p className="timelike-cancel-title">Voulez-vous retirer ce TimeLike ?</p>
                <p className="timelike-cancel-meta">
                  {timeLikeTriggered
                    ? "Le signal automatique sera retire de ce post."
                    : `${Math.floor(activeMs / 1000)}s d attention detectees. Le TimeLike automatique ne sera pas applique pour cette lecture.`}
                </p>
                <div className="timelike-cancel-actions">
                  <button
                    type="button"
                    className="timelike-cancel-btn timelike-cancel-btn-secondary"
                    onClick={onCloseDislikePrompt}
                  >
                    Non
                  </button>
                  <button
                    type="button"
                    className="timelike-cancel-btn timelike-cancel-btn-primary"
                    onClick={onCancelTimeLike}
                  >
                    Oui
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="post-secondary-actions">
        <button
          type="button"
          aria-label="More actions"
          className={`hover-lift post-more relative ${moreOpen ? "post-more-active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenMore();
          }}
        >
          <Ellipsis className="post-more-icon" strokeWidth={2.2} />
        </button>

        <button
          type="button"
          aria-label="Use this sound"
          onClick={onOpenSound}
          className="hover-lift post-music relative"
          data-sound-slug={soundSlug}
        >
          <span className="post-music-surface" />
          <Disc3 className="post-music-icon" strokeWidth={2.1} />
          <span className="post-music-plus">
            <Plus className="post-music-plus-icon" strokeWidth={2.4} />
          </span>
        </button>
      </div>
    </aside>
  );
}
