"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { AnimationItem } from "lottie-web";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Flag, MessageCircleMore, Play, Send, X } from "lucide-react";
import timeAnimationData from "../../public/feed-rail-animations/feed-time-icon.json";
import { DEFAULT_AVATAR, resolveProfileAvatarSrc } from "@/lib/profile-avatar";
import type { ClassicFeedCardItem } from "@/lib/posts";
import { persistTimeLike, removeTimeLike } from "@/lib/timelike-client";

type ClassicFeedViewProps = {
  onOpenComments: (videoId: number) => void;
  onOpenShare: (videoId: number) => void;
  onOpenTimeLike: (videoId: number) => void;
  onOpenMore: (videoId: number) => void;
  onOpenPost?: (postId: number) => void;
  trackingEnabled: boolean;
  onTimeLikeStateChange: (videoId: number, snapshot: ClassicTimeLikeSnapshot) => void;
  flatCards?: boolean;
  items: ClassicFeedCardItem[];
};

type ClassicMediaKind = "photo" | "video";

type ClassicTimeLikeRule = {
  minActiveMs: number;
  minProgress: number;
  mode: "time" | "or" | "and";
  segment: "photo" | "short" | "medium" | "long";
};

type ClassicTimeLikeSnapshot = {
  videoId: number;
  kind: ClassicMediaKind;
  author: string;
  title: string;
  count: number;
  triggered: boolean;
  activeMs: number;
  maxProgress: number;
  progressValue: number;
  rule: ClassicTimeLikeRule;
  durationSeconds: number;
};

type ClassicTimeLikeState = {
  activeMs: number;
  maxProgress: number;
  triggered: boolean;
  count: number;
  dismissed: boolean;
  persisting: boolean;
};

type ClassicBurstParticle = {
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

type ClassicLightboxState = {
  images: string[];
  index: number;
  title: string;
};

type ClassicCardLayout = {
  articleMaxWidthClassName: string;
  copyMaxWidthClassName: string;
  imageFrameMaxWidthClassName: string;
};

const classicTimeLikeBurstParticles: ClassicBurstParticle[] = [
  { id: 1, kind: "emoji", emoji: "\u2665", x: -22, y: -26, rotate: -16, delay: 0, size: 12 },
  { id: 2, kind: "emoji", emoji: "\u2665", x: -10, y: -34, rotate: -8, delay: 40, size: 10 },
  { id: 3, kind: "emoji", emoji: "\u2665", x: 8, y: -36, rotate: 8, delay: 80, size: 11 },
  { id: 4, kind: "emoji", emoji: "\u2665", x: 20, y: -24, rotate: 16, delay: 120, size: 12 },
  { id: 5, kind: "emoji", emoji: "\u2665", x: -18, y: -4, rotate: -22, delay: 160, size: 9 },
  { id: 6, kind: "emoji", emoji: "\u2665", x: 18, y: -6, rotate: 22, delay: 200, size: 9 },
  { id: 7, kind: "dot", x: -26, y: -14, rotate: -20, delay: 30, size: 5, from: "#70d5ff", to: "#3f86ff" },
  { id: 8, kind: "dot", x: 26, y: -16, rotate: 18, delay: 90, size: 5, from: "#ff8d74", to: "#ff5a93" },
];

function getClassicCardLayout(): ClassicCardLayout {
  return {
    articleMaxWidthClassName: "max-w-[468px]",
    copyMaxWidthClassName: "w-full",
    imageFrameMaxWidthClassName: "w-full",
  };
}

function parseDurationLabel(durationLabel: string) {
  const [minutesText, secondsText] = durationLabel.split(":");
  const minutes = Number(minutesText ?? 0);
  const seconds = Number(secondsText ?? 0);

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return 0;
  }

  return minutes * 60 + seconds;
}

function getTimeLikeRule(kind: ClassicMediaKind, durationSeconds: number): ClassicTimeLikeRule {
  if (kind === "photo") {
    return {
      minActiveMs: 7000,
      minProgress: 0,
      mode: "time",
      segment: "photo",
    };
  }

  if (durationSeconds <= 20) {
    return {
      minActiveMs: 8000,
      minProgress: 0.7,
      mode: "or",
      segment: "short",
    };
  }

  if (durationSeconds <= 60) {
    return {
      minActiveMs: 12000,
      minProgress: 0.5,
      mode: "and",
      segment: "medium",
    };
  }

  return {
    minActiveMs: 22000,
    minProgress: 0.25,
    mode: "and",
    segment: "long",
  };
}

function getTimeLikeProgress(rule: ClassicTimeLikeRule, activeMs: number, progress: number) {
  const timeProgress = rule.minActiveMs > 0 ? Math.min(activeMs / rule.minActiveMs, 1) : 1;
  const progressValue = rule.minProgress > 0 ? Math.min(progress / rule.minProgress, 1) : 1;

  if (rule.mode === "time") {
    return timeProgress;
  }

  if (rule.mode === "or") {
    return Math.max(timeProgress, progressValue);
  }

  return Math.min(timeProgress, progressValue);
}

function shouldTriggerTimeLike(rule: ClassicTimeLikeRule, activeMs: number, progress: number) {
  if (rule.mode === "time") {
    return activeMs >= rule.minActiveMs;
  }

  if (rule.mode === "or") {
    return activeMs >= rule.minActiveMs || progress >= rule.minProgress;
  }

  return activeMs >= rule.minActiveMs && progress >= rule.minProgress;
}

function TimeLikeIcon(props: SVGProps<SVGSVGElement>) {
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

function ClassicDislikeButton({
  active,
  pending,
  onClick,
}: {
  active: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <ClassicMetricButton
      icon={
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#f7f8fb] text-[#0f172a] transition group-hover:bg-[#eef2f7]">
          <Flag className="h-4 w-4" strokeWidth={2.1} />
        </span>
      }
      value={pending ? "..." : active ? "Retirer" : "Masquer"}
      label="Dislike"
      onClick={onClick}
    />
  );
}

function ClassicMetricButton({
  icon,
  value,
  label,
  onClick,
  children,
  className,
}: {
  icon?: ReactNode;
  value: string;
  label: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full min-w-0 items-center gap-1.5 rounded-[14px] bg-white/0 px-0 py-0.5 text-left transition hover:opacity-90 ${className ?? ""}`}
    >
      {children ?? icon}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold leading-4 text-[#0f172a]">{value}</span>
        <span className="text-[9px] leading-[1.2] text-[#8a93a2]">{label}</span>
      </span>
    </button>
  );
}

function ClassicTimeLikeButton({
  value,
  progress,
  active,
  burstVisible,
  burstKey,
  onClick,
}: {
  value: string;
  progress: number;
  active: boolean;
  burstVisible: boolean;
  burstKey: number;
  onClick: () => void;
}) {
  const lottieRef = useRef<HTMLSpanElement | null>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    let domLoadedHandler: (() => void) | null = null;

    const loadAnimation = async () => {
      const container = lottieRef.current;

      if (!container) {
        return;
      }

      const { default: lottie } = await import("lottie-web");

      if (!mounted || !lottieRef.current) {
        return;
      }

      const animation = lottie.loadAnimation({
        container: lottieRef.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: timeAnimationData,
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: true,
        },
      });

      domLoadedHandler = () => {
        if (!mounted) {
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
      mounted = false;
      setLoaded(false);

      if (animationRef.current && domLoadedHandler) {
        animationRef.current.removeEventListener("DOMLoaded", domLoadedHandler);
      }

      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!animationRef.current) {
      return;
    }

    if (burstVisible || active) {
      animationRef.current.goToAndPlay(0, true);
      return;
    }

    animationRef.current.goToAndStop(0, true);
  }, [active, burstVisible]);

  const handlePointerEnter = () => {
    animationRef.current?.goToAndPlay(0, true);
  };

  const handlePointerLeave = () => {
    if (!active) {
      animationRef.current?.goToAndStop(0, true);
    }
  };

  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <ClassicMetricButton
      value={value}
      label="TimeLikes"
      onClick={onClick}
      className={`feed-action-item-timelike ${active ? "feed-action-item-active" : ""}`}
    >
      <span
        className="feed-action-circle feed-action-circle-timelike relative flex items-center justify-center text-[#0f172a] transition-all duration-300"
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onFocus={handlePointerEnter}
        onBlur={handlePointerLeave}
        style={
          {
            "--rail-icon-hit": "36px",
            "--rail-surface": "#f7f8fb",
            "--rail-surface-border": "rgba(20, 25, 36, 0.06)",
            "--timelike-progress": `${clampedProgress}`,
          } as CSSProperties
        }
      >
        {active ? (
          <div className="feed-timelike-aura" aria-hidden>
            <span className="feed-timelike-heart feed-timelike-heart-left">{"\u2665"}</span>
            <span className="feed-timelike-heart feed-timelike-heart-mid">{"\u2665"}</span>
            <span className="feed-timelike-heart feed-timelike-heart-right">{"\u2665"}</span>
          </div>
        ) : null}
        {burstVisible ? (
          <div key={burstKey} className="feed-action-burst" aria-hidden>
            {classicTimeLikeBurstParticles.map((particle) => (
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
          <TimeLikeIcon className="feed-action-icon absolute left-1/2 top-1/2 z-10 block -translate-x-1/2 -translate-y-1/2" />
        ) : null}
        <span
          ref={lottieRef}
          className={`pointer-events-none absolute left-1/2 top-1/2 z-20 block -translate-x-1/2 -translate-y-1/2 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: "26px",
            height: "32px",
          }}
          aria-hidden
        />
      </span>
    </ClassicMetricButton>
  );
}

function ClassicMediaBlock({
  item,
  videoRef,
  onOpenImage,
  eagerMedia = false,
  imageFrameMaxWidthClassName = "w-full",
}: {
  item: ClassicFeedCardItem;
  videoRef?: { current: HTMLVideoElement | null };
  onOpenImage?: (images: string[], index: number, title: string) => void;
  eagerMedia?: boolean;
  imageFrameMaxWidthClassName?: string;
}) {
  if (item.variant === "letter") {
    return null;
  }

  if (item.media?.kind === "gallery" && item.media.gallery) {
    return (
      <div className="grid w-full grid-cols-3 gap-1.5 bg-white">
        {item.media.gallery.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => onOpenImage?.(item.media!.gallery!, index, item.title)}
            className="relative aspect-[4/5] overflow-hidden rounded-[5px] bg-white text-left transition hover:opacity-95"
          >
            <Image
              src={src}
              alt={`${item.title} ${index + 1}`}
              fill
              sizes="230px"
              className="object-cover"
              loading={eagerMedia ? "eager" : undefined}
            />
          </button>
        ))}
      </div>
    );
  }

  if (item.media?.kind === "video" && item.media.src) {
    return (
      <div className="w-full overflow-hidden rounded-[5px] bg-[#030712]">
        <div className="relative aspect-[16/9] bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={item.media.poster}
            src={item.media.src}
            className="h-full w-full bg-black object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(180deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.62)_100%)]" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-md">
            <Play className="h-3.5 w-3.5 fill-white text-white" strokeWidth={2.1} />
            Lecture contextuelle
          </div>
          <div className="absolute bottom-4 left-4 max-w-[280px] rounded-[16px] bg-white/12 px-3 py-2 text-[11px] leading-5 text-white backdrop-blur-md">
            Cette video vit mieux ici parce que le contexte est lu avant la lecture.
          </div>
        </div>
      </div>
    );
  }

  if (item.media?.kind === "image" && item.media.src) {
    return (
      <button
        type="button"
        onClick={() => onOpenImage?.([item.media!.src!], 0, item.title)}
        className="block w-full text-left transition hover:opacity-95"
      >
        <div className={`${imageFrameMaxWidthClassName} overflow-hidden rounded-[5px]`}>
          {/* Single-image posts fill the full feed column width up to 468px. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.media.src}
            alt={item.title}
            loading={eagerMedia ? "eager" : "lazy"}
            className="block h-auto w-full"
          />
        </div>
      </button>
    );
  }

  return null;
}

function ClassicFeedCard({
  item,
  onOpenComments,
  onOpenShare,
  onOpenTimeLike,
  onOpenMore,
  onOpenPost,
  onOpenImage,
  trackingEnabled,
  onTimeLikeStateChange,
  flatCards = false,
  eagerMedia = false,
}: {
  item: ClassicFeedCardItem;
  onOpenComments: (videoId: number) => void;
  onOpenShare: (videoId: number) => void;
  onOpenTimeLike: (videoId: number) => void;
  onOpenMore: (videoId: number) => void;
  onOpenPost?: (postId: number) => void;
  onOpenImage: (images: string[], index: number, title: string) => void;
  trackingEnabled: boolean;
  onTimeLikeStateChange: (videoId: number, snapshot: ClassicTimeLikeSnapshot) => void;
  flatCards?: boolean;
  eagerMedia?: boolean;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reportTimeLikeStateChange = useEffectEvent((snapshot: ClassicTimeLikeSnapshot) => {
    onTimeLikeStateChange(item.videoId, snapshot);
  });
  const timeLikeBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeLikeBurstVisible, setTimeLikeBurstVisible] = useState(false);
  const [timeLikeBurstTick, setTimeLikeBurstTick] = useState(0);
  const [isDislikePromptOpen, setIsDislikePromptOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [resolvedDurationSeconds, setResolvedDurationSeconds] = useState(() => parseDurationLabel(item.duration));
  const baseTimeLikeCount = Number(item.timelikeCount.replace(/\s+/g, ""));
  const mediaKind: ClassicMediaKind = item.media?.kind === "video" ? "video" : "photo";
  const [timeLikeState, setTimeLikeState] = useState<ClassicTimeLikeState>(() => ({
    activeMs: item.viewerTimeLikeActiveMs ?? 0,
    maxProgress: item.viewerTimeLikeMaxProgress ?? 0,
    triggered: item.viewerHasTimeLike,
    count: baseTimeLikeCount,
    dismissed: false,
    persisting: false,
  }));
  const timeLikeRule = useMemo(
    () => getTimeLikeRule(mediaKind, resolvedDurationSeconds),
    [mediaKind, resolvedDurationSeconds],
  );
  const timeLikeProgress = timeLikeState.triggered
    ? 1
    : getTimeLikeProgress(timeLikeRule, timeLikeState.activeMs, timeLikeState.maxProgress);
  const authorUsername = (item.authorUsername ?? item.handle.replace(/^@/, "")).trim();
  const canOpenAuthorProfile = authorUsername.length > 0;
  const avatarSrc = resolveProfileAvatarSrc(item.avatar, DEFAULT_AVATAR);
  const cardLayout = getClassicCardLayout();
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const hasMedia = Boolean(item.media);
  const hasBody = item.body.trim().length > 0;
  const canExpandBody = hasMedia && item.body.trim().length > 10;
  const canOpenPost = typeof onOpenPost === "function";

  useEffect(() => {
    return () => {
      if (timeLikeBurstTimerRef.current) {
        clearTimeout(timeLikeBurstTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = cardRef.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.62);
      },
      {
        threshold: [0.25, 0.45, 0.62, 0.8],
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || mediaKind !== "video") {
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
  }, [item.media?.src, mediaKind]);

  useEffect(() => {
    reportTimeLikeStateChange({
      videoId: item.videoId,
      kind: mediaKind,
      author: item.handle.replace(/^@/, ""),
      title: item.title,
      count: timeLikeState.count,
      triggered: timeLikeState.triggered,
      activeMs: timeLikeState.activeMs,
      maxProgress: timeLikeState.maxProgress,
      progressValue: timeLikeProgress,
      rule: timeLikeRule,
      durationSeconds: resolvedDurationSeconds,
    });
  }, [
    item.handle,
    item.title,
    item.videoId,
    mediaKind,
    resolvedDurationSeconds,
    timeLikeProgress,
    timeLikeRule,
    timeLikeState.activeMs,
    timeLikeState.count,
    timeLikeState.dismissed,
    timeLikeState.maxProgress,
    timeLikeState.persisting,
    timeLikeState.triggered,
  ]);

  const commitTimeLike = useCallback(
    async (activeMs: number, maxProgress: number) => {
      try {
        const response = await persistTimeLike({
          postId: item.videoId,
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

        if (timeLikeBurstTimerRef.current) {
          clearTimeout(timeLikeBurstTimerRef.current);
        }

        setTimeLikeBurstTick((current) => current + 1);
        setTimeLikeBurstVisible(true);
        timeLikeBurstTimerRef.current = setTimeout(() => {
          setTimeLikeBurstVisible(false);
        }, 980);
      } catch {
        setTimeLikeState((current) => ({
          ...current,
          persisting: false,
        }));
      }
    },
    [item.videoId],
  );

  useEffect(() => {
    if (
      !trackingEnabled ||
      !isVisible ||
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
      const canAccumulate =
        mediaKind === "photo" ? true : Boolean(video && !video.paused && !video.ended);

      if (!canAccumulate) {
        return;
      }

      const durationSeconds =
        mediaKind === "video" && video && Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : resolvedDurationSeconds;
      const currentProgress =
        mediaKind === "video" && video && durationSeconds > 0
          ? Math.min(1, video.currentTime / durationSeconds)
          : 0;

      let nextPersistActiveMs: number | null = null;
      let nextPersistMaxProgress: number | null = null;

      setTimeLikeState((current) => {
        if (current.triggered || current.dismissed || current.persisting) {
          return current;
        }

        const nextActiveMs = current.activeMs + delta;
        const nextMaxProgress = Math.max(current.maxProgress, currentProgress);
        const rule = getTimeLikeRule(mediaKind, durationSeconds);

        if (!shouldTriggerTimeLike(rule, nextActiveMs, nextMaxProgress)) {
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
    isVisible,
    mediaKind,
    resolvedDurationSeconds,
    isDislikePromptOpen,
    commitTimeLike,
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

  const handleCancelTimeLike = useCallback(async () => {
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

    try {
      const response = await removeTimeLike(item.videoId);
      setTimeLikeState({
        activeMs: 0,
        maxProgress: 0,
        triggered: false,
        count: response.totalCount,
        dismissed: true,
        persisting: false,
      });
    } catch {
      setTimeLikeState((current) => ({
        ...current,
        persisting: false,
      }));
    } finally {
      setIsDislikePromptOpen(false);
    }
  }, [item.videoId, timeLikeState.triggered]);

  const handleOpenAuthorProfile = () => {
    if (!canOpenAuthorProfile) {
      return;
    }

    router.push(`/u/${encodeURIComponent(authorUsername)}`);
  };
  const handleOpenPost = () => {
    onOpenPost?.(item.id);
  };

  return (
    <article
      ref={cardRef}
      className={`mx-auto w-full ${cardLayout.articleMaxWidthClassName} overflow-visible bg-white ${
        flatCards ? "shadow-none" : "shadow-none"
      }`}
    >
      <div className="pb-2 pt-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenAuthorProfile}
            disabled={!canOpenAuthorProfile}
            className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:opacity-85 disabled:cursor-default disabled:hover:opacity-100"
          >
            <div className="relative h-9 w-9 overflow-hidden rounded-full ring-1 ring-black/6">
              <Image src={avatarSrc} alt={item.author} fill sizes="36px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-[13px] font-semibold leading-5 text-[#111827]">{item.author}</p>
              </div>
              <p className="text-[10px] leading-4 text-[#8792a3]">
                <span className="text-[#475569]">{item.handle}</span>
                {" - "}
                <span>{item.timestamp}</span>
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onOpenMore(item.videoId)}
            className="rounded-full px-1 py-1 text-[10px] font-semibold tracking-[0.01em] text-[#94a3b8] transition hover:text-[#334155]"
          >
            Plus
          </button>
        </div>
      </div>

      <div className="pb-3 pt-0">
        <div className={cardLayout.copyMaxWidthClassName}>
          {canOpenPost ? (
            <button
              type="button"
              onClick={handleOpenPost}
              className={`mt-1.5 text-left text-[#111827] transition hover:opacity-80 ${
                item.variant === "letter"
                  ? "text-[26px] font-medium leading-[1.04] tracking-[-0.04em]"
                  : hasMedia
                    ? "text-[17px] font-medium leading-[1.14] tracking-[-0.03em]"
                    : "text-[18px] font-medium leading-[1.18] tracking-[-0.02em]"
              }`}
            >
              {item.title}
            </button>
          ) : (
            <h3
              className={`mt-1.5 text-[#111827] ${
                item.variant === "letter"
                  ? "text-[26px] font-medium leading-[1.04] tracking-[-0.04em]"
                  : hasMedia
                    ? "text-[17px] font-medium leading-[1.14] tracking-[-0.03em]"
                    : "text-[18px] font-medium leading-[1.18] tracking-[-0.02em]"
              }`}
            >
              {item.title}
            </h3>
          )}
          {!hasMedia && hasBody ? <p className="mt-2 text-[14px] leading-7 text-[#111827]">{item.body}</p> : null}
        </div>
      </div>

      {item.media ? (
        <ClassicMediaBlock
          item={item}
          videoRef={videoRef}
          onOpenImage={onOpenImage}
          eagerMedia={eagerMedia}
          imageFrameMaxWidthClassName={cardLayout.imageFrameMaxWidthClassName}
        />
      ) : null}

      <div className="pb-0 pt-4">
        <div className="grid w-full grid-cols-4 gap-2.5">
          <ClassicTimeLikeButton
            value={new Intl.NumberFormat("fr-FR").format(timeLikeState.count)}
            progress={timeLikeProgress}
            active={timeLikeState.triggered}
            burstVisible={timeLikeBurstVisible}
            burstKey={timeLikeBurstTick}
            onClick={() => onOpenTimeLike(item.videoId)}
          />
          <ClassicMetricButton
            icon={
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#f7f8fb] text-[#0f172a] transition group-hover:bg-[#eef2f7]">
                <MessageCircleMore className="h-4 w-4" strokeWidth={2.1} />
              </span>
            }
            value={item.commentCount}
            label="Commentaires"
            onClick={() => onOpenComments(item.videoId)}
          />
          <ClassicMetricButton
            icon={
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#f7f8fb] text-[#0f172a] transition group-hover:bg-[#eef2f7]">
                <Send className="h-4 w-4" strokeWidth={2.1} />
              </span>
            }
            value={item.shareCount}
            label="Partages"
            onClick={() => onOpenShare(item.videoId)}
          />
          <div className="relative">
            <ClassicDislikeButton
              active={timeLikeState.triggered || timeLikeState.activeMs > 0}
              pending={timeLikeState.persisting}
              onClick={handleOpenDislikePrompt}
            />
            {isDislikePromptOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[250px] rounded-[18px] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.08]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8ea2bc]">
                  {timeLikeState.triggered ? "TimeLike actif" : "Session en cours"}
                </p>
                <p className="mt-2 text-[14px] font-semibold leading-6 text-[#101522]">
                  {timeLikeState.triggered
                    ? "Retirer ce TimeLike et stopper le signal auto sur ce post ?"
                    : "Ce post ne vous interesse pas ? On peut stopper le TimeLike automatique sur cette session."}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[#667085]">
                  {timeLikeState.triggered
                    ? "Le compteur sera remis a jour cote serveur."
                    : `${Math.floor(timeLikeState.activeMs / 1000)}s d'attention detectees pour l'instant sur ce post.`}
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseDislikePrompt}
                    className="rounded-full bg-[#f4f6fa] px-4 py-2 text-[13px] font-semibold text-[#101522] transition hover:bg-[#e9eef7]"
                  >
                    Non
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleCancelTimeLike();
                    }}
                    className="rounded-full bg-[#101522] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#1b2433]"
                  >
                    Oui
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {hasMedia && hasBody ? (
        <div className="pb-1 pt-5">
          <div className={cardLayout.copyMaxWidthClassName}>
            <p
              className={`text-[13px] leading-6 text-[#111827] ${
                bodyExpanded ? "" : "line-clamp-2"
              }`}
            >
              {item.body}
            </p>
            {canExpandBody ? (
              <button
                type="button"
                onClick={() => setBodyExpanded((current) => !current)}
                className="mt-1.5 text-[13px] font-semibold text-[#111827]"
              >
                {bodyExpanded ? "Lire moins" : "Lire tout"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ClassicImageLightbox({
  state,
  onClose,
  onPrevious,
  onNext,
}: {
  state: ClassicLightboxState | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    if (!state) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && state.images.length > 1) {
        onPrevious();
      }

      if (event.key === "ArrowRight" && state.images.length > 1) {
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onNext, onPrevious, state]);

  if (!state || typeof document === "undefined") {
    return null;
  }

  const currentImage = state.images[state.index];

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/96">
      <button
        type="button"
        aria-label="Fermer l'image"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute left-8 top-8 z-[241] flex items-center gap-3 text-white">
        <p className="text-[15px] font-semibold">{state.title}</p>
        {state.images.length > 1 ? (
          <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[12px] text-white/74">
            {state.index + 1} / {state.images.length}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute right-8 top-8 z-[244] flex h-12 w-12 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition hover:bg-white/14"
      >
        <X className="h-5 w-5" strokeWidth={2.1} />
      </button>

      {state.images.length > 1 ? (
        <>
          <button
            type="button"
                aria-label="Image precedente"
            onClick={onPrevious}
            className="absolute left-8 top-1/2 z-[244] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition hover:bg-white/14"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.1} />
          </button>
          <button
            type="button"
            aria-label="Image suivante"
            onClick={onNext}
            className="absolute right-8 top-1/2 z-[244] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition hover:bg-white/14"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.1} />
          </button>
        </>
      ) : null}

      <div className="pointer-events-none relative z-[241] mx-auto flex h-screen w-screen items-center justify-center px-10 py-10">
        <div className="relative h-full w-full">
          <Image
            src={currentImage}
            alt={state.title}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ClassicFeedView({
  onOpenComments,
  onOpenShare,
  onOpenTimeLike,
  onOpenMore,
  onOpenPost,
  trackingEnabled,
  onTimeLikeStateChange,
  flatCards = false,
  items,
}: ClassicFeedViewProps) {
  return (
    <section className="absolute left-1/2 top-[265px] w-[760px] -translate-x-1/2">
      <ClassicFeedStream
        onOpenComments={onOpenComments}
        onOpenShare={onOpenShare}
        onOpenTimeLike={onOpenTimeLike}
        onOpenMore={onOpenMore}
        onOpenPost={onOpenPost}
        trackingEnabled={trackingEnabled}
        onTimeLikeStateChange={onTimeLikeStateChange}
        flatCards={flatCards}
        items={items}
        className="space-y-6"
      />
    </section>
  );
}

export function ClassicFeedStream({
  onOpenComments,
  onOpenShare,
  onOpenTimeLike,
  onOpenMore,
  onOpenPost,
  trackingEnabled,
  onTimeLikeStateChange,
  flatCards = false,
  items,
  className = "space-y-6",
}: ClassicFeedViewProps & { className?: string }) {
  const [lightboxState, setLightboxState] = useState<ClassicLightboxState | null>(null);
  const resolvedItems = items;
  const firstMediaIndex = resolvedItems.findIndex((item) => Boolean(item.media));

  const handleOpenImage = (images: string[], index: number, title: string) => {
    setLightboxState({ images, index, title });
  };

  const handleCloseImage = () => {
    setLightboxState(null);
  };

  const handlePreviousImage = () => {
    setLightboxState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        index: (current.index - 1 + current.images.length) % current.images.length,
      };
    });
  };

  const handleNextImage = () => {
    setLightboxState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        index: (current.index + 1) % current.images.length,
      };
    });
  };

  const resolvedStreamClassName = `mx-auto w-full max-w-[468px] ${className}`;

  return (
    <>
      <div className={resolvedStreamClassName}>
        {resolvedItems.map((item, index) => (
          <ClassicFeedCard
            key={item.id}
            item={item}
            onOpenComments={onOpenComments}
            onOpenShare={onOpenShare}
            onOpenTimeLike={onOpenTimeLike}
            onOpenMore={onOpenMore}
            onOpenPost={onOpenPost}
            onOpenImage={handleOpenImage}
            trackingEnabled={trackingEnabled}
            onTimeLikeStateChange={onTimeLikeStateChange}
            flatCards={flatCards}
            eagerMedia={index === firstMediaIndex}
          />
        ))}
      </div>

      <ClassicImageLightbox
        state={lightboxState}
        onClose={handleCloseImage}
        onPrevious={handlePreviousImage}
        onNext={handleNextImage}
      />
    </>
  );
}
