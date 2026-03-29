"use client";

import Image from "next/image";
import type { AnimationItem } from "lottie-web";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type SVGProps } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, MessageCircleMore, Play, Send, X } from "lucide-react";
import timeAnimationData from "../../public/feed-rail-animations/feed-time-icon.json";

type ClassicFeedViewProps = {
  onOpenComments: (videoId: number) => void;
  onOpenShare: (videoId: number) => void;
  onOpenTimeLike: (videoId: number) => void;
  onOpenMore: (videoId: number) => void;
  trackingEnabled: boolean;
  onTimeLikeStateChange: (videoId: number, snapshot: ClassicTimeLikeSnapshot) => void;
  flatCards?: boolean;
};

type ClassicFeedItem = {
  id: number;
  videoId: number;
  variant: "letter" | "gallery" | "video" | "note";
  author: string;
  handle: string;
  avatar: string;
  timestamp: string;
  eyebrow: string;
  title: string;
  body: string;
  duration: string;
  timelikeCount: string;
  commentCount: string;
  shareCount: string;
  media?: {
    kind: "image" | "video" | "gallery";
    src?: string;
    poster?: string;
    gallery?: string[];
  };
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

const classicFeedItems: ClassicFeedItem[] = [
  {
    id: 1,
    videoId: 101,
    variant: "letter",
    author: "Axel Belujon",
    handle: "@axelbelujon",
    avatar: "/figma-assets/avatar-post.png",
    timestamp: "il y a 18 min",
    eyebrow: "Lettre ouverte",
    title: "Un feed classique qui donne envie de rester, pas juste de scroller.",
    body:
      "On veut un espace plus calme pour raconter des idees, poster une lettre, montrer un projet en photos, glisser une video et laisser le TimeLike lire l'attention reelle au lieu de compter les reflexes.",
    duration: "0:12",
    timelikeCount: "1 284",
    commentCount: "126",
    shareCount: "48",
  },
  {
    id: 2,
    videoId: 102,
    variant: "gallery",
    author: "Pictomag News",
    handle: "@pictomag.news",
    avatar: "/figma-assets/avatar-user.png",
    timestamp: "il y a 42 min",
    eyebrow: "Serie photo",
    title: "Moodboard editorial du jour",
    body:
      "Un carrousel plus premium qu'une simple mosaique: grand visuel, details rapproches et caption concise.",
    duration: "0:12",
    timelikeCount: "962",
    commentCount: "84",
    shareCount: "31",
    media: {
      kind: "gallery",
      gallery: [
        "/figma-assets/photo-feed/photo-grid-1.jpg",
        "/figma-assets/photo-feed/photo-grid-2.jpg",
        "/figma-assets/photo-feed/photo-grid-3.jpg",
      ],
    },
  },
  {
    id: 3,
    videoId: 103,
    variant: "video",
    author: "World of TCGP",
    handle: "@world.of.tcgp",
    avatar: "/figma-assets/avatar-post.png",
    timestamp: "il y a 1 h",
    eyebrow: "Video",
    title: "Chromecast motion cut",
    body:
      "Le format classique permet de contextualiser une video avec une intro, une note et un vrai espace de discussion juste dessous.",
    duration: "1:18",
    timelikeCount: "2 105",
    commentCount: "214",
    shareCount: "76",
    media: {
      kind: "video",
      src: "https://pictomag-news-1.vercel.app/video/feed-video-3.mp4",
      poster: "/figma-assets/photo-feed/photo-grid-4.jpg",
    },
  },
  {
    id: 4,
    videoId: 104,
    variant: "note",
    author: "Studio Heat",
    handle: "@studio.heat",
    avatar: "/figma-assets/avatar-story.png",
    timestamp: "il y a 2 h",
    eyebrow: "Note rapide",
    title: "Le TimeLike devient le vrai signal social.",
    body:
      "Un post peut vivre par le texte, une image seule, une galerie ou une video. Le classement vient du temps d'attention offert, pas d'un concours de taps.",
    duration: "0:10",
    timelikeCount: "845",
    commentCount: "59",
    shareCount: "19",
    media: {
      kind: "image",
      src: "/figma-assets/photo-feed/photo-grid-7.jpg",
    },
  },
];

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

function DislikeFlagIcon(props: SVGProps<SVGSVGElement>) {
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
      className={`group relative flex items-center gap-2.5 rounded-full border border-black/8 bg-white px-3 py-1.5 text-left transition hover:-translate-y-[1px] hover:border-black/12 hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)] ${className ?? ""}`}
    >
      {children ?? icon}
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold leading-4 text-[#0f172a]">{value}</span>
        <span className="text-[10px] leading-4 text-[#7c8798]">{label}</span>
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
            "--rail-icon-hit": "40px",
            "--rail-surface": "#f3f4f6",
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

function ClassicDislikeButton({
  open,
  triggered,
  activeMs,
  onOpen,
  onClose,
  onConfirm,
}: {
  open: boolean;
  triggered: boolean;
  activeMs: number;
  onOpen: () => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="relative">
      <ClassicMetricButton value="Dislike" label="Annuler TimeLike" onClick={onOpen}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f7fb] text-[#0f172a]">
          <DislikeFlagIcon className="h-4 w-4" />
        </span>
      </ClassicMetricButton>

      {open ? (
        <div className="timelike-cancel-popover" role="dialog" aria-label="Annuler TimeLike">
          <p className="timelike-cancel-kicker">{triggered ? "TimeLike actif" : "TimeLike en cours"}</p>
          <p className="timelike-cancel-title">
            Ce contenu ne vous plait pas ? Souhaitez-vous annuler votre TimeLike ?
          </p>
          <p className="timelike-cancel-meta">
            {triggered
              ? "Le TimeLike est deja parti sur ce post. Vous pouvez le retirer ici."
              : `${Math.floor(activeMs / 1000)}s d'attention detectees pour l'instant sur ce post.`}
          </p>
          <div className="timelike-cancel-actions">
            <button
              type="button"
              className="timelike-cancel-btn timelike-cancel-btn-secondary"
              onClick={onClose}
            >
              Non
            </button>
            <button
              type="button"
              className="timelike-cancel-btn timelike-cancel-btn-primary"
              onClick={onConfirm}
            >
              Oui
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClassicMediaBlock({
  item,
  videoRef,
  onOpenImage,
}: {
  item: ClassicFeedItem;
  videoRef?: { current: HTMLVideoElement | null };
  onOpenImage?: (images: string[], index: number, title: string) => void;
}) {
  if (item.variant === "letter") {
    return null;
  }

  if (item.media?.kind === "gallery" && item.media.gallery) {
    return (
      <div className="grid grid-cols-3 gap-2 bg-white">
        {item.media.gallery.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => onOpenImage?.(item.media!.gallery!, index, item.title)}
            className="relative h-[468px] overflow-hidden rounded-[5px] bg-white text-left transition hover:opacity-95"
          >
            <Image src={src} alt={`${item.title} ${index + 1}`} fill sizes="230px" className="object-cover" />
          </button>
        ))}
      </div>
    );
  }

  if (item.media?.kind === "video" && item.media.src) {
    return (
      <div className="overflow-hidden rounded-[5px] bg-[#030712]">
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
        className="block w-full overflow-hidden rounded-[5px] bg-black text-left transition hover:opacity-95"
      >
        <div className="relative aspect-[16/9] bg-black">
          <Image src={item.media.src} alt={item.title} fill sizes="760px" className="object-contain" />
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
  onOpenImage,
  trackingEnabled,
  onTimeLikeStateChange,
  flatCards = false,
}: {
  item: ClassicFeedItem;
  onOpenComments: (videoId: number) => void;
  onOpenShare: (videoId: number) => void;
  onOpenTimeLike: (videoId: number) => void;
  onOpenMore: (videoId: number) => void;
  onOpenImage: (images: string[], index: number, title: string) => void;
  trackingEnabled: boolean;
  onTimeLikeStateChange: (videoId: number, snapshot: ClassicTimeLikeSnapshot) => void;
  flatCards?: boolean;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timeLikeBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeLikeBurstVisible, setTimeLikeBurstVisible] = useState(false);
  const [timeLikeBurstTick, setTimeLikeBurstTick] = useState(0);
  const [isDislikePromptOpen, setIsDislikePromptOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [resolvedDurationSeconds, setResolvedDurationSeconds] = useState(() => parseDurationLabel(item.duration));
  const baseTimeLikeCount = Number(item.timelikeCount.replace(/\s+/g, ""));
  const mediaKind: ClassicMediaKind = item.media?.kind === "video" ? "video" : "photo";
  const [timeLikeState, setTimeLikeState] = useState(() => ({
    activeMs: 0,
    maxProgress: 0,
    triggered: false,
    count: baseTimeLikeCount,
    dismissed: false,
  }));
  const timeLikeRule = getTimeLikeRule(mediaKind, resolvedDurationSeconds);
  const timeLikeProgress = timeLikeState.triggered
    ? 1
    : getTimeLikeProgress(timeLikeRule, timeLikeState.activeMs, timeLikeState.maxProgress);

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
    onTimeLikeStateChange(item.videoId, {
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
    if (!trackingEnabled || !isVisible || timeLikeState.triggered || timeLikeState.dismissed || isDislikePromptOpen) {
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

      let shouldBurst = false;

      setTimeLikeState((current) => {
        if (current.triggered) {
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

        shouldBurst = true;

        return {
          ...current,
          activeMs: nextActiveMs,
          maxProgress: nextMaxProgress,
          triggered: true,
          count: current.count + 1,
        };
      });

      if (shouldBurst) {
        if (timeLikeBurstTimerRef.current) {
          clearTimeout(timeLikeBurstTimerRef.current);
        }

        setTimeLikeBurstTick((current) => current + 1);
        setTimeLikeBurstVisible(true);
        timeLikeBurstTimerRef.current = setTimeout(() => {
          setTimeLikeBurstVisible(false);
        }, 980);
      }
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    isDislikePromptOpen,
    isVisible,
    mediaKind,
    resolvedDurationSeconds,
    timeLikeState.dismissed,
    timeLikeState.triggered,
    trackingEnabled,
  ]);

  const handleCancelTimeLike = () => {
    setTimeLikeState((current) => ({
      ...current,
      activeMs: 0,
      maxProgress: 0,
      triggered: false,
      dismissed: true,
      count: current.triggered ? Math.max(baseTimeLikeCount, current.count - 1) : current.count,
    }));
    setTimeLikeBurstVisible(false);
    setIsDislikePromptOpen(false);
  };

  return (
    <article
      ref={cardRef}
      className={`overflow-visible rounded-[30px] border border-black/6 bg-white ${
        flatCards ? "shadow-none" : "shadow-[0_24px_56px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className="px-5 pb-2 pt-4">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-full ring-1 ring-black/6">
            <Image src={item.avatar} alt={item.author} fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-semibold text-[#111827]">{item.author}</p>
            </div>
            <p className="text-[12px] text-[#7a8597]">
              <span className="text-[#111827]">{item.handle}</span>
              {" - "}
              <span>{item.timestamp}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenMore(item.videoId)}
            className="rounded-full border border-black/8 bg-[#f6f8fb] px-3 py-1 text-[11px] font-semibold text-[#0f172a] transition hover:border-black/12 hover:bg-white"
          >
            Plus
          </button>
        </div>
      </div>

      <div className="px-5 pb-4 pt-0">
        <div className="max-w-[620px]">
          <h3
            className={`mt-1.5 text-[#111827] ${
              item.variant === "letter"
                ? "text-[29px] font-semibold leading-[1.03] tracking-[-0.05em]"
                : "text-[20px] font-semibold leading-[1.14] tracking-[-0.035em]"
            }`}
          >
            {item.title}
          </h3>
          <p className="mt-2 text-[14px] leading-6 text-[#111827]">{item.body}</p>
        </div>
      </div>

      {item.media ? <ClassicMediaBlock item={item} videoRef={videoRef} onOpenImage={onOpenImage} /> : null}

      <div className="px-5 pb-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <ClassicTimeLikeButton
            value={String(timeLikeState.count)}
            progress={timeLikeProgress}
            active={timeLikeState.triggered}
            burstVisible={timeLikeBurstVisible}
            burstKey={timeLikeBurstTick}
            onClick={() => onOpenTimeLike(item.videoId)}
          />
          <ClassicMetricButton
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f7fb] text-[#0f172a]">
                <MessageCircleMore className="h-4 w-4" strokeWidth={2.1} />
              </span>
            }
            value={item.commentCount}
            label="Commentaires"
            onClick={() => onOpenComments(item.videoId)}
          />
          <ClassicMetricButton
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f7fb] text-[#0f172a]">
                <Send className="h-4 w-4" strokeWidth={2.1} />
              </span>
            }
            value={item.shareCount}
            label="Partages"
            onClick={() => onOpenShare(item.videoId)}
          />
          <ClassicDislikeButton
            open={isDislikePromptOpen}
            triggered={timeLikeState.triggered}
            activeMs={timeLikeState.activeMs}
            onOpen={() => setIsDislikePromptOpen(true)}
            onClose={() => setIsDislikePromptOpen(false)}
            onConfirm={handleCancelTimeLike}
          />
        </div>
      </div>
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
            aria-label="Image précédente"
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
  trackingEnabled,
  onTimeLikeStateChange,
  flatCards = false,
}: ClassicFeedViewProps) {
  return (
    <section className="absolute left-1/2 top-[265px] w-[760px] -translate-x-1/2">
      <ClassicFeedStream
        onOpenComments={onOpenComments}
        onOpenShare={onOpenShare}
        onOpenTimeLike={onOpenTimeLike}
        onOpenMore={onOpenMore}
        trackingEnabled={trackingEnabled}
        onTimeLikeStateChange={onTimeLikeStateChange}
        flatCards={flatCards}
        className="space-y-3"
      />
    </section>
  );
}

export function ClassicFeedStream({
  onOpenComments,
  onOpenShare,
  onOpenTimeLike,
  onOpenMore,
  trackingEnabled,
  onTimeLikeStateChange,
  flatCards = false,
  className = "space-y-3",
}: ClassicFeedViewProps & { className?: string }) {
  const [lightboxState, setLightboxState] = useState<ClassicLightboxState | null>(null);

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

  return (
    <>
      <div className={className}>
        {classicFeedItems.map((item) => (
          <ClassicFeedCard
            key={item.id}
            item={item}
            onOpenComments={onOpenComments}
            onOpenShare={onOpenShare}
            onOpenTimeLike={onOpenTimeLike}
            onOpenMore={onOpenMore}
            onOpenImage={handleOpenImage}
            trackingEnabled={trackingEnabled}
            onTimeLikeStateChange={onTimeLikeStateChange}
            flatCards={flatCards}
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
