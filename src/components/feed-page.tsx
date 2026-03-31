"use client";

import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";
import type { AnimationItem } from "lottie-web";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlignJustify,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronDown,
  Clock3,
  Copy,
  Disc3,
  Ellipsis,
  EllipsisVertical,
  Flag,
  Hash,
  Link2,
  MessagesSquare,
  Plus,
  Radio,
  Repeat2,
  Search as SearchIcon,
  Send,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  X,
} from "lucide-react";
import commentAnimationData from "../../public/feed-rail-animations/feed-comment-icon.json";
import shareAnimationData from "../../public/feed-rail-animations/feed-share-icon.json";
import timeAnimationData from "../../public/feed-rail-animations/feed-time-icon.json";
import { AnimatedHeaderNav, type HeaderNavItemId } from "@/components/animated-header-nav";
import { ClassicFeedView } from "@/components/classic-feed-view";
import {
  type ClassicFeedCardItem,
  type FeedMediaItem,
  type PublicPost,
  toClassicFeedCardItem,
  toFeedMediaItem,
} from "@/lib/posts";
import { getSoundSlugForTrack } from "@/lib/sound-library";

type Story = {
  id: number;
  name: string;
  avatar: string;
  own?: boolean;
  live?: boolean;
  watchAll?: boolean;
};

type ContentMode = "classic" | "video" | "photo";

type PostLayout = {
  id: number;
  left: number;
  top: number;
};

type PhotoTile = {
  id: number;
  src: string;
  alt: string;
};

type ActionItem = {
  id: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  animationData?: Record<string, unknown>;
  animationFrame?: {
    width: number;
    height: number;
    offsetY?: number;
  };
};

export type MockVideo = {
  id: number;
  kind: "video" | "photo";
  src: string;
  author: string;
  title: string;
  music: string;
  duration: string;
  timeLikeCount: number;
};

type TimeLikeRule = {
  minActiveMs: number;
  minProgress: number;
  mode: "time" | "or" | "and";
  segment: "photo" | "short" | "medium" | "long";
};

export type TimeLikeSnapshot = {
  videoId: number;
  kind: MockVideo["kind"];
  author: string;
  title: string;
  count: number;
  triggered: boolean;
  activeMs: number;
  maxProgress: number;
  progressValue: number;
  rule: TimeLikeRule;
  durationSeconds: number;
};

type TimeLikeAudienceSeed = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  baseAttentionSeconds: number;
  baseWatchedPercent: number;
};

type TimeLikeAudienceEntry = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  attentionSeconds: number;
  watchedPercent: number;
  isCurrentUser?: boolean;
};

type FollowBurstParticle = {
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

type CommentEntry = {
  id: number;
  author: string;
  avatar: string;
  meta: string;
  body: string;
  likes: string;
  replies: string;
};

type CommentThread = {
  countLabel: string;
  entries: CommentEntry[];
};

type SearchQuickFilter = {
  id: string;
  label: string;
};

type SearchRecentItem = {
  id: number;
  label: string;
  meta: string;
  kind: "creator" | "topic" | "sound";
};

type SearchTrend = {
  id: number;
  tag: string;
  posts: string;
  accent: string;
};

type SearchCreator = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  badge: string;
};

type ShareQuickAction = {
  id: string;
  label: string;
  meta: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

type ShareRecipient = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  status: string;
};

type MoreDrawerView = "menu" | "description" | "playlist" | "report-primary" | "report-secondary";

type PlaylistOption = {
  id: number;
  name: string;
  meta: string;
  cover: string;
};

const stories: Story[] = [
  { id: 1, name: "Your Story", avatar: "/figma-assets/avatar-user.png", own: true },
  { id: 2, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png", live: true },
  { id: 3, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 4, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 5, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 6, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 7, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 8, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 9, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 10, name: "Watch all", avatar: "/figma-assets/story-watch-all.svg", watchAll: true },
];

const photoTilesSeed: PhotoTile[] = [
  { id: 1, src: "/figma-assets/photo-feed/photo-grid-1.jpg", alt: "Pola photo collage" },
  { id: 2, src: "/figma-assets/photo-feed/photo-grid-2.jpg", alt: "Fashion portrait duo" },
  { id: 3, src: "/figma-assets/photo-feed/photo-grid-3.jpg", alt: "Beauty product still life" },
  { id: 4, src: "/figma-assets/photo-feed/photo-grid-4.jpg", alt: "Cookies editorial image" },
  { id: 5, src: "/figma-assets/photo-feed/photo-grid-5.jpg", alt: "Black and white bedroom photography" },
  { id: 6, src: "/figma-assets/photo-feed/photo-grid-6.jpg", alt: "Magazine cover portrait" },
  { id: 7, src: "/figma-assets/photo-feed/photo-grid-7.jpg", alt: "High fashion beauty portrait" },
  { id: 8, src: "/figma-assets/photo-feed/photo-grid-8.jpg", alt: "Child with balloons photography" },
];

const photoTiles: PhotoTile[] = [...photoTilesSeed, ...photoTilesSeed].map((tile, index) => ({
  ...tile,
  id: index + 1,
}));

const STORY_CARD_WIDTH = 86;
const STORY_CARD_STEP = 106;
const STORY_TRACK_WIDTH = STORY_CARD_WIDTH + STORY_CARD_STEP * (stories.length - 1);

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
const PHOTO_GRID_ROWS = Math.ceil(photoTiles.length / 4);
const PHOTO_GRID_HEIGHT =
  PHOTO_GRID_ROWS * PHOTO_GRID_TILE_HEIGHT + (PHOTO_GRID_ROWS - 1) * PHOTO_GRID_GAP;
const PHOTO_PAGE_HEIGHT = PHOTO_GRID_TOP + PHOTO_GRID_HEIGHT + 140;

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
      <circle
        cx="12"
        cy="13"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 13V10.45M12 13L13.8 14.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 3.9H14.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.25 5.45L17.6 4.15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const actionItems: ActionItem[] = [
  {
    id: "comments",
    value: "894",
    icon: CommentRailIcon,
    animationData: commentAnimationData,
    animationFrame: {
      width: 30,
      height: 30,
    },
  },
  {
    id: "shares",
    value: "894",
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
    value: "894",
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

const topActions = [
  { id: "create", src: "/figma-assets/top-plus.svg", left: 0, label: "Create" },
  {
    id: "notifications",
    src: "/figma-assets/top-notification.svg",
    left: 42,
    label: "Notifications",
  },
  { id: "messages", src: "/figma-assets/top-message.svg", left: 84, label: "Messages" },
];

const searchQuickFilters: SearchQuickFilter[] = [
  { id: "for-you", label: "Pour toi" },
  { id: "creators", label: "Creators" },
  { id: "videos", label: "Videos" },
  { id: "sounds", label: "Sons" },
  { id: "live", label: "Live" },
];

const searchRecentItems: SearchRecentItem[] = [
  { id: 1, label: "world.of.tcgp", meta: "Creator en tendance", kind: "creator" },
  { id: 2, label: "#chromecast", meta: "Produit et motion design", kind: "topic" },
  { id: 3, label: "Studio Heat", meta: "Son utilise dans le feed", kind: "sound" },
  { id: 4, label: "#pictomag", meta: "Editorial social video", kind: "topic" },
];

const searchTrends: SearchTrend[] = [
  {
    id: 1,
    tag: "#videodesign",
    posts: "18,4 k posts",
    accent: "linear-gradient(135deg, rgba(11, 107, 255, 0.18) 0%, rgba(101, 195, 255, 0.1) 100%)",
  },
  {
    id: 2,
    tag: "#socialmotion",
    posts: "9,2 k posts",
    accent: "linear-gradient(135deg, rgba(17, 24, 39, 0.12) 0%, rgba(75, 85, 99, 0.1) 100%)",
  },
  {
    id: 3,
    tag: "#tcgp",
    posts: "6,9 k posts",
    accent: "linear-gradient(135deg, rgba(58, 215, 255, 0.2) 0%, rgba(11, 107, 255, 0.12) 100%)",
  },
];

const searchCreators: SearchCreator[] = [
  {
    id: 1,
    name: "World of TCGP",
    handle: "@world.of.tcgp",
    avatar: "/figma-assets/avatar-post.png",
    badge: "Motion produit",
  },
  {
    id: 2,
    name: "Pictomag News",
    handle: "@pictomag.news",
    avatar: "/figma-assets/avatar-user.png",
    badge: "Editorial feed",
  },
  {
    id: 3,
    name: "Axel Belujon",
    handle: "@axelbelujon",
    avatar: "/figma-assets/avatar-story.png",
    badge: "Creator live",
  },
];

const shareQuickActions: ShareQuickAction[] = [
  {
    id: "copy",
    label: "Copier le lien",
    meta: "Envoyer hors app",
    icon: Link2,
  },
  {
    id: "message",
    label: "Message prive",
    meta: "Partager en DM",
    icon: MessagesSquare,
  },
  {
    id: "repost",
    label: "Reposter",
    meta: "Booster dans le feed",
    icon: Repeat2,
  },
  {
    id: "story",
    label: "Partager en story",
    meta: "Format vertical rapide",
    icon: Sparkles,
  },
];

const shareRecipients: ShareRecipient[] = [
  {
    id: 1,
    name: "World of TCGP",
    handle: "@world.of.tcgp",
    avatar: "/figma-assets/avatar-post.png",
    status: "Actif maintenant",
  },
  {
    id: 2,
    name: "Pictomag News",
    handle: "@pictomag.news",
    avatar: "/figma-assets/avatar-user.png",
    status: "En ligne",
  },
  {
    id: 3,
    name: "Axel Belujon",
    handle: "@axelbelujon",
    avatar: "/figma-assets/avatar-story.png",
    status: "Repond vite",
  },
  {
    id: 4,
    name: "Studio Heat",
    handle: "@studio.heat",
    avatar: "/figma-assets/avatar-post.png",
    status: "Collab recent",
  },
  {
    id: 5,
    name: "Chrome Lab",
    handle: "@chromelab",
    avatar: "/figma-assets/avatar-user.png",
    status: "Equipe produit",
  },
  {
    id: 6,
    name: "Motion Board",
    handle: "@motion.board",
    avatar: "/figma-assets/avatar-story.png",
    status: "Playlist video",
  },
];

const playlistOptions: PlaylistOption[] = [
  {
    id: 1,
    name: "Inspiration feed",
    meta: "12 videos enregistrees",
    cover: "/figma-assets/avatar-post.png",
  },
  {
    id: 2,
    name: "Motion references",
    meta: "8 videos enregistrees",
    cover: "/figma-assets/avatar-user.png",
  },
  {
    id: 3,
    name: "Audio concepts",
    meta: "5 videos enregistrees",
    cover: "/figma-assets/avatar-story.png",
  },
];

const reportReasonsPrimary = [
  "Contenu a caractere sexuel",
  "Contenu violent ou abject",
  "Contenu abusif ou incitant a la haine",
  "Harcelement ou intimidation",
  "Actes dangereux ou pernicieux",
  "Suicide, automutilation ou troubles alimentaires",
];

const reportReasonsSecondary = [
  "Informations incorrectes",
  "Maltraitance d'enfants",
  "Incitation au terrorisme",
  "Spam ou contenu trompeur",
  "Probleme juridique",
];

const timeLikeAudienceSeeds: TimeLikeAudienceSeed[] = [
  {
    id: 1,
    name: "ZedaChaseCards",
    handle: "@zedachasecards",
    avatar: "/figma-assets/avatar-post.png",
    baseAttentionSeconds: 24,
    baseWatchedPercent: 92,
  },
  {
    id: 2,
    name: "Caramelouille77",
    handle: "@caramelouille77",
    avatar: "/figma-assets/avatar-user.png",
    baseAttentionSeconds: 19,
    baseWatchedPercent: 86,
  },
  {
    id: 3,
    name: "Filipe93700",
    handle: "@filipe93700",
    avatar: "/figma-assets/avatar-story.png",
    baseAttentionSeconds: 16,
    baseWatchedPercent: 82,
  },
  {
    id: 4,
    name: "Mathis Moi",
    handle: "@mathis_moi_",
    avatar: "/figma-assets/avatar-post.png",
    baseAttentionSeconds: 14,
    baseWatchedPercent: 78,
  },
  {
    id: 5,
    name: "Motion Board",
    handle: "@motion.board",
    avatar: "/figma-assets/avatar-user.png",
    baseAttentionSeconds: 12,
    baseWatchedPercent: 74,
  },
  {
    id: 6,
    name: "Studio Heat",
    handle: "@studio.heat",
    avatar: "/figma-assets/avatar-story.png",
    baseAttentionSeconds: 10,
    baseWatchedPercent: 71,
  },
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

function getTimeLikeRule(kind: MockVideo["kind"], durationSeconds: number): TimeLikeRule {
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

  if (durationSeconds <= 90) {
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

function getTimeLikeProgress(rule: TimeLikeRule, activeMs: number, progress: number) {
  const timeProgress = rule.minActiveMs > 0 ? Math.min(1, activeMs / rule.minActiveMs) : 1;
  const viewProgress = rule.minProgress > 0 ? Math.min(1, progress / rule.minProgress) : 1;

  if (rule.mode === "time") {
    return timeProgress;
  }

  if (rule.mode === "or") {
    return Math.max(timeProgress, viewProgress);
  }

  return Math.min(timeProgress, viewProgress);
}

function shouldTriggerTimeLike(rule: TimeLikeRule, activeMs: number, progress: number) {
  if (rule.mode === "time") {
    return activeMs >= rule.minActiveMs;
  }

  if (rule.mode === "or") {
    return activeMs >= rule.minActiveMs || progress >= rule.minProgress;
  }

  return activeMs >= rule.minActiveMs && progress >= rule.minProgress;
}

export function createSeedTimeLikeSnapshot(
  video: MockVideo,
  overrides?: Partial<Pick<TimeLikeSnapshot, "count" | "activeMs" | "maxProgress" | "triggered">>,
): TimeLikeSnapshot {
  const durationSeconds = parseDurationLabel(video.duration);
  const rule = getTimeLikeRule(video.kind, durationSeconds);
  const activeMs = overrides?.activeMs ?? rule.minActiveMs + 3000;
  const maxProgress =
    overrides?.maxProgress ??
    (video.kind === "video"
      ? Math.min(1, Math.max(rule.minProgress > 0 ? rule.minProgress + 0.18 : 0.68, 0.68))
      : 0);
  const triggered = overrides?.triggered ?? true;

  return {
    videoId: video.id,
    kind: video.kind,
    author: video.author,
    title: video.title,
    count: overrides?.count ?? video.timeLikeCount,
    triggered,
    activeMs,
    maxProgress,
    progressValue: triggered ? 1 : getTimeLikeProgress(rule, activeMs, maxProgress),
    rule,
    durationSeconds,
  };
}

function parseCompactCount(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(/,/g, "");
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toClassicDrawerVideo(item: ClassicFeedCardItem): MockVideo | null {
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
  };
}

function getTimeLikeAudience(videoId: number, snapshot: TimeLikeSnapshot) {
  const seededAudience: TimeLikeAudienceEntry[] = timeLikeAudienceSeeds.map((person, index) => ({
    id: person.id,
    name: person.name,
    handle: person.handle,
    avatar: person.avatar,
    attentionSeconds: Math.max(7, person.baseAttentionSeconds - ((videoId + index) % 4)),
    watchedPercent: Math.max(70, Math.min(99, person.baseWatchedPercent - ((videoId * 3 + index * 2) % 9))),
  }));

  const liveAudience = snapshot.triggered
    ? [
        ...seededAudience,
        {
          id: 10_000 + videoId,
          name: "Vous",
          handle: "@vous",
          avatar: "/figma-assets/avatar-user.png",
          attentionSeconds: Math.max(1, Math.round(snapshot.activeMs / 1000)),
          watchedPercent: Math.max(1, Math.round(snapshot.maxProgress * 100)),
          isCurrentUser: true,
        },
      ]
    : seededAudience;

  return liveAudience.sort((a, b) => {
    if (b.attentionSeconds !== a.attentionSeconds) {
      return b.attentionSeconds - a.attentionSeconds;
    }

    return b.watchedPercent - a.watchedPercent;
  });
}

function getVideoDescription(video: MockVideo) {
  return `${video.title.replace(/\.\.\.$/, "")} Son utilise: ${video.music}. Ce contenu fait partie du fil video Pictomag et peut etre enregistre, partage ou signale depuis le menu d'actions.`;
}

const followBurstParticles: FollowBurstParticle[] = [
  { id: 1, kind: "emoji", emoji: "🙂", x: -56, y: -74, rotate: -24, delay: 0, size: 14 },
  { id: 2, kind: "dot", x: -32, y: -82, rotate: -10, delay: 30, size: 8, from: "#96e6ff", to: "#4f9cff" },
  { id: 3, kind: "emoji", emoji: "😊", x: -12, y: -88, rotate: 8, delay: 60, size: 14 },
  { id: 4, kind: "dot", x: 8, y: -82, rotate: 16, delay: 90, size: 7, from: "#6ec2ff", to: "#6f8fff" },
  { id: 5, kind: "emoji", emoji: "😄", x: 28, y: -76, rotate: 22, delay: 120, size: 14 },
  { id: 6, kind: "dot", x: 48, y: -64, rotate: 30, delay: 150, size: 8, from: "#77d8ff", to: "#2f83ff" },
  { id: 7, kind: "emoji", emoji: "🙂", x: 44, y: -46, rotate: 24, delay: 180, size: 13 },
  { id: 8, kind: "dot", x: 22, y: -58, rotate: 14, delay: 210, size: 7, from: "#9defff", to: "#53a9ff" },
  { id: 9, kind: "emoji", emoji: "😎", x: 0, y: -68, rotate: 0, delay: 240, size: 14 },
  { id: 10, kind: "dot", x: -22, y: -60, rotate: -14, delay: 270, size: 7, from: "#c0f4ff", to: "#7bb6ff" },
  { id: 11, kind: "emoji", emoji: "😁", x: -44, y: -52, rotate: -22, delay: 300, size: 13 },
  { id: 12, kind: "dot", x: -4, y: -48, rotate: -4, delay: 330, size: 6, from: "#84dfff", to: "#66a4ff" },
];

const saveHeartBurstParticles: FollowBurstParticle[] = [
  { id: 1, kind: "emoji", emoji: "♥", x: -22, y: -26, rotate: -16, delay: 0, size: 12 },
  { id: 2, kind: "emoji", emoji: "♥", x: -10, y: -34, rotate: -8, delay: 40, size: 10 },
  { id: 3, kind: "emoji", emoji: "♥", x: 8, y: -36, rotate: 8, delay: 80, size: 11 },
  { id: 4, kind: "emoji", emoji: "♥", x: 20, y: -24, rotate: 16, delay: 120, size: 12 },
  { id: 5, kind: "emoji", emoji: "♥", x: -18, y: -4, rotate: -22, delay: 160, size: 9 },
  { id: 6, kind: "emoji", emoji: "♥", x: 18, y: -6, rotate: 22, delay: 200, size: 9 },
  { id: 7, kind: "dot", x: -26, y: -14, rotate: -20, delay: 30, size: 5, from: "#ffd3eb", to: "#ff71ab" },
  { id: 8, kind: "dot", x: 26, y: -16, rotate: 18, delay: 90, size: 5, from: "#ffd7ed", to: "#ff5f9d" },
];

const commentThreads: Record<number, CommentThread> = {
  1: {
    countLabel: "6,1 k",
    entries: [
      {
        id: 1,
        author: "Queen_Christal22",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 2 mois (modifie)",
        body: "Love the fact the first guy didnt question or hesitated to duck",
        likes: "22 k",
        replies: "138 reponses",
      },
      {
        id: 2,
        author: "R0BL0Xtv",
        avatar: "/figma-assets/avatar-post.png",
        meta: "il y a 2 mois",
        body: "Shout out to the girl on the beginning for warning him",
        likes: "24 k",
        replies: "131 reponses",
      },
      {
        id: 3,
        author: "a.s.3894",
        avatar: "/figma-assets/avatar-story.png",
        meta: "il y a 2 mois",
        body: "First one had the situational awareness of a piece of paper",
        likes: "12 k",
        replies: "47 reponses",
      },
      {
        id: 4,
        author: "Monet777-t6c",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 5 jours",
        body: "The snort from the person behind the camera was so unintentionally funny",
        likes: "78",
        replies: "1 reponse",
      },
    ],
  },
  2: {
    countLabel: "4,8 k",
    entries: [
      {
        id: 1,
        author: "cinema.loop",
        avatar: "/figma-assets/avatar-post.png",
        meta: "il y a 4 jours",
        body: "That transition into the city lights is insanely smooth",
        likes: "18 k",
        replies: "89 reponses",
      },
      {
        id: 2,
        author: "blueframe.jpg",
        avatar: "/figma-assets/avatar-story.png",
        meta: "il y a 4 jours",
        body: "The color grade is clean, not overdone. Very premium look.",
        likes: "9,3 k",
        replies: "33 reponses",
      },
      {
        id: 3,
        author: "runway_audio",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 3 jours",
        body: "Saving this for the soundtrack alone",
        likes: "3,1 k",
        replies: "12 reponses",
      },
    ],
  },
  3: {
    countLabel: "3,9 k",
    entries: [
      {
        id: 1,
        author: "openroute.media",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 1 semaine",
        body: "The perspective shift when the road opens up is the best part",
        likes: "7,8 k",
        replies: "41 reponses",
      },
      {
        id: 2,
        author: "story.lab",
        avatar: "/figma-assets/avatar-story.png",
        meta: "il y a 6 jours",
        body: "This is the kind of pacing people actually watch to the end",
        likes: "4,4 k",
        replies: "19 reponses",
      },
      {
        id: 3,
        author: "motionvault",
        avatar: "/figma-assets/avatar-post.png",
        meta: "il y a 6 jours",
        body: "The framing is simple but really effective",
        likes: "1,9 k",
        replies: "8 reponses",
      },
    ],
  },
  4: {
    countLabel: "5,2 k",
    entries: [
      {
        id: 1,
        author: "world.of.tcgp",
        avatar: "/figma-assets/avatar-post.png",
        meta: "il y a 3 jours",
        body: "This chromecast-style frame has crazy visual impact on desktop",
        likes: "11 k",
        replies: "52 reponses",
      },
      {
        id: 2,
        author: "pixelpulse",
        avatar: "/figma-assets/avatar-story.png",
        meta: "il y a 3 jours",
        body: "Typography plus product motion, that combo works every time",
        likes: "4,7 k",
        replies: "16 reponses",
      },
      {
        id: 3,
        author: "renderhouse",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 2 jours",
        body: "Can we get the full description and the setup behind this clip",
        likes: "980",
        replies: "5 reponses",
      },
    ],
  },
  5: {
    countLabel: "2,7 k",
    entries: [
      {
        id: 1,
        author: "pictomag.news",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 5 jours",
        body: "The depth and the black levels on this one feel really polished",
        likes: "3,8 k",
        replies: "14 reponses",
      },
      {
        id: 2,
        author: "ui.film",
        avatar: "/figma-assets/avatar-post.png",
        meta: "il y a 4 jours",
        body: "This kind of cut would look perfect in a premium feed",
        likes: "1,6 k",
        replies: "6 reponses",
      },
    ],
  },
  6: {
    countLabel: "4,3 k",
    entries: [
      {
        id: 1,
        author: "world.of.tcgp",
        avatar: "/figma-assets/avatar-post.png",
        meta: "il y a 2 jours",
        body: "The glossy motion on this one is exactly the vibe a short feed needs",
        likes: "8,4 k",
        replies: "37 reponses",
      },
      {
        id: 2,
        author: "clip.archive",
        avatar: "/figma-assets/avatar-story.png",
        meta: "il y a 2 jours",
        body: "This should definitely have a save-to-playlist action",
        likes: "2,2 k",
        replies: "11 reponses",
      },
      {
        id: 3,
        author: "motionpilot",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 1 jour",
        body: "The content is strong, now the comments panel needs to match the same polish",
        likes: "860",
        replies: "4 reponses",
      },
    ],
  },
  101: {
    countLabel: "1,2 k",
    entries: [
      {
        id: 1,
        author: "editorial.loop",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 9 min",
        body: "Finally a post format that gives the idea enough breathing room.",
        likes: "2,1 k",
        replies: "48 reponses",
      },
      {
        id: 2,
        author: "clarity.notes",
        avatar: "/figma-assets/avatar-story.png",
        meta: "il y a 7 min",
        body: "TimeLike makes so much more sense here than a classic like counter.",
        likes: "944",
        replies: "18 reponses",
      },
    ],
  },
  102: {
    countLabel: "864",
    entries: [
      {
        id: 1,
        author: "moodboard.daily",
        avatar: "/figma-assets/avatar-post.png",
        meta: "il y a 28 min",
        body: "This layout feels more premium than a normal photo dump.",
        likes: "1,8 k",
        replies: "27 reponses",
      },
      {
        id: 2,
        author: "atlas.frame",
        avatar: "/figma-assets/avatar-story.png",
        meta: "il y a 24 min",
        body: "The hero image plus detail crops is the right call.",
        likes: "713",
        replies: "11 reponses",
      },
    ],
  },
  103: {
    countLabel: "2,9 k",
    entries: [
      {
        id: 1,
        author: "motion.house",
        avatar: "/figma-assets/avatar-post.png",
        meta: "il y a 31 min",
        body: "This proves video belongs in a classic feed when context is strong.",
        likes: "3,9 k",
        replies: "62 reponses",
      },
      {
        id: 2,
        author: "story.lab",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 29 min",
        body: "The intro copy above the player is what keeps me watching.",
        likes: "1,2 k",
        replies: "16 reponses",
      },
    ],
  },
  104: {
    countLabel: "702",
    entries: [
      {
        id: 1,
        author: "signal.notes",
        avatar: "/figma-assets/avatar-story.png",
        meta: "il y a 54 min",
        body: "We needed a feed where the metric itself encourages better posts.",
        likes: "1,1 k",
        replies: "14 reponses",
      },
      {
        id: 2,
        author: "slow.social",
        avatar: "/figma-assets/avatar-user.png",
        meta: "il y a 42 min",
        body: "This is the first time the classic format feels fresh again.",
        likes: "506",
        replies: "8 reponses",
      },
    ],
  },
};

function Asset({
  src,
  alt,
  className,
  width,
  height,
  style,
  loading,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={className}
      style={style}
      loading={loading}
      priority={priority}
    />
  );
}

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

function StoryItem({ story, index }: { story: Story; index: number }) {
  const left = index * STORY_CARD_STEP;

  if (story.watchAll) {
    return (
      <div
        className="story-card group absolute top-0 h-[110px] w-[86px]"
        style={{ left }}
      >
        <div className="story-avatar-shell relative h-[86px] w-[86px] transition-transform duration-300">
          <Asset
            src="/figma-assets/story-watch-all.svg"
            alt="Watch all"
            width={64}
            height={64}
            className="h-[86px] w-[86px]"
            loading="eager"
          />
        </div>
        <p className="absolute left-0 top-[99px] w-[86px] text-center text-[12px] leading-[15px] text-black transition-colors duration-300 group-hover:text-[#0077ff]">
          Watch all
        </p>
      </div>
    );
  }

  return (
    <div
      className={`story-card group absolute top-0 h-[110px] w-[86px] ${story.live ? "story-card-live" : ""}`}
      style={{ left }}
    >
      <div
        className={`story-avatar-shell relative h-[86px] w-[86px] transition-transform duration-300 ${
          story.live ? "story-live-shell" : "story-inst-shell"
        } ${
          story.own ? "story-inst-own" : ""
        }`}
      >
        {story.live ? (
          <>
            <span className="story-live-ring story-live-ring-main" />
            <span className="story-live-ring story-live-ring-arc" />
            <span className="story-live-ring story-live-ring-particles" />
          </>
        ) : (
          <>
            <span className="story-inst-ring" />
            <span className="story-inst-shine" />
          </>
        )}
        <div className="absolute left-[3px] top-[3px] z-20 h-20 w-20 overflow-hidden rounded-full border border-white">
          <Image
            src={story.avatar}
            alt={story.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
        {story.own ? (
          <Asset
            src="/figma-assets/plus-small.svg"
            alt=""
            width={14.22}
            height={14.22}
            className="absolute left-[68px] top-[70px] z-30 h-[14.22px] w-[14.22px]"
          />
        ) : null}
        {story.live ? (
          <span className="story-live-pill absolute left-1/2 top-[73px] z-40 -translate-x-1/2">
            LIVE
          </span>
        ) : null}
      </div>
      <p
        className={`absolute top-[99px] w-[86px] text-center text-[12px] leading-[15px] ${
          story.own
            ? "text-[#aeaeae] transition-colors duration-300 group-hover:text-black"
            : "font-medium text-black transition-colors duration-300 group-hover:text-[#0077ff]"
        }`}
      >
        {story.name}
      </p>
    </div>
  );
}

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
      const container = lottieRef.current;

      if (!container) {
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
            <span className="feed-timelike-heart feed-timelike-heart-left">♥</span>
            <span className="feed-timelike-heart feed-timelike-heart-mid">♥</span>
            <span className="feed-timelike-heart feed-timelike-heart-right">♥</span>
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
      <p className="feed-action-label text-center transition-colors duration-300">
        {value ?? item.value}
      </p>
    </button>
  );
}

function PostCluster({
  layout,
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
  layout: PostLayout;
  media: MockVideo;
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [followBurstVisible, setFollowBurstVisible] = useState(false);
  const [followBurstTick, setFollowBurstTick] = useState(0);
  const followBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeLikeBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeLikeBurstVisible, setTimeLikeBurstVisible] = useState(false);
  const [timeLikeBurstTick, setTimeLikeBurstTick] = useState(0);
  const [isDislikePromptOpen, setIsDislikePromptOpen] = useState(false);
  const [resolvedDurationSeconds, setResolvedDurationSeconds] = useState(() => parseDurationLabel(media.duration));
  const [timeLikeState, setTimeLikeState] = useState(() => ({
    activeMs: 0,
    maxProgress: 0,
    triggered: false,
    count: media.timeLikeCount,
    dismissed: false,
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
      if (followBurstTimerRef.current) {
        clearTimeout(followBurstTimerRef.current);
      }

      if (timeLikeBurstTimerRef.current) {
        clearTimeout(timeLikeBurstTimerRef.current);
      }
    };
  }, []);

  const handleFollowBurst = () => {
    if (followBurstTimerRef.current) {
      clearTimeout(followBurstTimerRef.current);
    }
    setFollowBurstTick((prev) => prev + 1);
    setFollowBurstVisible(true);
    followBurstTimerRef.current = setTimeout(() => {
      setFollowBurstVisible(false);
    }, 980);
  };

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
    if (!expanded || !trackingEnabled || timeLikeState.triggered || timeLikeState.dismissed || isDislikePromptOpen) {
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
        media.kind === "photo" ? true : Boolean(video && !video.paused && !video.ended);

      if (!canAccumulate) {
        return;
      }

      const durationSeconds =
        media.kind === "video" && video && Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : resolvedDurationSeconds;
      const currentProgress =
        media.kind === "video" && video && durationSeconds > 0
          ? Math.min(1, video.currentTime / durationSeconds)
          : 0;

      let shouldBurst = false;

      setTimeLikeState((current) => {
        if (current.triggered) {
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
        launchTimeLikeBurst();
      }
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    expanded,
    launchTimeLikeBurst,
    media.kind,
    resolvedDurationSeconds,
    isDislikePromptOpen,
    timeLikeState.triggered,
    timeLikeState.dismissed,
    trackingEnabled,
  ]);

  const handleOpenDislikePrompt = useCallback(() => {
    setIsDislikePromptOpen(true);
  }, []);

  const handleCloseDislikePrompt = useCallback(() => {
    setIsDislikePromptOpen(false);
  }, []);

  const handleCancelTimeLike = useCallback(() => {
    setTimeLikeState((current) => ({
      ...current,
      activeMs: 0,
      maxProgress: 0,
      triggered: false,
      dismissed: true,
      count: current.triggered ? Math.max(media.timeLikeCount, current.count - 1) : current.count,
    }));
    setTimeLikeBurstVisible(false);
    setIsDislikePromptOpen(false);
  }, [media.timeLikeCount]);

  return (
    <section
      ref={(element) => onSectionRef(layout.id, element)}
      className={`post-cluster absolute ${expanded ? "post-cluster-focus post-cluster-is-active" : ""}`}
      style={{ left: layout.left, top: layout.top }}
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
          aria-label="Mock feed video"
        />
        <div className="absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(180deg,rgba(3,5,9,0)_0%,rgba(3,5,9,0.03)_36%,rgba(3,5,9,0.14)_72%,rgba(3,5,9,0.48)_100%)]" />

        <div className="video-meta-dock absolute inset-x-0 bottom-0">
          <div className="video-meta-copy">
            <p className="video-meta-user">#{media.author}</p>
            <div className="video-meta-caption-row">
              <p className="video-meta-title">{media.title}</p>
              <span className="video-meta-more">Plus</span>
            </div>
          </div>
        </div>
      </article>

      <aside className="post-rail absolute" aria-label="Video actions">
        <div className="post-rail-main">
          <button
            type="button"
            aria-label="Follow me"
            onClick={handleFollowBurst}
            className="follow-hype post-follow cursor-pointer border-0 bg-transparent p-0 text-left"
          >
            <div className="follow-hype-core relative">
              <div className="follow-hype-avatar absolute overflow-hidden rounded-full">
                <Image
                  src="/figma-assets/avatar-post.png"
                  alt="Follow me"
                  fill
                  sizes="50px"
                  className="object-cover"
                />
              </div>

              <Asset
                src="/figma-assets/plus-small.svg"
                alt=""
                width={14.22}
                height={14.22}
                className="follow-hype-plus absolute"
              />

              {followBurstVisible ? (
                <div key={followBurstTick} className="follow-hype-burst" aria-hidden>
                  {followBurstParticles.map((particle) => (
                    <span
                      key={particle.id}
                      className={`follow-hype-burst-particle ${
                        particle.kind === "emoji" ? "follow-hype-burst-emoji" : "follow-hype-burst-dot"
                      }`}
                      style={
                        {
                          "--burst-x": `${particle.x}px`,
                          "--burst-y": `${particle.y}px`,
                          "--burst-rot": `${particle.rotate}deg`,
                          "--burst-delay": `${particle.delay}ms`,
                          "--burst-size": `${particle.size}px`,
                          "--burst-from": particle.from ?? "#9defff",
                          "--burst-to": particle.to ?? "#5a9dff",
                        } as CSSProperties
                      }
                    >
                      {particle.kind === "emoji" ? particle.emoji : ""}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="follow-hype-label w-full text-center font-bold">
              <span className="follow-variant-word follow-variant-word-2" data-text="Follow me">
                Follow me
              </span>
            </p>
          </button>

          <div className="post-actions">
            {primaryActionItems.map((item) => (
              <PostAction
                key={item.id}
                item={item}
                onClick={
                  item.id === "comments"
                    ? () => onOpenComments(media.id)
                    : item.id === "shares"
                      ? () => onOpenShare(media.id)
                    : item.id === "save"
                      ? () => onOpenTimeLike(media.id)
                      : undefined
                }
                value={item.id === "save" ? String(timeLikeState.count) : undefined}
                active={item.id === "save" ? timeLikeState.triggered : false}
                progress={item.id === "save" ? timeLikeProgress : 0}
                burstVisible={item.id === "save" ? timeLikeBurstVisible : false}
                burstKey={item.id === "save" ? timeLikeBurstTick : 0}
              />
            ))}

            <div className="feed-action-slot-dislike relative">
              <PostAction item={dislikeActionItem} onClick={handleOpenDislikePrompt} />

              {expanded && isDislikePromptOpen ? (
                <div className="timelike-cancel-popover" role="dialog" aria-label="Annuler TimeLike">
                  <p className="timelike-cancel-kicker">{timeLikeState.triggered ? "TimeLike actif" : "TimeLike en cours"}</p>
                  <p className="timelike-cancel-title">
                    Cette video ne vous plait pas ? Souhaitez-vous annuler votre TimeLike ?
                  </p>
                  <p className="timelike-cancel-meta">
                    {timeLikeState.triggered
                      ? "Le TimeLike est deja parti sur cette video. Vous pouvez le retirer ici."
                      : `${Math.floor(timeLikeState.activeMs / 1000)}s d'attention detectees pour l'instant sur cette video.`}
                  </p>
                  <div className="timelike-cancel-actions">
                    <button
                      type="button"
                      className="timelike-cancel-btn timelike-cancel-btn-secondary"
                      onClick={handleCloseDislikePrompt}
                    >
                      Non
                    </button>
                    <button
                      type="button"
                      className="timelike-cancel-btn timelike-cancel-btn-primary"
                      onClick={handleCancelTimeLike}
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
              onOpenMore(media.id);
            }}
          >
            <Ellipsis className="post-more-icon" strokeWidth={2.2} />
          </button>

          <button
            type="button"
            aria-label="Use this sound"
            onClick={() => router.push(`/sounds/${soundSlug}`)}
            className="hover-lift post-music relative"
          >
            <span className="post-music-surface" />
            <Disc3 className="post-music-icon" strokeWidth={2.1} />
            <span className="post-music-plus">
              <Plus className="post-music-plus-icon" strokeWidth={2.4} />
            </span>
          </button>
        </div>
      </aside>
    </section>
  );
}

export function CommentsDrawer({
  video,
  open,
  onClose,
}: {
  video: MockVideo | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !video) {
    return null;
  }

  const notifyCommentAction = (message: string) => {
    if (typeof window !== "undefined") {
      window.alert(message);
    }
  };

  const thread = video ? commentThreads[video.id] : null;

  return (
    <>
      <button
        type="button"
        aria-label="Close comments"
        onClick={onClose}
        className={`comments-drawer-backdrop ${open ? "comments-drawer-backdrop-open" : ""}`}
      />

      <aside className="comments-drawer comments-drawer-open" aria-hidden={false}>
        <div className="comments-drawer-header">
          <div className="comments-drawer-title-block">
            <h2 className="comments-drawer-title">Commentaires</h2>
            <span className="comments-drawer-count">{thread?.countLabel ?? "0"}</span>
          </div>
          <div className="comments-drawer-header-actions">
            <button
              type="button"
              aria-label="Sort comments"
              onClick={() => notifyCommentAction("Tri des commentaires: disponible dans la prochaine iteration.")}
              className="comments-icon-btn"
            >
              <SlidersHorizontal size={20} strokeWidth={2.1} />
            </button>
            <button type="button" aria-label="Close comments" onClick={onClose} className="comments-icon-btn">
              <X size={21} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="comments-drawer-list">
          {thread?.entries.map((entry) => (
            <article key={entry.id} className="comment-card">
              <div className="comment-card-top">
                <div className="comment-avatar-wrap">
                  <Image src={entry.avatar} alt={entry.author} fill sizes="38px" className="object-cover" />
                </div>
                <div className="comment-body">
                  <div className="comment-meta-row">
                    <p className="comment-author">@{entry.author}</p>
                    <span className="comment-meta">{entry.meta}</span>
                  </div>
                  <p className="comment-text">{entry.body}</p>
                  <div className="comment-actions-row">
                    <button
                      type="button"
                      onClick={() => notifyCommentAction("Reaction like enregistree.")}
                      className="comment-action-chip"
                      aria-label="Like comment"
                    >
                      <ThumbsUp size={16} strokeWidth={1.9} />
                      <span>{entry.likes}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => notifyCommentAction("Reaction dislike enregistree.")}
                      className="comment-action-chip"
                      aria-label="Dislike comment"
                    >
                      <ThumbsDown size={16} strokeWidth={1.9} />
                    </button>
                    <button type="button" onClick={() => notifyCommentAction("Reponse rapide ouverte.")} className="comment-reply-btn">
                      Repondre
                    </button>
                  </div>
                  <button type="button" onClick={() => notifyCommentAction("Thread des reponses ouvert.")} className="comment-replies-btn">
                    <span>{entry.replies}</span>
                    <ChevronDown size={16} strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => notifyCommentAction("Actions commentaire: signaler, bloquer, copier lien.")}
                  className="comment-menu-btn"
                  aria-label="More comment actions"
                >
                  <EllipsisVertical size={18} strokeWidth={2.1} />
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="comments-drawer-footer">
          <div className="comments-footer-avatar">
            <Image src="/figma-assets/avatar-user.png" alt="Current user" fill sizes="36px" className="object-cover" />
          </div>
          <button type="button" onClick={() => notifyCommentAction("Editeur de commentaire ouvert.")} className="comments-input-shell">
            Ajoutez un commentaire...
          </button>
        </div>
      </aside>
    </>
  );
}

export function ShareDrawer({
  video,
  open,
  onClose,
}: {
  video: MockVideo | null;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  if (!open || !video) {
    return null;
  }

  const shareUrl = `https://pictomag.app/watch/${video.id}`;
  const filteredRecipients = shareRecipients.filter((recipient) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return (
      recipient.name.toLowerCase().includes(normalizedQuery) ||
      recipient.handle.toLowerCase().includes(normalizedQuery)
    );
  });

  const toggleRecipient = (recipientId: number) => {
    setSelectedRecipientIds((current) =>
      current.includes(recipientId)
        ? current.filter((id) => id !== recipientId)
        : [...current, recipientId],
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close share panel"
        onClick={onClose}
        className={`comments-drawer-backdrop ${open ? "comments-drawer-backdrop-open" : ""}`}
      />

      <aside className="share-drawer share-drawer-open" aria-hidden={false}>
        <div className="share-drawer-header">
          <div>
            <h2 className="share-drawer-title">Partager</h2>
            <p className="share-drawer-subtitle">Diffuse ce contenu sans casser le flow.</p>
          </div>
          <button type="button" aria-label="Close share panel" onClick={onClose} className="comments-icon-btn">
            <X size={21} strokeWidth={2.2} />
          </button>
        </div>

        <div className="share-link-card">
          <div className="share-link-meta">
            <span className="share-link-badge">Lien du post</span>
            <p className="share-link-url">{shareUrl}</p>
          </div>
          <button type="button" className="share-link-btn" onClick={handleCopyLink}>
            {copied ? <Check size={17} strokeWidth={2.3} /> : <Copy size={17} strokeWidth={2.1} />}
            <span>{copied ? "Copie" : "Copier"}</span>
          </button>
        </div>

        <div className="share-quick-grid">
          {shareQuickActions.map((action) => {
            const ActionIcon = action.icon;
            const isCopyAction = action.id === "copy";

            return (
              <button
                key={action.id}
                type="button"
                onClick={isCopyAction ? handleCopyLink : undefined}
                className="share-quick-card"
              >
                <span className="share-quick-icon">
                  <ActionIcon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                </span>
                <span className="share-quick-copy">
                  <span className="share-quick-label">{action.label}</span>
                  <span className="share-quick-meta">{action.meta}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="share-recipient-search">
          <SearchIcon className="h-[17px] w-[17px] text-[#7f8692]" strokeWidth={2.1} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="share-search-input"
            placeholder="Chercher une personne ou une playlist"
          />
        </div>

        <div className="share-recipient-list">
          {filteredRecipients.map((recipient) => {
            const selected = selectedRecipientIds.includes(recipient.id);

            return (
              <button
                key={recipient.id}
                type="button"
                onClick={() => toggleRecipient(recipient.id)}
                className={`share-recipient-card ${selected ? "share-recipient-card-selected" : ""}`}
              >
                <div className="share-recipient-avatar">
                  <Image src={recipient.avatar} alt={recipient.name} fill sizes="52px" className="object-cover" />
                </div>
                <div className="share-recipient-copy">
                  <p className="share-recipient-name">{recipient.name}</p>
                  <p className="share-recipient-handle">{recipient.handle}</p>
                  <p className="share-recipient-status">{recipient.status}</p>
                </div>
                <span className={`share-recipient-toggle ${selected ? "share-recipient-toggle-selected" : ""}`}>
                  {selected ? <Check size={16} strokeWidth={2.6} /> : <Send size={16} strokeWidth={2.1} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="share-drawer-footer">
          <div className="share-selection-stack">
            {selectedRecipientIds.length > 0 ? (
              shareRecipients
                .filter((recipient) => selectedRecipientIds.includes(recipient.id))
                .slice(0, 3)
                .map((recipient) => (
                  <div key={recipient.id} className="share-selection-avatar">
                    <Image src={recipient.avatar} alt={recipient.name} fill sizes="34px" className="object-cover" />
                  </div>
                ))
            ) : (
              <span className="share-selection-hint">Choisis des personnes ou copie le lien.</span>
            )}
          </div>

          <button
            type="button"
            className="share-send-btn"
            disabled={selectedRecipientIds.length === 0}
          >
            <Send size={16} strokeWidth={2.2} />
            <span>Envoyer</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function MoreActionsDrawer({
  video,
  open,
  onClose,
}: {
  video: MockVideo | null;
  open: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<MoreDrawerView>("menu");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);
  const [playlistSaved, setPlaylistSaved] = useState(false);

  if (!open || !video) {
    return null;
  }

  const title =
    view === "menu"
      ? "Actions"
      : view === "description"
        ? "Description"
        : view === "playlist"
          ? "Enregistrer dans une playlist"
          : "Signaler";

  const canGoBack = view !== "menu";

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close more actions"
        onClick={onClose}
        className={`comments-drawer-backdrop ${open ? "comments-drawer-backdrop-open" : ""}`}
      />

      <aside className="more-drawer more-drawer-open" aria-hidden={false}>
        <div className="more-drawer-header">
          <div className="more-drawer-header-main">
            {canGoBack ? (
              <button type="button" className="more-drawer-back" onClick={() => setView("menu")} aria-label="Retour">
                <ChevronLeft size={18} strokeWidth={2.3} />
              </button>
            ) : null}
            <h2 className="more-drawer-title">{title}</h2>
          </div>
          <button type="button" aria-label="Close more actions" onClick={onClose} className="comments-icon-btn">
            <X size={21} strokeWidth={2.2} />
          </button>
        </div>

        {view === "menu" ? (
          <div className="more-menu-list">
            <button type="button" className="more-menu-item" onClick={() => setView("description")}>
              <span className="more-menu-icon">
                <AlignJustify size={18} strokeWidth={2.2} />
              </span>
              <span className="more-menu-label">Description</span>
            </button>

            <button type="button" className="more-menu-item" onClick={() => setView("playlist")}>
              <span className="more-menu-icon">
                <Bookmark size={18} strokeWidth={2.1} />
              </span>
              <span className="more-menu-label">Enregistrer dans une playlist</span>
            </button>

            <button type="button" className="more-menu-item" onClick={() => setView("report-primary")}>
              <span className="more-menu-icon">
                <Flag size={18} strokeWidth={2.1} />
              </span>
              <span className="more-menu-label">Signaler</span>
            </button>
          </div>
        ) : null}

        {view === "description" ? (
          <div className="more-panel-body">
            <div className="more-description-card">
              <div className="more-description-top">
                <div className="more-description-avatar">
                  <Image src="/figma-assets/avatar-post.png" alt={video.author} fill sizes="48px" className="object-cover" />
                </div>
                <div className="more-description-copy">
                  <p className="more-description-author">#{video.author}</p>
                  <p className="more-description-meta">{video.music}</p>
                </div>
              </div>

              <p className="more-description-text">{getVideoDescription(video)}</p>
            </div>
          </div>
        ) : null}

        {view === "playlist" ? (
          <div className="more-panel-body more-panel-body-grow">
            <div className="playlist-sheet-copy">
              <p className="playlist-sheet-title">Choisissez une playlist</p>
              <p className="playlist-sheet-subtitle">Enregistrez ce contenu dans une collection personnelle.</p>
            </div>

            <div className="playlist-sheet-list">
              {playlistOptions.map((playlist) => {
                const selected = selectedPlaylistId === playlist.id;

                return (
                  <button
                    key={playlist.id}
                    type="button"
                    className={`playlist-sheet-item ${selected ? "playlist-sheet-item-selected" : ""}`}
                    onClick={() => {
                      setSelectedPlaylistId(playlist.id);
                      setPlaylistSaved(false);
                    }}
                  >
                    <div className="playlist-sheet-thumb">
                      <Image src={playlist.cover} alt={playlist.name} fill sizes="52px" className="object-cover" />
                    </div>
                    <div className="playlist-sheet-item-copy">
                      <p className="playlist-sheet-item-title">{playlist.name}</p>
                      <p className="playlist-sheet-item-meta">{playlist.meta}</p>
                    </div>
                    <span className={`playlist-sheet-toggle ${selected ? "playlist-sheet-toggle-selected" : ""}`}>
                      {selected ? <Check size={16} strokeWidth={2.6} /> : <Plus size={16} strokeWidth={2.4} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="more-drawer-footer">
              <button
                type="button"
                className="more-primary-btn"
                disabled={selectedPlaylistId === null}
                onClick={() => setPlaylistSaved(true)}
              >
                {playlistSaved ? "Enregistre" : "Enregistrer"}
              </button>
            </div>
          </div>
        ) : null}

        {view === "report-primary" ? (
          <div className="more-panel-body more-panel-body-grow">
            <div className="report-sheet-copy">
              <h3 className="report-sheet-title">Que se passe-t-il ?</h3>
              <p className="report-sheet-subtitle">
                Nous verifions que toutes les consignes du reglement de la communaute sont respectees.
              </p>
            </div>

            <div className="report-sheet-list">
              {reportReasonsPrimary.map((reason) => {
                const selected = selectedReportReason === reason;

                return (
                  <button
                    key={reason}
                    type="button"
                    className={`report-sheet-item ${selected ? "report-sheet-item-selected" : ""}`}
                    onClick={() => setSelectedReportReason(reason)}
                  >
                    <span className="report-sheet-radio" />
                    <span className="report-sheet-label">{reason}</span>
                  </button>
                );
              })}
            </div>

            <div className="more-drawer-footer">
              <button
                type="button"
                className="more-primary-btn"
                disabled={selectedReportReason === null}
                onClick={() => setView("report-secondary")}
              >
                Suivant
              </button>
            </div>
          </div>
        ) : null}

        {view === "report-secondary" ? (
          <div className="more-panel-body more-panel-body-grow">
            <div className="report-sheet-copy">
              <h3 className="report-sheet-title">Signaler</h3>
              <p className="report-sheet-subtitle">Choisissez la categorie qui correspond le mieux.</p>
            </div>

            <div className="report-sheet-list">
              {reportReasonsSecondary.map((reason) => {
                const selected = selectedReportReason === reason;

                return (
                  <button
                    key={reason}
                    type="button"
                    className={`report-sheet-item ${selected ? "report-sheet-item-selected" : ""}`}
                    onClick={() => setSelectedReportReason(reason)}
                  >
                    <span className="report-sheet-radio" />
                    <span className="report-sheet-label">{reason}</span>
                  </button>
                );
              })}
            </div>

            <div className="more-drawer-footer">
              <button
                type="button"
                className="more-primary-btn"
                disabled={selectedReportReason === null}
                onClick={onClose}
              >
                Envoyer le signalement
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </>,
    document.body,
  );
}

// Legacy drawer kept temporarily while the new ranked TimeLike list settles.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TimeLikeDrawer({
  video,
  snapshot,
  open,
  onClose,
}: {
  video: MockVideo | null;
  snapshot: TimeLikeSnapshot | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !video || !snapshot) {
    return null;
  }

  const activeSeconds = Math.floor(snapshot.activeMs / 1000);
  const watchedPercent = Math.round(snapshot.maxProgress * 100);
  const targetTimeSeconds = Math.round(snapshot.rule.minActiveMs / 1000);
  const targetProgress = Math.round(snapshot.rule.minProgress * 100);
  const ruleLabel =
    snapshot.rule.mode === "time"
      ? `${targetTimeSeconds}s`
      : snapshot.rule.mode === "or"
        ? `${targetTimeSeconds}s ou ${targetProgress}%`
        : `${targetTimeSeconds}s + ${targetProgress}%`;
  const statusLabel = snapshot.triggered ? "TimeLike actif" : "En observation";
  const statusMeta = snapshot.triggered
    ? "L’attention est qualifiee, le like auto est parti."
    : "Le systeme attend encore un vrai signal d’attention.";

  return (
    <>
      <button
        type="button"
        aria-label="Close TimeLike panel"
        onClick={onClose}
        className={`comments-drawer-backdrop ${open ? "comments-drawer-backdrop-open" : ""}`}
      />

      <aside className="timelike-drawer timelike-drawer-open" aria-hidden={false}>
        <div className="timelike-drawer-header">
          <div>
            <h2 className="timelike-drawer-title">TimeLike</h2>
            <p className="timelike-drawer-subtitle">
              Le like se declenche sur l’attention reelle, pas sur un clic reflexe.
            </p>
          </div>
          <button type="button" aria-label="Close TimeLike panel" onClick={onClose} className="comments-icon-btn">
            <X size={21} strokeWidth={2.2} />
          </button>
        </div>

        <div className="timelike-status-card">
          <div className="timelike-status-top">
            <div>
              <span className={`timelike-status-badge ${snapshot.triggered ? "timelike-status-badge-active" : ""}`}>
                {statusLabel}
              </span>
              <p className="timelike-status-meta">{statusMeta}</p>
            </div>
            <div className="timelike-count-bubble">
              <Clock3 size={17} strokeWidth={2.1} />
              <span>{snapshot.count}</span>
            </div>
          </div>

          <div className="timelike-post-card">
            <div className="timelike-post-avatar">
              <Image src="/figma-assets/avatar-post.png" alt={video.author} fill sizes="48px" className="object-cover" />
            </div>
            <div className="timelike-post-copy">
              <p className="timelike-post-author">#{video.author}</p>
              <p className="timelike-post-title">{video.title}</p>
            </div>
          </div>
        </div>

        <div className="timelike-metrics-grid">
          <div className="timelike-metric-card">
            <span className="timelike-metric-label">Temps actif</span>
            <strong className="timelike-metric-value">{activeSeconds}s</strong>
            <span className="timelike-metric-meta">Seuil: {targetTimeSeconds}s</span>
            <div className="timelike-meter">
              <span
                className="timelike-meter-fill"
                style={{ width: `${Math.min(100, (snapshot.activeMs / snapshot.rule.minActiveMs) * 100)}%` }}
              />
            </div>
          </div>

          <div className="timelike-metric-card">
            <span className="timelike-metric-label">Progression vue</span>
            <strong className="timelike-metric-value">{watchedPercent}%</strong>
            <span className="timelike-metric-meta">
              Seuil: {snapshot.rule.minProgress > 0 ? `${targetProgress}%` : "Aucun"}
            </span>
            <div className="timelike-meter">
              <span
                className="timelike-meter-fill timelike-meter-fill-cyan"
                style={{
                  width: `${Math.min(
                    100,
                    snapshot.rule.minProgress > 0
                      ? (snapshot.maxProgress / snapshot.rule.minProgress) * 100
                      : 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="timelike-rule-card">
          <div className="timelike-rule-copy">
            <span className="timelike-rule-label">Regle appliquee</span>
            <strong className="timelike-rule-value">
              {snapshot.rule.segment === "photo"
                ? "Photo"
                : snapshot.rule.segment === "short"
                  ? "Video courte"
                  : snapshot.rule.segment === "medium"
                    ? "Video moyenne"
                    : "Video longue"}
            </strong>
            <p className="timelike-rule-meta">{ruleLabel}</p>
          </div>
          <div className="timelike-rule-score">
            <span className="timelike-rule-score-label">Signal</span>
            <strong>{Math.round(snapshot.progressValue * 100)}%</strong>
          </div>
        </div>

        <div className="timelike-principles">
          <div className="timelike-principle">
            <Radio size={16} strokeWidth={2.1} />
            <span>Photo: 7s de regard actif</span>
          </div>
          <div className="timelike-principle">
            <ArrowUpRight size={16} strokeWidth={2.1} />
            <span>Video courte: 8s ou 70% vus</span>
          </div>
          <div className="timelike-principle">
            <Sparkles size={16} strokeWidth={2.1} />
            <span>Video moyenne: 12s + 50% vus</span>
          </div>
          <div className="timelike-principle">
            <UserRound size={16} strokeWidth={2.1} />
            <span>Video longue: 22s + 25% vus</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export function TimeLikeLeaderboardDrawer({
  video,
  snapshot,
  open,
  onClose,
}: {
  video: MockVideo | null;
  snapshot: TimeLikeSnapshot | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !video || !snapshot) {
    return null;
  }

  const audience = getTimeLikeAudience(video.id, snapshot);
  return (
    <>
      <button
        type="button"
        aria-label="Close TimeLike panel"
        onClick={onClose}
        className={`comments-drawer-backdrop ${open ? "comments-drawer-backdrop-open" : ""}`}
      />

      <aside className="timelike-drawer timelike-drawer-open" aria-hidden={false}>
        <div className="timelike-drawer-header">
          <div>
            <h2 className="timelike-drawer-title">TimeLike</h2>
            <p className="timelike-drawer-subtitle">
              Le like se declenche sur l&apos;attention reelle, pas sur un clic reflexe.
            </p>
          </div>
          <button type="button" aria-label="Close TimeLike panel" onClick={onClose} className="comments-icon-btn">
            <X size={21} strokeWidth={2.2} />
          </button>
        </div>

        <div className="timelike-status-card timelike-status-card-simple">
          <div className="timelike-status-top">
            <div className="timelike-position-card">
              <span className="timelike-position-label">Votre position</span>
              <p className="timelike-position-meta">100 secondes d&apos;attention</p>
              <strong className="timelike-position-rank">#50</strong>
            </div>
            <div className="timelike-summary-count">
              <span className="timelike-summary-count-label">Attentions offertes</span>
              <strong>{snapshot.count}</strong>
            </div>
          </div>
        </div>

        <div className="timelike-list-shell">
          <div className="timelike-list-header">
            <div>
              <h3 className="timelike-list-title">Top attention</h3>
              <p className="timelike-list-subtitle">
                Ceux qui sont restes le plus longtemps sur le contenu apparaissent en premier.
              </p>
            </div>
          </div>

          <div className="timelike-list">
            {audience.map((entry, index) => {
              return (
                <article key={entry.id} className="timelike-person-row">
                  <div className="timelike-person-rank">{index + 1}</div>
                  <div className="timelike-person-avatar">
                    <Image src={entry.avatar} alt={entry.name} fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="timelike-person-copy">
                    <div className="timelike-person-name-row">
                      <p className="timelike-person-name">{entry.name}</p>
                      {entry.isCurrentUser ? (
                        <span className="timelike-person-chip">Vous</span>
                      ) : index === 0 ? (
                        <span className="timelike-person-chip">Top</span>
                      ) : null}
                    </div>
                    <p className="timelike-person-handle">{entry.handle}</p>
                    <p className="timelike-person-meta">
                      {entry.attentionSeconds}s d&apos;attention &bull; {entry.watchedPercent}% vu
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="timelike-list-note">
          <Clock3 size={16} strokeWidth={2.15} />
          <span>
            TimeLike classe d&apos;abord le temps d&apos;attention, puis la progression vue pour departager les profils.
          </span>
        </div>
      </aside>
    </>
  );
}

function SearchPanel({
  open,
  query,
  onQueryChange,
  onClose,
}: {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (value: string) => value.toLowerCase().includes(normalizedQuery);

  const filteredRecent = searchRecentItems.filter(
    (item) => !normalizedQuery || matchesQuery(`${item.label} ${item.meta}`),
  );
  const filteredTrends = searchTrends.filter(
    (item) => !normalizedQuery || matchesQuery(`${item.tag} ${item.posts}`),
  );
  const filteredCreators = searchCreators.filter(
    (item) => !normalizedQuery || matchesQuery(`${item.name} ${item.handle} ${item.badge}`),
  );

  const hasResults =
    filteredRecent.length > 0 || filteredTrends.length > 0 || filteredCreators.length > 0;

  return (
    <>
      <button type="button" aria-label="Close search" className="search-panel-backdrop" onClick={onClose} />

      <div className="search-panel-shell" role="dialog" aria-modal="true" aria-label="Search panel">
        <section className="search-panel">
          <div className="search-panel-header">
            <div>
              <p className="search-panel-eyebrow">Explorer</p>
              <h2 className="search-panel-title">Recherche intelligente</h2>
            </div>

            <button type="button" aria-label="Close search" className="search-panel-close" onClick={onClose}>
              <X size={18} strokeWidth={2.3} />
            </button>
          </div>

          <label className="search-panel-input-wrap">
            <SearchIcon className="search-panel-input-icon" size={20} strokeWidth={2.25} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="search-panel-input"
              placeholder="Rechercher un creator, #hashtag, son ou concept"
              autoFocus
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                className="search-panel-clear"
                onClick={() => onQueryChange("")}
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            ) : null}
          </label>

          <div className="search-panel-chips">
            {searchQuickFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className="search-chip"
                onClick={() => onQueryChange(filter.label)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {hasResults ? (
            <div className="search-panel-grid">
              <section className="search-section">
                <div className="search-section-header">
                  <Clock3 size={16} strokeWidth={2.15} />
                  <span>Récentes</span>
                </div>

                <div className="search-list">
                  {filteredRecent.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="search-list-item"
                      onClick={() => onQueryChange(item.label)}
                    >
                      <span className="search-list-icon">
                        {item.kind === "creator" ? (
                          <UserRound size={16} strokeWidth={2.1} />
                        ) : item.kind === "sound" ? (
                          <Radio size={16} strokeWidth={2.1} />
                        ) : (
                          <Hash size={16} strokeWidth={2.1} />
                        )}
                      </span>
                      <span className="search-list-copy">
                        <span className="search-list-title">{item.label}</span>
                        <span className="search-list-meta">{item.meta}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="search-section">
                <div className="search-section-header">
                  <Sparkles size={16} strokeWidth={2.15} />
                  <span>Tendances</span>
                </div>

                <div className="search-trend-stack">
                  {filteredTrends.map((trend) => (
                    <button
                      key={trend.id}
                      type="button"
                      className="search-trend-card"
                      style={{ background: trend.accent }}
                      onClick={() => onQueryChange(trend.tag)}
                    >
                      <span className="search-trend-tag">{trend.tag}</span>
                      <span className="search-trend-posts">{trend.posts}</span>
                      <ArrowUpRight size={17} strokeWidth={2.15} className="search-trend-arrow" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="search-section search-section-creators">
                <div className="search-section-header">
                  <Radio size={16} strokeWidth={2.15} />
                  <span>À découvrir</span>
                </div>

                <div className="search-creators">
                  {filteredCreators.map((creator) => (
                    <button
                      key={creator.id}
                      type="button"
                      className="search-creator-card"
                      onClick={() => onQueryChange(creator.handle)}
                    >
                      <div className="search-creator-avatar">
                        <Image src={creator.avatar} alt={creator.name} fill sizes="48px" className="object-cover" />
                      </div>

                      <div className="search-creator-copy">
                        <span className="search-creator-name">{creator.name}</span>
                        <span className="search-creator-handle">{creator.handle}</span>
                      </div>

                      <span className="search-creator-badge">{creator.badge}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="search-empty-state">
              <SearchIcon size={24} strokeWidth={2.15} />
              <div>
                <p className="search-empty-title">Aucun résultat pour “{query}”</p>
                <p className="search-empty-copy">Essaie un creator, un hashtag ou un son plus large.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export function FeedPage({ initialMode = "video" }: { initialMode?: ContentMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const postSectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const pendingPostIdRef = useRef<number | null>(null);
  const snapLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapAlignTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapLockRef = useRef(false);
  const [contentMode, setContentMode] = useState<ContentMode>(initialMode);
  const [feedVideos, setFeedVideos] = useState<FeedMediaItem[]>([]);
  const [classicFeedItems, setClassicFeedItems] = useState<ClassicFeedCardItem[]>([]);
  const [focusedPostId, setFocusedPostId] = useState<number>(1);
  const [expandedPostHeight, setExpandedPostHeight] = useState<number>(BASE_POST_HEIGHT);
  const [commentsVideoId, setCommentsVideoId] = useState<number | null>(null);
  const [shareVideoId, setShareVideoId] = useState<number | null>(null);
  const [timeLikeVideoId, setTimeLikeVideoId] = useState<number | null>(null);
  const [moreVideoId, setMoreVideoId] = useState<number | null>(null);
  const [timeLikeSnapshots, setTimeLikeSnapshots] = useState<Record<number, TimeLikeSnapshot>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const resolvedFeedVideos = useMemo(() => feedVideos.slice(0, postLayouts.length), [feedVideos]);
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
  const findDrawerVideo = (videoId: number | null) =>
    videoId !== null ? drawerVideos.find((video) => video.id === videoId) ?? null : null;

  useEffect(() => {
    setContentMode(initialMode);
  }, [initialMode]);

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

        const nextFeedVideos = feedPosts
          .map((post) => toFeedMediaItem(post))
          .filter((post): post is FeedMediaItem => Boolean(post));
        const nextClassicFeedItems = classicPosts
          .map((post) => toClassicFeedCardItem(post))
          .filter((post): post is ClassicFeedCardItem => Boolean(post));

        setFeedVideos(nextFeedVideos);
        setClassicFeedItems(nextClassicFeedItems);
      } catch {
        // Keep the current state untouched. The real feed no longer falls back to local mock posts.
      }
    };

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (drawerVideos.length === 0) {
      return;
    }

    setTimeLikeSnapshots((current) => {
      let changed = false;
      const nextSnapshots = { ...current };

      for (const video of drawerVideos) {
        if (nextSnapshots[video.id]) {
          continue;
        }

        nextSnapshots[video.id] = createSeedTimeLikeSnapshot(video);
        changed = true;
      }

      return changed ? nextSnapshots : current;
    });
  }, [drawerVideos]);

  useEffect(() => {
    setFocusedPostId((current) => {
      if (resolvedFeedVideos.length === 0) {
        return 1;
      }

      return current <= resolvedFeedVideos.length ? current : 1;
    });
  }, [resolvedFeedVideos.length]);

  useEffect(() => {
    return () => {
      if (snapLockTimeoutRef.current) {
        clearTimeout(snapLockTimeoutRef.current);
      }

      if (snapAlignTimeoutRef.current) {
        clearTimeout(snapAlignTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      commentsVideoId === null &&
      shareVideoId === null &&
      timeLikeVideoId === null &&
      moreVideoId === null &&
      !isSearchOpen
    ) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [commentsVideoId, isSearchOpen, moreVideoId, shareVideoId, timeLikeVideoId]);

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

  const getViewportAnchorY = useCallback(() => {
    const headerSafeArea = 96;
    const usableHeight = Math.max(window.innerHeight - headerSafeArea, 220);
    return headerSafeArea + usableHeight * 0.5;
  }, []);

  const activeVideoLayoutIds = useMemo(
    () => resolvedFeedVideos.map((_, index) => postLayouts[index]!.id),
    [resolvedFeedVideos],
  );

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

  useEffect(() => {
    if (contentMode !== "video") {
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
  }, [contentMode, getClosestPostId]);

  const handleSectionRef = (id: number, element: HTMLElement | null) => {
    postSectionRefs.current[id] = element;
  };

  const handleOpenComments = useCallback((videoId: number) => {
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen(false);
    setCommentsVideoId(videoId);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentsVideoId(null);
  }, []);

  const handleOpenShare = useCallback((videoId: number) => {
    setCommentsVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen(false);
    setShareVideoId(videoId);
  }, []);

  const handleCloseShare = useCallback(() => {
    setShareVideoId(null);
  }, []);

  const handleOpenTimeLike = useCallback((videoId: number) => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen(false);
    setTimeLikeVideoId(videoId);
  }, []);

  const handleCloseTimeLike = useCallback(() => {
    setTimeLikeVideoId(null);
  }, []);

  const handleOpenMore = useCallback((videoId: number) => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setIsSearchOpen(false);
    setMoreVideoId(videoId);
  }, []);

  const handleCloseMore = useCallback(() => {
    setMoreVideoId(null);
  }, []);

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

  const handleNavItemClick = useCallback((itemId: HeaderNavItemId) => {
    if (itemId === "search") {
      setCommentsVideoId(null);
      setShareVideoId(null);
      setTimeLikeVideoId(null);
      setMoreVideoId(null);
      setIsSearchOpen((current) => !current);
      return;
    }

    if (itemId === "watch") {
      setCommentsVideoId(null);
      setShareVideoId(null);
      setTimeLikeVideoId(null);
      setMoreVideoId(null);
      setIsSearchOpen(false);
      router.push("/live-shopping");
      return;
    }

    if (itemId === "shop") {
      setCommentsVideoId(null);
      setShareVideoId(null);
      setTimeLikeVideoId(null);
      setMoreVideoId(null);
      setIsSearchOpen(false);
      router.push("/marketplace");
      return;
    }

    setIsSearchOpen(false);
  }, [router]);

  const closeOverlayPanels = useCallback(() => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setIsSearchOpen(false);
  }, []);

  const handleTopActionClick = useCallback(
    (actionId: string) => {
      if (actionId === "create") {
        closeOverlayPanels();
        router.push("/marketplace?view=create");
        return;
      }

      if (actionId === "notifications") {
        if (typeof window !== "undefined") {
          window.alert("Centre de notifications: ouverture en cours d integration.");
        }
        return;
      }

      if (typeof window !== "undefined") {
        window.alert("Messagerie: ouverture en cours d integration.");
      }
    },
    [closeOverlayPanels, router],
  );

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

  const handleSnapStep = useCallback((direction: -1 | 1) => {
    const orderedIds = activeVideoLayoutIds;

    if (orderedIds.length === 0) {
      return;
    }

    const fallbackId = getClosestPostId() ?? orderedIds[0];
    const currentId =
      pendingPostIdRef.current && orderedIds.includes(pendingPostIdRef.current)
        ? pendingPostIdRef.current
        : fallbackId;
    const currentIndex = orderedIds.indexOf(currentId);

    if (currentIndex === -1) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(orderedIds.length - 1, currentIndex + direction));
    const nextId = orderedIds[nextIndex];

    if (nextId === currentId) {
      return;
    }

    scrollToPost(nextId);
  }, [activeVideoLayoutIds, getClosestPostId, scrollToPost]);

  useEffect(() => {
    if (contentMode !== "video") {
      return;
    }

    const handleWheelStep = (event: WheelEvent) => {
      if (
        commentsVideoId !== null ||
        shareVideoId !== null ||
        timeLikeVideoId !== null ||
        moreVideoId !== null ||
        isSearchOpen
      ) {
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
  }, [
    commentsVideoId,
    contentMode,
    handleSnapStep,
    isSearchOpen,
    moreVideoId,
    shareVideoId,
    timeLikeVideoId,
  ]);

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
  const pageHeight =
    contentMode === "classic"
      ? CLASSIC_PAGE_HEIGHT
      : contentMode === "photo"
        ? PHOTO_PAGE_HEIGHT
        : activeVideoPageHeight;
  const isClassicMode = contentMode === "classic";
  const isVideoMode = contentMode === "video";
  const toolButtonClass = (active: boolean) =>
    `hover-lift icon-bubble-hover absolute left-[9px] flex h-10 w-10 items-center justify-center rounded-[30px] border transition ${
      active
        ? "border-[#cfe7ff] bg-white shadow-[0_10px_22px_rgba(28,177,254,0.16)]"
        : "border-transparent bg-white"
    }`;
  const activeToolFilter = "invert(50%) sepia(94%) saturate(2761%) hue-rotate(192deg) brightness(102%) contrast(101%)";
  const inactiveToolFilter = "brightness(0) saturate(100%)";

  return (
    <div className="overflow-x-auto bg-white">
      <div className="mx-auto w-[1440px] bg-white">
        <div
          className="relative w-[1440px] bg-white text-black"
          style={{ height: pageHeight }}
        >
          <header className="fixed left-1/2 top-0 z-[120] h-[73px] w-[1440px] -translate-x-1/2">
            <div className="absolute left-0 top-0 h-[61px] w-[1440px] bg-[rgba(255,255,255,0.87)] backdrop-blur-[13px]" />
            <Image
              src="/figma-assets/logo-mark.png"
              alt="Pictomag logo"
              width={29.99}
              height={29.04}
              priority
              className="absolute left-[54px] top-[23px] h-[29.04px] w-[29.99px]"
            />
            <Asset
              src="/figma-assets/brand-wordmark.svg"
              alt="Pictomag"
              width={83.52}
              height={31.69}
              className="absolute left-[94px] top-[24.28px] h-[31.69px] w-[83.52px]"
            />

            <AnimatedHeaderNav activeItemId={isSearchOpen ? "search" : "home"} onItemClick={handleNavItemClick} />

            <div className="absolute left-[1180px] top-6 h-6 w-[108px]">
              {topActions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTopActionClick(item.id)}
                  className="hover-lift absolute top-0 h-6 w-6"
                  style={{ left: item.left }}
                  aria-label={item.label}
                >
                  <Asset src={item.src} alt="" width={24} height={24} className="h-6 w-6" />
                </button>
              ))}
            </div>

            <div className="absolute left-[1303px] top-[19px] h-9 w-px bg-black/12" />

            <div className="absolute left-[1318px] top-5 flex h-8 w-[69px] items-center gap-[13px]">
              <button
                type="button"
                aria-label="Menu"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.alert("Menu compte: profil, reglages et deconnexion.");
                  }
                }}
                className="hover-lift h-6 w-6"
              >
                <Asset src="/figma-assets/top-menu.svg" alt="" width={24} height={24} className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Mon profil"
                onClick={() => router.push("/profile")}
                className="hover-lift relative h-8 w-8 overflow-hidden rounded-full"
              >
                <Image
                  src="/figma-assets/avatar-user.png"
                  alt="Current user"
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </button>
            </div>
          </header>

          <section
            className="absolute left-1/2 top-24 h-[110px] -translate-x-1/2"
            style={{ width: STORY_TRACK_WIDTH }}
          >
            {stories.map((story, index) => (
              <StoryItem key={story.id} story={story} index={index} />
            ))}
          </section>

          <div className="fixed left-16 top-[265px] z-[118] h-[162px] w-[58px] rounded-[100px] bg-[linear-gradient(180deg,#f1f5f8_0%,#f2f2f2_50%,#f1f5f8_100%)]">
            <button
              aria-label="Feed"
              onClick={() => switchContentMode("classic")}
              className={toolButtonClass(isClassicMode)}
              style={{ top: 11 }}
            >
              <Asset
                src="/figma-assets/tool-feed.svg"
                alt=""
                width={18}
                height={18}
                className="h-[18px] w-[18px]"
                style={{ filter: isClassicMode ? activeToolFilter : "none" }}
              />
            </button>

            <button
              aria-label="Video tool"
              onClick={() => switchContentMode("video")}
              className={toolButtonClass(isVideoMode)}
              style={{ top: 61 }}
            >
              <Asset
                src="/figma-assets/tool-video.svg"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6"
                style={{ filter: isVideoMode ? "none" : inactiveToolFilter }}
              />
            </button>

            <button
              aria-label="Photo tool"
              onClick={() => switchContentMode("photo")}
              className={toolButtonClass(contentMode === "photo")}
              style={{ top: 111 }}
            >
              <Asset
                src="/figma-assets/tool-photo.svg"
                alt=""
                width={18}
                height={18}
                className="h-[18px] w-[18px]"
                style={{ filter: contentMode === "photo" ? activeToolFilter : "none" }}
              />
            </button>
          </div>

          {isClassicMode ? (
            <ClassicFeedView
              onOpenComments={handleOpenComments}
              onOpenShare={handleOpenShare}
              onOpenTimeLike={handleOpenTimeLike}
              onOpenMore={handleOpenMore}
              trackingEnabled={
                commentsVideoId === null &&
                shareVideoId === null &&
                timeLikeVideoId === null &&
                moreVideoId === null &&
                !isSearchOpen
              }
              onTimeLikeStateChange={handleTimeLikeStateChange}
              items={classicFeedItems}
            />
          ) : isVideoMode ? (
            <>
              {activeVideoLayouts.map((layout, index) => {
                const media = resolvedFeedVideos[index];

                if (!media) {
                  return null;
                }

                return (
                  <PostCluster
                    key={`cluster-${layout.id}-${media.id}`}
                    layout={layout}
                    media={media}
                    expanded={focusedPostId === layout.id}
                    trackingEnabled={
                      commentsVideoId === null &&
                      shareVideoId === null &&
                      timeLikeVideoId === null &&
                      moreVideoId === null &&
                      !isSearchOpen
                    }
                    moreOpen={moreVideoId === media.id}
                    onSectionRef={handleSectionRef}
                    onOpenComments={handleOpenComments}
                    onOpenShare={handleOpenShare}
                    onOpenTimeLike={handleOpenTimeLike}
                    onOpenMore={handleOpenMore}
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
              {photoTiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => router.push(`/photos#tile-${tile.id}`)}
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
              ))}
            </section>
          )}

          <CommentsDrawer
            video={findDrawerVideo(commentsVideoId)}
            open={commentsVideoId !== null}
            onClose={handleCloseComments}
          />
          <ShareDrawer
            key={shareVideoId !== null ? `share-${shareVideoId}` : "share-closed"}
            video={findDrawerVideo(shareVideoId)}
            open={shareVideoId !== null}
            onClose={handleCloseShare}
          />
          <MoreActionsDrawer
            key={moreVideoId !== null ? `more-${moreVideoId}` : "more-closed"}
            video={findDrawerVideo(moreVideoId)}
            open={moreVideoId !== null}
            onClose={handleCloseMore}
          />
          <TimeLikeLeaderboardDrawer
            key={timeLikeVideoId !== null ? `timelike-${timeLikeVideoId}` : "timelike-closed"}
            video={findDrawerVideo(timeLikeVideoId)}
            snapshot={timeLikeVideoId !== null ? timeLikeSnapshots[timeLikeVideoId] ?? null : null}
            open={timeLikeVideoId !== null}
            onClose={handleCloseTimeLike}
          />
          <SearchPanel
            open={isSearchOpen}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={() => setIsSearchOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
