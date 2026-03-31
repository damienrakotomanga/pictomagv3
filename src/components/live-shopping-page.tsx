"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CircleAlert,
  ChevronDown,
  CreditCard,
  Eye,
  MapPin,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Truck,
  Volume2,
  X,
} from "lucide-react";
import { AnimatedHeaderNav, type HeaderNavItemId } from "@/components/animated-header-nav";
import {
  type LiveShoppingBrowseTab,
  type LiveShoppingCategory,
  type LiveShoppingChatMessage,
  type LiveShoppingEvent,
  type LiveShoppingLot,
  type LiveShoppingOrder,
  getLiveShoppingBySlug,
  getLiveShoppingCategoryById,
  getLiveShoppingHref,
  liveShoppingBrowseTabs,
  liveShoppingCategories,
  liveShoppingEvents,
  liveShoppingShelvesByCategory,
} from "@/lib/live-shopping-data";
import { type LiveShoppingRoomState } from "@/lib/live-shopping-room-state";
import {
  type LiveInventoryProduct,
} from "@/lib/live-shopping-inventory";
import {
  normalizeLiveShoppingScheduledLive,
  type LiveShoppingScheduledLive,
} from "@/lib/live-shopping-schedule";
import {
  type LiveShoppingPaymentMethod,
  type LiveShoppingRoomFilter,
  type LiveShoppingRoomSortMode,
  liveShoppingPreferencesDefaults,
} from "@/lib/user-preferences";
import {
  readLiveShoppingPreferencesFromApi,
  writeLiveShoppingPreferencesToApi,
} from "@/lib/preferences-api";
import {
  readLiveShoppingInventoryFromApi,
  readLiveShoppingOrdersFromApi,
  readLiveShoppingScheduleFromApi,
  writeLiveShoppingScheduleToApi,
} from "@/lib/state-api";

type SortMode = "recommended" | "viewers-desc" | "viewers-asc";

const topActions = [
  { id: "create", src: "/figma-assets/top-plus.svg", left: 0, label: "Create" },
  { id: "notifications", src: "/figma-assets/top-notification.svg", left: 42, label: "Notifications" },
  { id: "messages", src: "/figma-assets/top-message.svg", left: 84, label: "Messages" },
] as const;

const categoryTileThemes = [
  { base: "#f4f8ff", edge: "#dce8ff", glow: "rgba(70,130,255,0.18)", orbA: "#8cc0ff", orbB: "#d9e7ff", accent: "#2b6fff", accentSoft: "#eff5ff" },
  { base: "#fff7ef", edge: "#ffe5c6", glow: "rgba(255,172,58,0.16)", orbA: "#ffc96c", orbB: "#fff1cf", accent: "#ff9d1b", accentSoft: "#fff7e8" },
  { base: "#f5fbff", edge: "#dcecff", glow: "rgba(45,111,255,0.16)", orbA: "#5ba2ff", orbB: "#d8ebff", accent: "#2070ff", accentSoft: "#edf5ff" },
  { base: "#f8f6ff", edge: "#e9e1ff", glow: "rgba(130,111,255,0.16)", orbA: "#8f7bff", orbB: "#eee8ff", accent: "#6b58ff", accentSoft: "#f2efff" },
  { base: "#f1fcf8", edge: "#d7f1e8", glow: "rgba(46,177,130,0.16)", orbA: "#4fd2a2", orbB: "#ddf7ee", accent: "#19a978", accentSoft: "#ebfaf4" },
  { base: "#fff4f7", edge: "#ffe0e9", glow: "rgba(255,111,145,0.16)", orbA: "#ff8fb0", orbB: "#ffebf1", accent: "#ff5f87", accentSoft: "#fff0f5" },
  { base: "#f6f8ff", edge: "#e7ebff", glow: "rgba(83,96,255,0.16)", orbA: "#8b96ff", orbB: "#edf0ff", accent: "#4a5eff", accentSoft: "#eff2ff" },
  { base: "#f8fbf3", edge: "#e9f2dc", glow: "rgba(122,171,52,0.16)", orbA: "#a8cf63", orbB: "#f0f8e1", accent: "#7ea42a", accentSoft: "#f3f8e9" },
] as const;

type CategoryCoverPreset = {
  layout: "stack" | "single" | "duo";
  items: [string, string?, string?];
};

const categoryCoverPresets: Record<string, CategoryCoverPreset> = {
  "trading-card-games": { layout: "stack", items: ["🃏", "🎴", "✨"] },
  "finds-and-thrifts": { layout: "stack", items: ["🧳", "📦", "✨"] },
  "bags-and-accessories": { layout: "single", items: ["👜", "💼", "✨"] },
  "books-and-films": { layout: "duo", items: ["📚", "🎬", "✨"] },
  "mens-fashion": { layout: "single", items: ["🧥", "🧔", "✨"] },
  "womens-fashion": { layout: "single", items: ["👠", "👜", "✨"] },
  collectibles: { layout: "stack", items: ["🎁", "🎴", "✨"] },
  "sneakers-and-shoes": { layout: "single", items: ["👟", "✨", "👟"] },
  "toys-and-hobbies": { layout: "single", items: ["🧸", "🪀", "✨"] },
  "sports-cards": { layout: "stack", items: ["🏅", "🎴", "⚾"] },
  comics: { layout: "duo", items: ["📖", "💥", "✨"] },
  beauty: { layout: "single", items: ["💄", "🪞", "✨"] },
  "art-craft": { layout: "duo", items: ["🎨", "🧶", "✨"] },
  "anime-manga": { layout: "stack", items: ["📚", "🐉", "✨"] },
  "clearance-lots": { layout: "stack", items: ["📦", "🏷️", "✨"] },
  "stones-crystals": { layout: "single", items: ["💎", "🔮", "✨"] },
  "jewelry-watches": { layout: "single", items: ["💍", "⌚", "✨"] },
  "baby-kids": { layout: "single", items: ["👶", "🧸", "🍼"] },
  "video-games": { layout: "single", items: ["🎮", "🕹️", "✨"] },
  "home-garden": { layout: "duo", items: ["🪴", "🏠", "✨"] },
  electronics: { layout: "duo", items: ["💻", "🎧", "📱"] },
  "coins-silver": { layout: "single", items: ["🪙", "💰", "✨"] },
  "sports-collectibles": { layout: "duo", items: ["🏆", "⚽", "✨"] },
  music: { layout: "single", items: ["🎧", "🎵", "✨"] },
  "vintage-decor": { layout: "duo", items: ["🏺", "🪞", "✨"] },
  "knives-hunting": { layout: "single", items: ["🗡️", "🌲", "✨"] },
  "food-drink": { layout: "single", items: ["🍰", "☕", "✨"] },
  misc: { layout: "duo", items: ["🎁", "🌈", "✨"] },
  "sports-outdoor": { layout: "single", items: ["🏀", "⛰️", "✨"] },
  pets: { layout: "single", items: ["🐶", "🦴", "✨"] },
};

type CategoryLoopingMediaAsset = {
  type: "image" | "video";
  src: string;
  objectPosition?: string;
  poster?: string;
};

const categoryLoopingMediaById: Record<string, CategoryLoopingMediaAsset> = {
  "trading-card-games": {
    type: "video",
    src: "/live-shopping/categories/trading-card-games.mp4",
    poster: "/live-shopping/categories/trading-card-games-v2.jpg",
    objectPosition: "center center",
  },
  "finds-and-thrifts": {
    type: "image",
    src: "/live-shopping/categories/finds-and-thrifts-v2.jpg",
    objectPosition: "center center",
  },
  "bags-and-accessories": {
    type: "image",
    src: "/live-shopping/categories/bags-and-accessories-v2.jpg",
    objectPosition: "center center",
  },
  "books-and-films": {
    type: "image",
    src: "/live-shopping/categories/books-and-films-v2.jpg",
    objectPosition: "center center",
  },
  "mens-fashion": {
    type: "image",
    src: "/live-shopping/categories/mens-fashion-v2.jpg",
    objectPosition: "center 18%",
  },
  "womens-fashion": {
    type: "image",
    src: "/live-shopping/categories/womens-fashion-v2.jpg",
    objectPosition: "center 16%",
  },
  collectibles: {
    type: "image",
    src: "/live-shopping/categories/collectibles-v2.jpg",
    objectPosition: "center 24%",
  },
  "sneakers-and-shoes": {
    type: "image",
    src: "/live-shopping/categories/sneakers-and-shoes-v2.jpg",
    objectPosition: "center center",
  },
  "toys-and-hobbies": {
    type: "image",
    src: "/live-shopping/categories/toys-and-hobbies-v2.jpg",
    objectPosition: "center 18%",
  },
  "sports-cards": {
    type: "image",
    src: "/live-shopping/categories/sports-cards-v2.jpg",
    objectPosition: "center center",
  },
  comics: {
    type: "image",
    src: "/live-shopping/categories/comics-v2.jpg",
    objectPosition: "center center",
  },
  beauty: {
    type: "image",
    src: "/live-shopping/categories/beauty-v2.jpg",
    objectPosition: "center center",
  },
  "art-craft": {
    type: "image",
    src: "/live-shopping/categories/art-craft-v2.jpg",
    objectPosition: "center center",
  },
  "anime-manga": {
    type: "image",
    src: "/live-shopping/categories/anime-manga-v2.jpg",
    objectPosition: "center center",
  },
};

function getCategoryLoopingMedia(categoryId: string): CategoryLoopingMediaAsset {
  return categoryLoopingMediaById[categoryId] ?? {
    type: "image",
    src: `/live-shopping/categories/${categoryId}-v2.jpg`,
    objectPosition: "center center",
  };
}

function euros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function count(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function viewers(value: number) {
  return value >= 1000 ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value / 1000)} k` : count(value);
}

function audiencePrimary(label: string) {
  return label.replace(/\s*Spectateurs?$/i, "");
}

function inventoryProductToLot(product: LiveInventoryProduct): LiveShoppingLot {
  return {
    id: product.id,
    title: product.title,
    subtitle: product.description,
    cover: product.cover,
    mode: product.mode,
    price: product.price,
    currentBid: product.currentBid ?? undefined,
    bidIncrement: product.bidIncrement ?? undefined,
    stock: product.quantity,
    delivery: product.deliveryProfile,
  };
}

function CategoryLoopingMediaPreview({
  categoryId,
  theme,
  delay,
}: {
  categoryId: string;
  theme: (typeof categoryTileThemes)[number];
  delay: string;
}) {
  const media = getCategoryLoopingMedia(categoryId);

  return (
    <div
      className="live-shopping-category-image-shell absolute inset-[10px]"
      style={{
        boxShadow: `0 18px 34px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.78)`,
      }}
    >
      {media.type === "video" ? (
        <video
          key={media.src}
          className="live-shopping-category-video"
          src={media.src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={media.poster}
        />
      ) : (
        <Image
          src={media.src}
          alt=""
          fill
          sizes="240px"
          className="live-shopping-category-image object-cover"
          style={{ objectPosition: media.objectPosition }}
        />
      )}
      <div className="live-shopping-category-overlay absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 50%, rgba(8,12,20,0.1) 100%)" }} />
      <div className="live-shopping-category-frame absolute inset-0 rounded-[6px]" />
      <div className="live-shopping-category-shine absolute -left-[34%] top-0 h-full w-[42%]" style={{ animationDelay: delay }} />
    </div>
  );
}

// Kept temporarily while we migrate category cards to real media category by category.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CategoryAnimatedCover({
  categoryId,
  theme,
  delay,
}: {
  categoryId: string;
  theme: (typeof categoryTileThemes)[number];
  delay: string;
}) {
  const preset = categoryCoverPresets[categoryId] ?? categoryCoverPresets.misc;
  const [main, second = "✨", third = "✨"] = preset.items;

  return (
    <div className="live-shopping-category-visual absolute inset-0">
      <div className="live-shopping-category-visual-glow live-shopping-category-visual-glow-a" style={{ background: `radial-gradient(circle, ${theme.orbA} 0%, rgba(255,255,255,0) 72%)` }} />
      <div className="live-shopping-category-visual-glow live-shopping-category-visual-glow-b" style={{ background: `radial-gradient(circle, ${theme.orbB} 0%, rgba(255,255,255,0) 72%)`, animationDelay: delay }} />

      {preset.layout === "stack" ? (
        <>
          <div className="live-shopping-category-cardplate live-shopping-category-cardplate-left" style={{ ["--cover-delay" as string]: delay, background: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, ${theme.accentSoft} 100%)` }}>
            <span className="live-shopping-category-emoji text-[58px]">{second}</span>
          </div>
          <div className="live-shopping-category-cardplate live-shopping-category-cardplate-right" style={{ ["--cover-delay" as string]: `${Number.parseFloat(delay) + 0.18 || 0.18}s`, background: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, ${theme.accentSoft} 100%)` }}>
            <span className="live-shopping-category-emoji text-[54px]">{third}</span>
          </div>
          <div className="live-shopping-category-cardplate live-shopping-category-cardplate-main" style={{ ["--cover-delay" as string]: "0s", background: `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, ${theme.edge} 100%)` }}>
            <span className="live-shopping-category-emoji text-[72px]">{main}</span>
          </div>
        </>
      ) : preset.layout === "duo" ? (
        <>
          <div className="live-shopping-category-cardplate live-shopping-category-cardplate-duo-left" style={{ ["--cover-delay" as string]: delay, background: `linear-gradient(180deg, rgba(255,255,255,0.94) 0%, ${theme.accentSoft} 100%)` }}>
            <span className="live-shopping-category-emoji text-[72px]">{main}</span>
          </div>
          <div className="live-shopping-category-cardplate live-shopping-category-cardplate-duo-right" style={{ ["--cover-delay" as string]: `${Number.parseFloat(delay) + 0.2 || 0.2}s`, background: `linear-gradient(180deg, rgba(255,255,255,0.94) 0%, ${theme.edge} 100%)` }}>
            <span className="live-shopping-category-emoji text-[64px]">{second}</span>
          </div>
          <span className="live-shopping-category-spark live-shopping-category-spark-center" style={{ ["--cover-delay" as string]: "0.15s", color: theme.accent }}>{third}</span>
        </>
      ) : (
        <>
          <div className="live-shopping-category-cardplate live-shopping-category-cardplate-spotlight" style={{ ["--cover-delay" as string]: delay, background: `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, ${theme.edge} 100%)` }}>
            <span className="live-shopping-category-emoji text-[84px]">{main}</span>
          </div>
          <span className="live-shopping-category-spark live-shopping-category-spark-left" style={{ ["--cover-delay" as string]: "0.2s", color: theme.accent }}>{second}</span>
          <span className="live-shopping-category-spark live-shopping-category-spark-right" style={{ ["--cover-delay" as string]: "0.45s", color: theme.accent }}>{third}</span>
        </>
      )}
    </div>
  );
}

function lotCurrentBid(lot: LiveShoppingLot, roomState?: LiveShoppingRoomState | null) {
  if (lot.mode !== "auction") {
    return lot.price;
  }

  const runtimeCurrentBid = roomState?.lotStates[lot.id]?.currentBid;
  return Math.max(lot.currentBid ?? lot.price, runtimeCurrentBid ?? lot.currentBid ?? lot.price);
}

function lotPrice(lot: LiveShoppingLot, roomState?: LiveShoppingRoomState | null) {
  return euros(lot.mode === "auction" ? lotCurrentBid(lot, roomState) : lot.price);
}

function nextBid(lot: LiveShoppingLot, roomState?: LiveShoppingRoomState | null) {
  return lotCurrentBid(lot, roomState) + (lot.bidIncrement ?? 5);
}

function bidChoices(lot: LiveShoppingLot) {
  const start = nextBid(lot);
  const increment = lot.bidIncrement ?? 1;
  return [start, start + increment, start + increment * 2, start + increment * 3];
}

function bidCount(lot: LiveShoppingLot) {
  if (lot.mode !== "auction") return 0;
  const current = lot.currentBid ?? lot.price;
  const increment = lot.bidIncrement ?? 1;
  return Math.max(0, Math.round((current - lot.price) / increment));
}

function liveFees(lot: LiveShoppingLot) {
  return Math.max(4, Math.round((lot.currentBid ?? lot.price) * 0.08));
}

function bidEstimate(lot: LiveShoppingLot, amount: number) {
  return amount + liveFees(lot);
}

function audienceValue(label: string) {
  const normalized = label.replace(/\s/g, "").replace(",", ".");
  const k = normalized.match(/([\d.]+)k/i);
  if (k) return Math.round(Number(k[1]) * 1000);
  const direct = normalized.match(/(\d+)/);
  return direct ? Number(direct[1]) : 0;
}

function toScheduleTimestamp(item: Pick<LiveShoppingScheduledLive, "liveDate" | "liveTime">) {
  if (!item.liveDate) {
    return 0;
  }

  const raw = `${item.liveDate}T${item.liveTime || "00:00"}`;
  const value = Date.parse(raw);
  return Number.isNaN(value) ? 0 : value;
}

function formatScheduledLiveDate(item: Pick<LiveShoppingScheduledLive, "liveDate" | "liveTime">) {
  const timestamp = toScheduleTimestamp(item);
  if (timestamp === 0) {
    return "Date a confirmer";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

const scheduledLiveSlugPrefix = "scheduled-live-";

const scheduledLiveStateLabels = {
  scheduled: "Planifie",
  live: "En direct",
  paused: "En pause",
  ended: "Termine",
} as const;

type ScheduledLiveRuntimeState = keyof typeof scheduledLiveStateLabels;

function getScheduledLiveRuntimeSlug(scheduleId: string) {
  return `${scheduledLiveSlugPrefix}${scheduleId}`;
}

function getScheduleIdFromRuntimeSlug(slug: string) {
  if (!slug.startsWith(scheduledLiveSlugPrefix)) {
    return null;
  }

  const scheduleId = slug.slice(scheduledLiveSlugPrefix.length);
  return scheduleId.length > 0 ? scheduleId : null;
}

function getInventorySlugAliasesForLive(slug: string) {
  const scheduleId = getScheduleIdFromRuntimeSlug(slug);
  if (!scheduleId) {
    return [slug];
  }

  return [slug, `schedule:${scheduleId}`];
}

function getScheduledLiveRuntimeState(item: LiveShoppingScheduledLive): ScheduledLiveRuntimeState {
  return item.liveState;
}

function getScheduledLiveRuntimeBadgeClass(state: ScheduledLiveRuntimeState) {
  if (state === "live") {
    return "border-[#ffd7d9] bg-[#fff5f5] text-[#b34354]";
  }

  if (state === "paused") {
    return "border-[#ffe6bf] bg-[#fff8ec] text-[#a66a0f]";
  }

  if (state === "ended") {
    return "border-[#e3e8f2] bg-[#f7f9fc] text-[#70819a]";
  }

  return "border-[#d7e4f7] bg-[#f7fbff] text-[#2b6fff]";
}

function withScheduledLiveRuntimeState({
  item,
  state,
}: {
  item: LiveShoppingScheduledLive;
  state: ScheduledLiveRuntimeState;
}) {
  const now = Date.now();
  return normalizeLiveShoppingScheduledLive({
    ...item,
    liveState: state,
    liveSessionSlug: getScheduledLiveRuntimeSlug(item.id),
    liveSessionStartedAt: state === "live" ? item.liveSessionStartedAt ?? now : item.liveSessionStartedAt,
    liveSessionUpdatedAt: now,
    updatedAt: now,
  });
}

function getLiveShoppingShareHref(event: Pick<LiveShoppingEvent, "slug">) {
  const scheduleId = getScheduleIdFromRuntimeSlug(event.slug);
  if (scheduleId) {
    return `/live-shopping/session/${encodeURIComponent(scheduleId)}`;
  }

  return getLiveShoppingHref(event);
}

function getStartEventForScheduledLive({
  item,
  events,
}: {
  item: LiveShoppingScheduledLive;
  events: LiveShoppingEvent[];
}) {
  const sameCategoryLive = events.find(
    (event) => event.categoryId === item.categoryId && event.status === "live",
  );

  if (sameCategoryLive) {
    return sameCategoryLive;
  }

  const sameCategoryAny = events.find((event) => event.categoryId === item.categoryId);
  if (sameCategoryAny) {
    return sameCategoryAny;
  }

  return events[0] ?? null;
}

function createRuntimeEventFromScheduledLive({
  item,
  events,
}: {
  item: LiveShoppingScheduledLive;
  events: LiveShoppingEvent[];
}) {
  const runtimeSlug = getScheduledLiveRuntimeSlug(item.id);
  const existing = events.find((event) => event.slug === runtimeSlug);

  if (existing) {
    return existing;
  }

  const template = getStartEventForScheduledLive({ item, events }) ?? liveShoppingEvents[0] ?? null;
  if (!template) {
    return null;
  }

  const nextId = Math.max(0, ...events.map((event) => event.id)) + 1;
  const startsAsAuction = /enchere/i.test(item.saleFormat);

  return {
    ...template,
    id: nextId,
    slug: runtimeSlug,
    title: item.title,
    subtitle:
      item.tags.length > 0
        ? `Session live programmee · ${item.tags.slice(0, 2).join(" · ")}`
        : template.subtitle,
    categoryId: item.categoryId,
    category: item.categoryLabel,
    status: "live",
    tags: item.tags.length > 0 ? item.tags : template.tags,
    liveBadge: "Live - 1",
    heroNote: `Session programmee · ${item.saleFormat.toLowerCase()} · ${item.repeatValue.toLowerCase()}.`,
    items: startsAsAuction
      ? template.items.map((lot) => ({
          ...lot,
          mode: "auction",
          currentBid: lot.currentBid ?? lot.price,
        }))
      : template.items,
    chat:
      item.moderators.length > 0
        ? [
            {
              id: nextId * 1000,
              author: item.moderators[0],
              body: `Live "${item.title}" ouvert. Bienvenue dans la salle.`,
              mod: true,
            },
            ...template.chat,
          ]
        : template.chat,
  } satisfies LiveShoppingEvent;
}

function mergeRuntimeEventWithScheduledLive({
  event,
  item,
}: {
  event: LiveShoppingEvent;
  item: LiveShoppingScheduledLive;
}) {
  return {
    ...event,
    title: item.title,
    subtitle:
      item.tags.length > 0
        ? `Session live programmee · ${item.tags.slice(0, 2).join(" · ")}`
        : event.subtitle,
    categoryId: item.categoryId,
    category: item.categoryLabel,
    tags: item.tags.length > 0 ? item.tags : event.tags,
    heroNote: `Session programmee · ${item.saleFormat.toLowerCase()} · ${item.repeatValue.toLowerCase()}.`,
  } satisfies LiveShoppingEvent;
}

type LiveShoppingActionApiResult = {
  ok?: boolean;
  message?: string;
  acceptedBid?: number;
  minimumBid?: number;
  remainingStock?: number;
  orders?: LiveShoppingOrder[];
  inventory?: LiveInventoryProduct[];
  roomState?: LiveShoppingRoomState;
};
type LiveShoppingPresenceSnapshot = {
  eventId: number | null;
  totalConnections: number;
  totalUsers: number;
  updatedAt: number;
};

async function submitLiveShoppingAction(payload: {
  action: "place_bid" | "checkout";
  eventId: number;
  liveSlug?: string;
  eventSeller: string;
  lot: LiveShoppingLot;
  amount?: number;
  quantity?: number;
  note?: string;
  paymentMethod?: LiveShoppingPaymentMethod;
  idempotencyKey?: string;
}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (payload.idempotencyKey) {
    headers["x-idempotency-key"] = payload.idempotencyKey;
  }

  try {
    const response = await fetch("/api/live-shopping/actions", {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as LiveShoppingActionApiResult;
    return {
      ok: response.ok && body.ok !== false,
      status: response.status,
      body,
      replayed: response.headers.get("x-idempotency-replayed") === "1",
    };
  } catch {
    return {
      ok: false,
      status: 0,
      body: {
        message: "Le service live est indisponible. Reessaie dans quelques secondes.",
      } satisfies LiveShoppingActionApiResult,
      replayed: false,
    };
  }
}

type LiveShoppingChatApiResult = {
  ok?: boolean;
  message?: string;
  roomState?: LiveShoppingRoomState;
  chatMessage?: LiveShoppingChatMessage;
};

type LiveShoppingRoomStateApiResult = {
  eventId?: number;
  message?: string;
  roomState?: LiveShoppingRoomState;
  userId?: string;
};

async function readLiveShoppingRoomStateFromApi(eventId: number) {
  try {
    const response = await fetch(`/api/live-shopping/chat?eventId=${eventId}`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    const payload = (await response.json()) as LiveShoppingRoomStateApiResult;
    return {
      ok: response.ok,
      status: response.status,
      body: payload,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      body: {
        message: "Impossible de charger l etat live pour le moment.",
      } satisfies LiveShoppingRoomStateApiResult,
    };
  }
}

async function submitLiveShoppingChatMessage({
  eventId,
  body,
}: {
  eventId: number;
  body: string;
}) {
  try {
    const response = await fetch("/api/live-shopping/chat", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        body,
      }),
    });

    const payload = (await response.json()) as LiveShoppingChatApiResult;
    return {
      ok: response.ok && payload.ok !== false,
      status: response.status,
      body: payload,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      body: {
        message: "Impossible d envoyer le message pour le moment.",
      } satisfies LiveShoppingChatApiResult,
    };
  }
}

function createActionIdempotencyKey(action: "place_bid" | "checkout", lotId: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${action}:${lotId}:${globalThis.crypto.randomUUID()}`;
  }

  return `${action}:${lotId}:${Date.now()}:${Math.trunc(Math.random() * 1_000_000)}`;
}

export function LiveHeader({
  onNavClick,
  onProfileClick,
  onCreateClick,
  onNotificationsClick,
  onMessagesClick,
  onMenuClick,
}: {
  onNavClick: (item: HeaderNavItemId) => void;
  onProfileClick: () => void;
  onCreateClick?: () => void;
  onNotificationsClick?: () => void;
  onMessagesClick?: () => void;
  onMenuClick?: () => void;
}) {
  return (
    <header className="fixed left-1/2 top-0 z-[120] h-[73px] w-[1440px] -translate-x-1/2">
      <div className="absolute left-0 top-0 h-[61px] w-[1440px] bg-[rgba(255,255,255,0.92)] backdrop-blur-[13px]" />
      <div className="relative h-full">
        <Image src="/figma-assets/logo-mark.png" alt="Pictomag" width={30} height={29} className="absolute left-[54px] top-[23px]" />
        <Image src="/figma-assets/brand-wordmark.svg" alt="Pictomag" width={84} height={32} className="absolute left-[94px] top-[24px]" />
        <AnimatedHeaderNav activeItemId="watch" onItemClick={onNavClick} />
        <div className="absolute left-[1180px] top-6 h-6 w-[108px]">
          {topActions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              onClick={
                item.id === "create"
                  ? onCreateClick
                  : item.id === "notifications"
                    ? onNotificationsClick
                    : onMessagesClick
              }
              className="absolute top-0 h-6 w-6"
              style={{ left: `${item.left}px` }}
            >
              <Image src={item.src} alt="" width={24} height={24} unoptimized className="h-6 w-6" />
            </button>
          ))}
        </div>
        <div className="absolute left-[1315px] top-[21px] h-8 w-px bg-[rgba(16,21,34,0.18)]" />
        <button
          type="button"
          aria-label="Menu"
          onClick={onMenuClick}
          className="absolute left-[1342px] top-6 h-6 w-6"
        >
          <Image src="/figma-assets/top-menu.svg" alt="" width={24} height={24} unoptimized className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label="Profil"
          onClick={onProfileClick}
          className="absolute left-[1392px] top-[20px] h-8 w-8 overflow-hidden rounded-full"
        >
          <Image src="/figma-assets/avatar-story.png" alt="Profil" fill sizes="32px" className="object-cover" />
        </button>
      </div>
    </header>
  );
}

function CheckoutModal({
  event,
  lot,
  method,
  note,
  onMethod,
  onNote,
  onClose,
  onConfirm,
}: {
  event: LiveShoppingEvent;
  lot: LiveShoppingLot;
  method: LiveShoppingPaymentMethod;
  note: string;
  onMethod: (value: LiveShoppingPaymentMethod) => void;
  onNote: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  const fees = Math.max(4, Math.round(lot.price * 0.05));
  const total = lot.price + fees;
  return createPortal(
    <div className="fixed inset-0 z-[260]">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-[rgba(7,10,18,0.52)] backdrop-blur-[6px]" onClick={onClose} />
      <div data-testid="live-checkout-modal" className="absolute left-1/2 top-1/2 w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-black/10 bg-white shadow-[0_38px_90px_rgba(8,12,24,0.18)]">
        <div className="flex items-center justify-between border-b border-black/8 px-7 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70829a]">Checkout live</p>
            <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#101522]">{lot.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-[1fr_340px] gap-0">
          <div className="border-r border-black/8 px-7 py-6">
            <div className="flex gap-4 rounded-[10px] border border-black/8 p-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-[8px] bg-black"><Image src={lot.cover} alt={lot.title} fill sizes="96px" className="object-cover" /></div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#70829a]">{event.seller}</p>
                <p className="mt-2 text-[22px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#101522]">{lot.title}</p>
                <p className="mt-2 text-[13px] leading-6 text-[#556477]">{lot.subtitle}</p>
              </div>
            </div>
            <textarea data-testid="live-checkout-note" value={note} onChange={(e) => onNote(e.target.value)} placeholder="Ajoute une note au vendeur..." className="mt-5 h-28 w-full resize-none rounded-[10px] border border-black/8 px-4 py-3 text-[14px] leading-6 text-[#101522] outline-none placeholder:text-[#9aa6b7]" />
          </div>
          <div className="px-7 py-6">
            <p className="text-[14px] font-semibold text-[#101522]">Paiement</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(["card", "wallet", "bank"] as LiveShoppingPaymentMethod[]).map((item) => (
                <button key={item} data-testid={`live-checkout-payment-${item}`} type="button" onClick={() => onMethod(item)} className={`rounded-[10px] border px-3 py-3 text-[13px] font-semibold ${method === item ? "border-[#2b6fff] bg-[#eef4ff] text-[#2b6fff]" : "border-black/8 text-[#101522]"}`}>
                  {item === "card" ? "Carte" : item === "wallet" ? "Wallet" : "Virement"}
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-3 border-t border-black/8 pt-4 text-[13px] text-[#556477]">
              <div className="flex items-center justify-between"><span>Lot</span><span className="font-semibold text-[#101522]">{euros(lot.price)}</span></div>
              <div className="flex items-center justify-between"><span>Frais live</span><span className="font-semibold text-[#101522]">{euros(fees)}</span></div>
              <div className="flex items-center justify-between pt-1 text-[18px]"><span className="font-semibold text-[#101522]">Total</span><span className="font-semibold text-[#101522]">{euros(total)}</span></div>
            </div>
            <button data-testid="live-checkout-confirm" type="button" onClick={onConfirm} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#2b6fff] px-5 py-3 text-[14px] font-semibold text-white">Confirmer <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BidModal({
  lot,
  value,
  variant = "standard",
  onValue,
  onClose,
  onConfirm,
}: {
  lot: LiveShoppingLot;
  value: string;
  variant?: "standard" | "custom";
  onValue: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  const quickChoices = bidChoices(lot);
  const parsedBid = Number.parseInt(value, 10);
  const minimum = nextBid(lot);
  const increment = lot.bidIncrement ?? 1;
  const hasBid = Number.isFinite(parsedBid);
  const validBid = hasBid && parsedBid >= minimum ? parsedBid : null;
  const displayBid = validBid ?? minimum;
  const totalEstimate = bidEstimate(lot, displayBid);
  const statusTone =
    validBid == null
      ? "border-[#ffe2c4] bg-[#fff8ef] text-[#a65d00]"
      : validBid === minimum
        ? "border-[#dce8ff] bg-[#f5f9ff] text-[#2b6fff]"
        : "border-[#d9f0e7] bg-[#f3fbf7] text-[#158a5f]";
  const statusTitle =
    validBid == null
      ? `Mise minimum ${euros(minimum)}`
      : validBid === minimum
        ? "Tu prends la prochaine marche"
        : "Ta limite max couvre les prochaines surencheres";

  return createPortal(
    <div className="fixed inset-0 z-[270]">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-[rgba(7,10,18,0.52)] backdrop-blur-[6px]" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[940px] max-w-[calc(100vw-48px)] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-black/10 bg-white p-7 shadow-[0_38px_90px_rgba(8,12,24,0.18)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[32px] font-semibold tracking-[-0.05em] text-[#101522]">
              {variant === "custom" ? "Enchere personnalisee" : "Saisis ton enchere"}
            </p>
            <p className="mt-2 text-[14px] text-[#7c889c]">
              {variant === "custom"
                ? "Definis une enchere max. Le systeme continuera a reagir pour toi tant que ton plafond n est pas atteint."
                : "Prends un palier rapide ou saisis un montant exact pour rejoindre la vente sans friction."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_300px] gap-6">
          <div className="min-w-0">
            <div className="flex items-start gap-4 rounded-[10px] border border-[#edf1f7] p-4">
              <div className="relative h-36 w-28 overflow-hidden rounded-[8px] bg-[#f2f5fa]">
                <Image src={lot.cover} alt={lot.title} fill sizes="112px" className="object-cover" />
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-[28px] font-semibold tracking-[-0.04em] text-[#101522]">{lot.title}</p>
                <p className="mt-2 text-[15px] leading-6 text-[#7c889c]">{lot.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#e3e8f2] px-3 py-1.5 text-[13px] font-medium text-[#101522]">
                    Prix en tete {lotPrice(lot)}
                  </span>
                  <span className="rounded-full border border-[#e3e8f2] px-3 py-1.5 text-[13px] font-medium text-[#101522]">
                    Increm. {euros(increment)}
                  </span>
                  <span className="rounded-full border border-[#e3e8f2] px-3 py-1.5 text-[13px] font-medium text-[#101522]">
                    {count(lot.stock)} dispo
                  </span>
                </div>
              </div>
            </div>

            <div className={`mt-4 flex items-start gap-3 rounded-[10px] border px-4 py-3 text-[14px] ${statusTone}`}>
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">{statusTitle}</p>
                <p className="mt-1 text-[13px] opacity-80">
                  {variant === "custom"
                    ? "Le live pourra surencherir pour toi automatiquement jusqu a ce plafond."
                    : "Tu peux aussi definir une limite plus haute si tu veux proteger ta place plus longtemps."}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[10px] border border-[#edf1f7] p-5">
              <p className="text-[15px] font-medium text-[#101522]">Selectionne le montant de l enchere</p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {quickChoices.map((choice) => {
                  const active = parsedBid === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => onValue(String(choice))}
                      className={`rounded-[8px] border px-4 py-3 text-[18px] font-semibold transition ${
                        active
                          ? "border-[#101522] bg-[#3b3b3b] text-white"
                          : "border-[#e3e8f2] bg-white text-[#101522] hover:border-[#cfd8e8]"
                      }`}
                    >
                      {euros(choice)}
                    </button>
                  );
                })}
              </div>
              <div className="my-4 text-center text-[13px] font-medium uppercase tracking-[0.18em] text-[#a6b0bf]">Ou</div>
              <div className="rounded-[10px] border border-[#edf1f7] p-4">
                <label className="block text-[14px] font-medium text-[#101522]">
                  {variant === "custom" ? "Saisir l enchere maximale" : "Saisir ton montant"}
                </label>
                <div className="mt-3 flex h-[58px] items-center rounded-[8px] border border-[#dfe6f1] px-4">
                  <span className="mr-3 text-[18px] font-semibold text-[#7c889c]">EUR</span>
                  <input
                    value={value}
                    onChange={(e) => onValue(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    placeholder={String(minimum)}
                    className="h-full w-full bg-transparent text-[28px] font-semibold text-[#101522] outline-none placeholder:text-[#b5bfce]"
                  />
                </div>
                <div className="mt-3 flex items-start gap-2 text-[14px] leading-6 text-[#7c889c]">
                  <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d5ddeb] text-[12px]">i</span>
                  <span>
                    Saisis un montant de {euros(minimum)} ou plus. Nous encherirons automatiquement a ta place jusqu a ce montant.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[10px] border border-[#edf1f7] bg-[#fafbfd] p-5">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#8aa0bd]">Resume live</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[10px] border border-[#edf1f7] bg-white p-4">
                <p className="text-[13px] text-[#7c889c]">Enchere actuelle</p>
                <p className="mt-2 text-[30px] font-semibold tracking-[-0.05em] text-[#101522]">{lotPrice(lot)}</p>
              </div>
              <div className="rounded-[10px] border border-[#edf1f7] bg-white p-4">
                <div className="flex items-center gap-2 text-[14px] font-medium text-[#101522]">
                  <Truck className="h-4 w-4 text-[#7c889c]" />
                  Livraison et frais
                </div>
                <p className="mt-3 text-[14px] text-[#7c889c]">Livraison {lot.delivery}</p>
                <p className="mt-1 text-[18px] font-semibold text-[#101522]">{euros(liveFees(lot))} + taxes</p>
              </div>
              <div className="rounded-[10px] border border-[#edf1f7] bg-white p-4">
                <div className="flex items-center gap-2 text-[14px] font-medium text-[#101522]">
                  <ShieldCheck className="h-4 w-4 text-[#2b6fff]" />
                  Estimation totale
                </div>
                <p className="mt-3 text-[30px] font-semibold tracking-[-0.05em] text-[#101522]">{euros(totalEstimate)}</p>
                <p className="mt-2 text-[13px] leading-6 text-[#7c889c]">
                  {variant === "custom"
                    ? "Le montant bloque correspond a ta limite max, pas forcement au prix final paye."
                    : "Tu pourras encore monter plus haut plus tard si quelqu un passe devant."}
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-[16px] font-medium text-[#101522]">
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={validBid == null}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-[18px] font-semibold ${
              validBid == null
                ? "cursor-not-allowed bg-[#f5efb9] text-[#9b9354]"
                : "bg-[#f6dd1f] text-[#101522]"
            }`}
          >
            {variant === "custom"
              ? `Definir l enchere maximale sur ${euros(displayBid)}`
              : `Confirmer et encherir ${euros(displayBid)}`}
          </button>
        </div>
        <div className="mt-5 text-center text-[14px] text-[#7c889c]">
          Les encheres sont definitives. Tu peux augmenter ton offre a tout moment, mais tu ne peux ni la diminuer ni l annuler.
        </div>
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] font-medium text-[#2b6fff]"
          >
            Fonctionnement des encheres maximales
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WalletModal({
  lot,
  paymentMethod,
  onClose,
}: {
  lot: LiveShoppingLot;
  paymentMethod: LiveShoppingPaymentMethod;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  const estimatedTotal = bidEstimate(lot, lot.mode === "auction" ? nextBid(lot) : lot.price);
  return createPortal(
    <div className="fixed inset-0 z-[265]">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-[rgba(7,10,18,0.44)] backdrop-blur-[4px]" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[520px] max-w-[calc(100vw-40px)] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-black/10 bg-white p-5 shadow-[0_28px_72px_rgba(8,12,24,0.16)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[20px] font-semibold tracking-[-0.04em] text-[#101522]">Portefeuille</h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-black/8"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 rounded-[10px] border border-[#dce8ff] bg-[#f6faff] px-4 py-3 text-[14px] text-[#2b6fff]">
          Ton portefeuille est pret pour enchérir et payer sans quitter le live.
        </div>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-between rounded-[10px] border border-[#edf1f7] px-4 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6f8fc]">
                <CreditCard className="h-5 w-5 text-[#101522]" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[#101522]">Moyen de paiement</p>
                <p className="text-[13px] text-[#7c889c]">{paymentMethod === "card" ? "Carte Visa •••• 2145" : paymentMethod === "wallet" ? "Wallet Pictomag" : "Virement bancaire"}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#7c889c]" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-between rounded-[10px] border border-[#edf1f7] px-4 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6f8fc]">
                <MapPin className="h-5 w-5 text-[#101522]" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[#101522]">Adresse de livraison</p>
                <p className="text-[13px] text-[#7c889c]">22 Av. des Calanques, 13600 La Ciotat, FR</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#7c889c]" />
          </button>
        </div>
        <div className="mt-5 rounded-[10px] border border-[#edf1f7] bg-[#fafbfd] p-4">
          <div className="flex items-center justify-between text-[14px] text-[#7c889c]">
            <span>Produit selectionne</span>
            <span className="font-semibold text-[#101522]">{lotPrice(lot)}</span>
          </div>
          <p className="mt-2 text-[15px] font-semibold text-[#101522]">{lot.title}</p>
          <div className="mt-4 flex items-center justify-between text-[14px] text-[#7c889c]">
            <span>Estimation avec frais</span>
            <span className="font-semibold text-[#101522]">{euros(estimatedTotal)}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

void BidModal;
void WalletModal;

function LiveBidModal({
  lot,
  value,
  variant = "standard",
  onValue,
  onClose,
  onConfirm,
}: {
  lot: LiveShoppingLot;
  value: string;
  variant?: "standard" | "custom";
  onValue: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const canRender = typeof document !== "undefined";
  const quickChoices = bidChoices(lot);
  const parsedBid = Number.parseInt(value, 10);
  const minimum = nextBid(lot);
  const increment = lot.bidIncrement ?? 1;
  const validBid = Number.isFinite(parsedBid) && parsedBid >= minimum ? parsedBid : null;
  const displayBid = validBid ?? minimum;
  const shippingFees = liveFees(lot);
  const totalEstimate = bidEstimate(lot, displayBid);
  const title = variant === "custom" ? "Enchere personnalisee" : "Saisis ton enchere";
  const helper =
    variant === "custom"
      ? "Definis une enchere maximale. Le live peut continuer a surenchir pour toi tant que ton plafond reste disponible."
      : "Choisis une mise rapide ou saisis un montant exact pour rejoindre la vente sans quitter le direct.";
  const highlight =
    variant === "custom"
      ? `${count(lot.stock)} disponible(s)`
      : `Quelqu un d autre est actuellement en tete avec ${lotPrice(lot)}`;
  const confirmLabel =
    variant === "custom"
      ? `Definir l enchere maximale sur ${euros(displayBid)}`
      : `Confirmer et encherir ${euros(displayBid)}`;
  const [showAuctionGuide, setShowAuctionGuide] = useState(false);
  if (!canRender) return null;

  return createPortal(
    <div className="fixed inset-0 z-[272]">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-[rgba(7,10,18,0.52)] backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div
        data-testid={variant === "custom" ? "live-bid-modal-custom" : "live-bid-modal"}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-black/10 bg-white p-7 shadow-[0_38px_90px_rgba(8,12,24,0.18)] ${
          variant === "custom" ? "w-[660px] max-w-[calc(100vw-40px)]" : "w-[920px] max-w-[calc(100vw-40px)]"
        }`}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[30px] font-semibold tracking-[-0.05em] text-[#101522]">{title}</p>
            <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-[#7c889c]">{helper}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-[10px] border border-[#edf1f7] bg-[#fbfcfe] p-5">
          <div className="flex items-start gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-[8px] bg-[#eff3f8]">
              <Image src={lot.cover} alt={lot.title} fill sizes="96px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#e3e8f2] px-2.5 py-1 text-[12px] font-semibold text-[#101522]">
                  {lot.mode === "auction" ? "Enchere live" : "Achat direct"}
                </span>
                <span className="rounded-full border border-[#e3e8f2] px-2.5 py-1 text-[12px] font-medium text-[#68788f]">
                  Increment {euros(increment)}
                </span>
              </div>
              <p className="mt-3 text-[22px] font-semibold tracking-[-0.04em] text-[#101522]">{lot.title}</p>
              <p className="mt-2 text-[14px] leading-6 text-[#7c889c]">{lot.subtitle}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#e3e8f2] px-3 py-1.5 text-[13px] font-medium text-[#101522]">
                  Prix live {lotPrice(lot)}
                </span>
                <span className="rounded-full border border-[#e3e8f2] px-3 py-1.5 text-[13px] font-medium text-[#101522]">
                  {count(lot.stock)} disponible(s)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[10px] border border-[#edf1f7] px-4 py-3 text-[14px] text-[#5f6f84]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f7f9fc] text-[#101522]">
              <CircleAlert className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-[#101522]">{highlight}</p>
              <p className="mt-1 text-[13px] text-[#7c889c]">
                {variant === "custom"
                  ? "Le systeme pourra surenchir a ta place tant que ton plafond est encore disponible."
                  : "Tu peux aussi definir une limite max si tu veux couvrir les prochaines surencheres automatiquement."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[15px] font-medium text-[#101522]">Selectionne le montant de l enchere</p>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {quickChoices.map((choice) => {
              const active = parsedBid === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  data-testid={`live-bid-choice-${choice}`}
                  onClick={() => onValue(String(choice))}
                  className={`rounded-[8px] border px-4 py-3 text-[18px] font-semibold transition ${
                    active
                      ? "border-[#101522] bg-[#3b3b3b] text-white"
                      : "border-[#e3e8f2] bg-white text-[#101522] hover:border-[#cfd8e8]"
                  }`}
                >
                  {euros(choice)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="my-5 text-center text-[13px] font-medium uppercase tracking-[0.18em] text-[#a6b0bf]">Ou</div>

        <div className="rounded-[10px] border border-[#edf1f7] p-5">
          <label className="block text-[15px] font-medium text-[#101522]">Saisir l enchere maximale</label>
          <div className="mt-3 flex h-[58px] items-center rounded-[8px] border border-[#dfe6f1] px-4">
            <span className="mr-3 text-[18px] font-semibold text-[#7c889c]">EUR</span>
            <input
              value={value}
              onChange={(e) => onValue(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder={String(minimum)}
              data-testid={variant === "custom" ? "live-bid-input-custom" : "live-bid-input"}
              className="h-full w-full bg-transparent text-[28px] font-semibold text-[#101522] outline-none placeholder:text-[#b5bfce]"
            />
          </div>
          <p className="mt-3 text-[13px] leading-6 text-[#7c889c]">
            Saisis un montant de {euros(minimum)} ou plus. Nous encherirons automatiquement a ta place jusqu a ce montant pendant la vente.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 rounded-[10px] border border-[#edf1f7] bg-[#fafbfd] p-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">Enchere</p>
            <p className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">{euros(displayBid)}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">Livraison</p>
            <p className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">{euros(shippingFees)}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">Total estime</p>
            <p className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">{euros(totalEstimate)}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-[16px] font-medium text-[#101522]">
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid={variant === "custom" ? "live-bid-confirm-custom" : "live-bid-confirm"}
            disabled={validBid == null}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-[18px] font-semibold ${
              validBid == null
                ? "cursor-not-allowed bg-[#f5efb9] text-[#9b9354]"
                : "bg-[#f6dd1f] text-[#101522]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>

        <div className="mt-5 text-center text-[14px] text-[#7c889c]">
          Les encheres sont definitives. Tu peux augmenter ton offre a tout moment, mais tu ne peux ni la diminuer ni l annuler.
        </div>
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowAuctionGuide((current) => !current)}
            className="text-[14px] font-medium text-[#2b6fff]"
          >
            {showAuctionGuide ? "Masquer le guide d enchere" : "Fonctionnement des encheres maximales"}
          </button>
        </div>
        {showAuctionGuide ? (
          <div className="mt-3 rounded-[10px] border border-[#dce8ff] bg-[#f5f9ff] p-4 text-left">
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#5d7fae]">Guide express</p>
            <ul className="mt-2 space-y-1 text-[13px] leading-6 text-[#4c637f]">
              <li>1. Ta limite max reste privee pendant le live.</li>
              <li>2. Le systeme surenchérit seulement si quelqu un passe devant toi.</li>
              <li>3. La vente s arrete si ta limite est atteinte ou si tu gagnes le lot.</li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function LiveWalletModal({
  lot,
  paymentMethod,
  onPaymentMethodChange,
  onClose,
}: {
  lot: LiveShoppingLot;
  paymentMethod: LiveShoppingPaymentMethod;
  onPaymentMethodChange?: (method: LiveShoppingPaymentMethod) => void;
  onClose: () => void;
}) {
  const canRender = typeof document !== "undefined";
  const [activeEditor, setActiveEditor] = useState<"payment" | "shipping" | null>(null);
  const [shippingAddress, setShippingAddress] = useState("22 Av. des Calanques, 13600 La Ciotat, FR");
  const [localPaymentMethod, setLocalPaymentMethod] = useState<LiveShoppingPaymentMethod>(paymentMethod);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);
  useEffect(() => {
    setLocalPaymentMethod(paymentMethod);
  }, [paymentMethod]);
  if (!canRender) return null;
  const estimatedAmount = lot.mode === "auction" ? nextBid(lot) : lot.price;
  const estimatedTotal = bidEstimate(lot, estimatedAmount);
  const paymentLabel =
    localPaymentMethod === "card"
      ? "Carte Visa - 2145"
      : localPaymentMethod === "wallet"
        ? "Wallet Pictomag"
        : "Virement bancaire";

  return createPortal(
    <div className="fixed inset-0 z-[266]">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-[rgba(7,10,18,0.44)] backdrop-blur-[4px]"
        onClick={onClose}
      />
      <div data-testid="live-wallet-modal" className="absolute left-1/2 top-1/2 w-[520px] max-w-[calc(100vw-40px)] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-black/10 bg-white p-5 shadow-[0_28px_72px_rgba(8,12,24,0.16)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[20px] font-semibold tracking-[-0.04em] text-[#101522]">Portefeuille</h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-black/8">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => setActiveEditor((current) => (current === "payment" ? null : "payment"))}
            data-testid="live-wallet-payment-panel-toggle"
            className="flex w-full items-center justify-between rounded-[10px] border border-[#edf1f7] px-4 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6f8fc]">
                <CreditCard className="h-5 w-5 text-[#101522]" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[#101522]">Moyen de paiement</p>
                <p className="text-[13px] text-[#7c889c]">{paymentLabel}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#7c889c]" />
          </button>
          {activeEditor === "payment" ? (
            <div className="rounded-[10px] border border-[#dce8ff] bg-[#f7fbff] p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6f88ad]">Choisir le moyen de paiement</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { id: "card", label: "Carte" },
                  { id: "wallet", label: "Wallet" },
                  { id: "bank", label: "Virement" },
                ].map((option) => {
                  const active = localPaymentMethod === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      data-testid={`live-wallet-payment-${option.id}`}
                      onClick={() => {
                        const nextMethod = option.id as LiveShoppingPaymentMethod;
                        setLocalPaymentMethod(nextMethod);
                        onPaymentMethodChange?.(nextMethod);
                      }}
                      className={`rounded-[8px] border px-3 py-2 text-[13px] font-medium transition ${
                        active
                          ? "border-[#2b6fff] bg-[#edf4ff] text-[#101522]"
                          : "border-[#dbe4f2] bg-white text-[#5f6f84] hover:border-[#b9cce8]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setActiveEditor((current) => (current === "shipping" ? null : "shipping"))}
            className="flex w-full items-center justify-between rounded-[10px] border border-[#edf1f7] px-4 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6f8fc]">
                <MapPin className="h-5 w-5 text-[#101522]" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[#101522]">Adresse de livraison</p>
                <p className="text-[13px] text-[#7c889c]">{shippingAddress}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#7c889c]" />
          </button>
          {activeEditor === "shipping" ? (
            <div className="rounded-[10px] border border-[#dce8ff] bg-[#f7fbff] p-3">
              <label className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6f88ad]">
                Adresse de livraison
              </label>
              <textarea
                value={shippingAddress}
                onChange={(event) => setShippingAddress(event.target.value)}
                rows={2}
                className="mt-3 w-full resize-none rounded-[8px] border border-[#dbe4f2] bg-white px-3 py-2 text-[13px] text-[#101522] outline-none focus:border-[#2b6fff]"
              />
              <p className="mt-2 text-[12px] text-[#6f8098]">Cette adresse sera reprise pour les prochaines commandes live.</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-[10px] border border-[#edf1f7] bg-[#fafbfd] p-4">
          <div className="flex items-start gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-[8px] bg-[#edf2f7]">
              <Image src={lot.cover} alt={lot.title} fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="line-clamp-2 text-[15px] font-semibold text-[#101522]">{lot.title}</p>
                <span className="text-[15px] font-semibold text-[#101522]">{lotPrice(lot)}</span>
              </div>
              <p className="mt-1 text-[13px] text-[#7c889c]">{lot.mode === "auction" ? "Enchere live" : "Achat direct"}</p>
              <div className="mt-3 flex items-center justify-between text-[14px] text-[#7c889c]">
                <span>Total estime avec frais</span>
                <span className="font-semibold text-[#101522]">{euros(estimatedTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-full bg-[#101522] px-5 py-3 text-[15px] font-semibold text-white">
            Continuer le live
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function LiveShoppingPage({
  initialSlug = null,
  initialCategoryId = null,
  initialStartLiveId = null,
}: {
  initialSlug?: string | null;
  initialCategoryId?: string | null;
  initialStartLiveId?: string | null;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(liveShoppingEvents);
  const [, setOrders] = useState<LiveShoppingOrder[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<LiveInventoryProduct[]>([]);
  const [browseTab, setBrowseTab] = useState<LiveShoppingBrowseTab["id"]>("recommended");
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [searchQuery] = useState("");
  const [roomQuery, setRoomQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState<LiveShoppingRoomFilter>(liveShoppingPreferencesDefaults.roomFilter);
  const [roomSortMode, setRoomSortMode] = useState<LiveShoppingRoomSortMode>(liveShoppingPreferencesDefaults.roomSortMode);
  const [inventoryUtilityPanel, setInventoryUtilityPanel] = useState<"filter" | "sort" | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [savedLotIds, setSavedLotIds] = useState<string[]>([]);
  const [followedRoomIds, setFollowedRoomIds] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<LiveShoppingPaymentMethod>(
    liveShoppingPreferencesDefaults.paymentMethod,
  );
  const [buyerNote, setBuyerNote] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bidOpen, setBidOpen] = useState(false);
  const [customBidOpen, setCustomBidOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [bidValue, setBidValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [sideTab, setSideTab] = useState<"chat" | "watch">("chat");
  const [roomStateByEventId, setRoomStateByEventId] = useState<Record<number, LiveShoppingRoomState>>({});
  const [presenceByEventId, setPresenceByEventId] = useState<Record<number, LiveShoppingPresenceSnapshot>>({});
  const [chatDraft, setChatDraft] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [scheduledLives, setScheduledLives] = useState<LiveShoppingScheduledLive[]>([]);
  const [scheduleHydrated, setScheduleHydrated] = useState(false);
  const [scheduleBusyId, setScheduleBusyId] = useState<string | null>(null);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const startedScheduledLiveIdRef = useRef<string | null>(null);
  const checkoutRequestKeyRef = useRef<string | null>(null);
  const bidRequestKeyRef = useRef<string | null>(null);

  const activeCategory = useMemo(() => getLiveShoppingCategoryById(initialCategoryId), [initialCategoryId]);
  const scheduledRoomSlug = useMemo(
    () =>
      initialStartLiveId && !initialSlug
        ? getScheduledLiveRuntimeSlug(initialStartLiveId)
        : null,
    [initialSlug, initialStartLiveId],
  );
  const resolvedRoomSlug = initialSlug ?? scheduledRoomSlug;
  const activeRoom = useMemo(
    () =>
      resolvedRoomSlug
        ? events.find((event) => event.slug === resolvedRoomSlug) ??
          getLiveShoppingBySlug(resolvedRoomSlug)
        : null,
    [events, resolvedRoomSlug],
  );
  const shelves = activeCategory ? liveShoppingShelvesByCategory[activeCategory.id] ?? [] : [];

  useEffect(() => {
    let active = true;

    void (async () => {
      const schedule = await readLiveShoppingScheduleFromApi([]);

      if (!active) {
        return;
      }

      setScheduledLives(schedule);
      setScheduleHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  const persistScheduledLiveState = useCallback(
    async ({
      id,
      state,
    }: {
      id: string;
      state: ScheduledLiveRuntimeState;
    }) => {
      const target = scheduledLives.find((entry) => entry.id === id);
      if (!target) {
        return null;
      }

      const nextSchedule = scheduledLives.map((entry) =>
        entry.id === id ? withScheduledLiveRuntimeState({ item: entry, state }) : entry,
      );
      setScheduledLives(nextSchedule);
      const persisted = await writeLiveShoppingScheduleToApi(nextSchedule);
      setScheduledLives(persisted);
      return persisted.find((entry) => entry.id === id) ?? null;
    },
    [scheduledLives],
  );

  useEffect(() => {
    if (!initialStartLiveId || initialSlug || !scheduleHydrated) {
      return;
    }

    if (startedScheduledLiveIdRef.current === initialStartLiveId) {
      return;
    }

    startedScheduledLiveIdRef.current = initialStartLiveId;

    const scheduledLive = scheduledLives.find((entry) => entry.id === initialStartLiveId);
    if (!scheduledLive) {
      setToast("Ce live programme est introuvable.");
      return;
    }

    let active = true;

    void (async () => {
      const currentState = getScheduledLiveRuntimeState(scheduledLive);
      if (currentState !== "live") {
        await persistScheduledLiveState({
          id: scheduledLive.id,
          state: "live",
        });
      }

      if (!active) {
        return;
      }

      setSelectedLotId(null);
      setRoomQuery("");
      setToast(currentState === "live" ? "Session live reprise." : "Live programme demarre.");
    })();

    return () => {
      active = false;
    };
  }, [initialSlug, initialStartLiveId, persistScheduledLiveState, scheduleHydrated, scheduledLives]);

  useEffect(() => {
    if (!scheduleHydrated) {
      return;
    }

    setEvents((current) => {
      const liveScheduleEntries = scheduledLives.filter(
        (entry) => getScheduledLiveRuntimeState(entry) === "live",
      );
      const liveScheduleIds = new Set(liveScheduleEntries.map((entry) => entry.id));

      let nextEvents = current.filter((event) => {
        const scheduleId = getScheduleIdFromRuntimeSlug(event.slug);
        if (!scheduleId) {
          return true;
        }

        return liveScheduleIds.has(scheduleId);
      });

      for (const entry of liveScheduleEntries) {
        const runtimeSlug = getScheduledLiveRuntimeSlug(entry.id);
        const runtimeIndex = nextEvents.findIndex((event) => event.slug === runtimeSlug);

        if (runtimeIndex >= 0) {
          const currentEvent = nextEvents[runtimeIndex];
          const mergedEvent = mergeRuntimeEventWithScheduledLive({
            event: currentEvent,
            item: entry,
          });
          nextEvents[runtimeIndex] = mergedEvent;
          continue;
        }

        const runtimeEvent = createRuntimeEventFromScheduledLive({
          item: entry,
          events: nextEvents,
        });

        if (!runtimeEvent) {
          continue;
        }

        nextEvents = [runtimeEvent, ...nextEvents];
      }

      return nextEvents;
    });
  }, [scheduleHydrated, scheduledLives]);
  useEffect(() => {
    let active = true;

    void (async () => {
      const [serverOrders, serverInventory] = await Promise.all([
        readLiveShoppingOrdersFromApi([]),
        readLiveShoppingInventoryFromApi([]),
      ]);

      if (!active) {
        return;
      }

      setOrders(serverOrders);
      setInventoryProducts(serverInventory);
    })();

    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;

    void (async () => {
      const preferences = await readLiveShoppingPreferencesFromApi();

      if (!active) {
        return;
      }

      setPaymentMethod(preferences.paymentMethod);
      setRoomFilter(preferences.roomFilter);
      setRoomSortMode(preferences.roomSortMode);
      setPreferencesHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!preferencesHydrated) {
      return;
    }

    void writeLiveShoppingPreferencesToApi({
      paymentMethod,
      roomFilter,
      roomSortMode,
    });
  }, [paymentMethod, preferencesHydrated, roomFilter, roomSortMode]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2200); return () => window.clearTimeout(t); }, [toast]);
  useEffect(() => { if (!copied) return; const t = window.setTimeout(() => setCopied(false), 1400); return () => window.clearTimeout(t); }, [copied]);
  const activeRoomId = activeRoom?.id ?? null;
  const activeRoomRealtimeState = activeRoomId ? roomStateByEventId[activeRoomId] ?? null : null;
  const activeRoomPresence = activeRoomId ? presenceByEventId[activeRoomId] ?? null : null;

  const mergeRoomStateSnapshot = useCallback((candidate: LiveShoppingRoomState | null | undefined) => {
    if (!candidate || typeof candidate.eventId !== "number" || candidate.eventId <= 0) {
      return;
    }

    setRoomStateByEventId((current) => {
      const previous = current[candidate.eventId];
      if (previous && previous.updatedAt > candidate.updatedAt) {
        return current;
      }

      return {
        ...current,
        [candidate.eventId]: candidate,
      };
    });
  }, []);

  const syncRoomStateForEvent = useCallback(
    async (eventId: number) => {
      const result = await readLiveShoppingRoomStateFromApi(eventId);
      if (!result.ok || !result.body.roomState) {
        return null;
      }

      mergeRoomStateSnapshot(result.body.roomState);
      return result.body.roomState;
    },
    [mergeRoomStateSnapshot],
  );

  useEffect(() => {
    if (!activeRoomId || typeof window === "undefined") {
      return;
    }

    let active = true;

    void (async () => {
      const roomState = await syncRoomStateForEvent(activeRoomId);
      if (!active || !roomState) {
        return;
      }
    })();

    return () => {
      active = false;
    };
  }, [activeRoomId, mergeRoomStateSnapshot, syncRoomStateForEvent]);

  useEffect(() => {
    if (!activeRoomId || typeof window === "undefined") {
      return;
    }

    let source: EventSource | null = null;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let alive = true;
    let wsReconnectAttempts = 0;
    let resolvedTransport: "websocket" | "sse" | null = null;
    let resolvedWsUrl: string | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const applyRealtimePayload = (value: unknown) => {
      if (!value || typeof value !== "object") {
        return;
      }

      const eventPayload = (value as { payload?: unknown }).payload;
      if (!eventPayload || typeof eventPayload !== "object") {
        return;
      }

      const payload = eventPayload as {
        orders?: unknown;
        inventory?: unknown;
        roomState?: unknown;
        presence?: unknown;
      };

      if (Array.isArray(payload.orders)) {
        setOrders(payload.orders as LiveShoppingOrder[]);
      }

      if (Array.isArray(payload.inventory)) {
        setInventoryProducts(payload.inventory as LiveInventoryProduct[]);
      }

      if (payload.roomState && typeof payload.roomState === "object") {
        const candidate = payload.roomState as LiveShoppingRoomState;
        mergeRoomStateSnapshot(candidate);
      }

      if (payload.presence && typeof payload.presence === "object") {
        const candidate = payload.presence as LiveShoppingPresenceSnapshot;
        if (
          typeof candidate.eventId === "number" &&
          candidate.eventId > 0 &&
          typeof candidate.totalUsers === "number" &&
          typeof candidate.totalConnections === "number"
        ) {
          setPresenceByEventId((current) => ({
            ...current,
            [candidate.eventId as number]: {
              eventId: candidate.eventId,
              totalUsers: Math.max(0, Math.trunc(candidate.totalUsers)),
              totalConnections: Math.max(0, Math.trunc(candidate.totalConnections)),
              updatedAt:
                typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
            },
          }));
        }
      }
    };

    const scheduleDescriptorReconnect = (delay: number) => {
      clearReconnectTimer();
      reconnectTimer = window.setTimeout(() => {
        if (!alive) {
          return;
        }

        void connectRealtimeDescriptor();
      }, delay);
    };

    const connectSse = () => {
      if (!alive || source) {
        return;
      }

      const streamUrl = new URL("/api/live-shopping/stream", window.location.origin);
      streamUrl.searchParams.set("eventId", String(activeRoomId));
      source = new EventSource(streamUrl.toString(), { withCredentials: true });

      const handleSync = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as unknown;
          applyRealtimePayload(parsed);
        } catch {
          // ignore malformed realtime payloads to keep UI stable
        }
      };

      source.addEventListener("live.sync", handleSync as EventListener);
    };

    const connectWebSocket = (wsUrl: string) => {
      if (!alive) {
        return;
      }

      const nextSocket = new WebSocket(wsUrl);
      socket = nextSocket;

      nextSocket.onopen = () => {
        wsReconnectAttempts = 0;
      };

      nextSocket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as unknown;
          applyRealtimePayload(parsed);
        } catch {
          // ignore malformed realtime payloads to keep UI stable
        }
      };

      nextSocket.onclose = () => {
        if (!alive || resolvedTransport !== "websocket" || !resolvedWsUrl) {
          return;
        }

        socket = null;
        const delay = Math.min(5000, 500 * 2 ** wsReconnectAttempts);
        wsReconnectAttempts += 1;
        clearReconnectTimer();
        reconnectTimer = window.setTimeout(() => {
          if (!alive || resolvedTransport !== "websocket" || !resolvedWsUrl) {
            return;
          }

          connectWebSocket(resolvedWsUrl);
        }, delay);
      };

      nextSocket.onerror = () => {
        try {
          nextSocket.close();
        } catch {
          // ignore close failures
        }
      };
    };

    const connectRealtimeDescriptor = async () => {
      try {
        const descriptorResponse = await fetch(
          `/api/live-shopping/realtime?eventId=${activeRoomId}`,
          {
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        if (!descriptorResponse.ok) {
          scheduleDescriptorReconnect(1200);
          return;
        }

        const descriptor = (await descriptorResponse.json()) as {
          wsUrl?: unknown;
          transport?: unknown;
          presence?: unknown;
        };
        const wsUrl = typeof descriptor.wsUrl === "string" ? descriptor.wsUrl : null;
        const transport = typeof descriptor.transport === "string" ? descriptor.transport : "sse";
        if (descriptor.presence && typeof descriptor.presence === "object") {
          const candidate = descriptor.presence as LiveShoppingPresenceSnapshot;
          if (
            typeof candidate.eventId === "number" &&
            candidate.eventId > 0 &&
            typeof candidate.totalUsers === "number" &&
            typeof candidate.totalConnections === "number"
          ) {
            setPresenceByEventId((current) => ({
              ...current,
              [candidate.eventId as number]: {
                eventId: candidate.eventId,
                totalUsers: Math.max(0, Math.trunc(candidate.totalUsers)),
                totalConnections: Math.max(0, Math.trunc(candidate.totalConnections)),
                updatedAt:
                  typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
              },
            }));
          }
        }

        if (!alive) {
          return;
        }

        resolvedTransport = transport === "websocket" && wsUrl ? "websocket" : "sse";
        resolvedWsUrl = wsUrl;

        if (resolvedTransport === "sse") {
          connectSse();
          return;
        }

        if (!resolvedWsUrl) {
          scheduleDescriptorReconnect(1200);
          return;
        }

        connectWebSocket(resolvedWsUrl);
      } catch {
        scheduleDescriptorReconnect(1200);
      }
    };

    void connectRealtimeDescriptor();

    return () => {
      alive = false;
      clearReconnectTimer();
      try {
        source?.close();
      } catch {
        // ignore close failures
      }
      try {
        socket?.close();
      } catch {
        // ignore close failures
      }
    };
  }, [activeRoomId, mergeRoomStateSnapshot]);

  const categories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = liveShoppingCategories.filter((item) => (q ? `${item.label} ${item.helper}`.toLowerCase().includes(q) : true));
    if (browseTab === "az") return [...filtered].sort((a, b) => a.label.localeCompare(b.label, "fr"));
    if (browseTab === "popular") return [...filtered].sort((a, b) => audienceValue(b.audienceLabel) - audienceValue(a.audienceLabel));
    return filtered;
  }, [browseTab, searchQuery]);

  const listing = useMemo(() => {
    if (!activeCategory) return [];
    const q = searchQuery.trim().toLowerCase();
    let filtered = events.filter((event) => event.categoryId === activeCategory.id && (q ? `${event.title} ${event.subtitle} ${event.tags.join(" ")}`.toLowerCase().includes(q) : true));
    if (sortMode === "viewers-desc") filtered = [...filtered].sort((a, b) => b.viewers - a.viewers);
    if (sortMode === "viewers-asc") filtered = [...filtered].sort((a, b) => a.viewers - b.viewers);
    return filtered;
  }, [activeCategory, events, searchQuery, sortMode]);

  const liveInventoryLots = useMemo(() => {
    if (!activeRoom) return [];
    const validSlugs = getInventorySlugAliasesForLive(activeRoom.slug);

    return inventoryProducts
      .filter(
        (product) =>
          product.status === "active" &&
          product.reserveForLive &&
          !!product.liveSlug &&
          validSlugs.includes(product.liveSlug),
      )
      .map((product) => inventoryProductToLot(product));
  }, [activeRoom, inventoryProducts]);

  const lots = useMemo(() => {
    if (!activeRoom) return [];
    const q = roomQuery.trim().toLowerCase();
    const merged = new Map<string, LiveShoppingLot>();
    for (const item of activeRoom.items) {
      merged.set(item.id, item);
    }
    for (const item of liveInventoryLots) {
      merged.set(item.id, item);
    }
    const filtered = [...merged.values()].filter((item) => {
      const matchesQuery = q ? `${item.title} ${item.subtitle}`.toLowerCase().includes(q) : true;
      const matchesFilter = roomFilter === "all" ? true : item.mode === roomFilter;
      return matchesQuery && matchesFilter;
    });

    const roomLotStates = activeRoomRealtimeState?.lotStates ?? {};
    const withRealtimeBids = filtered.map((item) => {
      const runtimeLotState = roomLotStates[item.id];
      if (!runtimeLotState || item.mode !== "auction") {
        return item;
      }

      return {
        ...item,
        currentBid: Math.max(item.currentBid ?? item.price, runtimeLotState.currentBid),
      };
    });

    if (roomSortMode === "featured") {
      return withRealtimeBids;
    }

    return [...withRealtimeBids].sort((left, right) => {
      const leftPrice = left.mode === "auction" ? left.currentBid ?? left.price : left.price;
      const rightPrice = right.mode === "auction" ? right.currentBid ?? right.price : right.price;

      if (roomSortMode === "price-asc") {
        return leftPrice - rightPrice;
      }

      if (roomSortMode === "price-desc") {
        return rightPrice - leftPrice;
      }

      if (roomSortMode === "stock-desc") {
        return right.stock - left.stock;
      }

      return 0;
    });
  }, [activeRoom, activeRoomRealtimeState, liveInventoryLots, roomFilter, roomQuery, roomSortMode]);

  const resolvedLotId = selectedLotId && lots.some((item) => item.id === selectedLotId) ? selectedLotId : lots[0]?.id ?? null;
  const myScheduledLives = useMemo(
    () =>
      [...scheduledLives]
        .sort((left, right) => toScheduleTimestamp(left) - toScheduleTimestamp(right))
        .slice(0, 5),
    [scheduledLives],
  );
  const selectedLot = useMemo(() => {
    if (!activeRoom) return null;
    return lots.find((item) => item.id === resolvedLotId) ?? lots[0] ?? null;
  }, [activeRoom, lots, resolvedLotId]);
  const activeRoomChat = useMemo(() => {
    if (!activeRoom) return [];
    if (activeRoomRealtimeState?.chat && activeRoomRealtimeState.chat.length > 0) {
      return activeRoomRealtimeState.chat;
    }
    return activeRoom.chat;
  }, [activeRoom, activeRoomRealtimeState]);
  const sendChatMessage = async () => {
    if (!activeRoom || chatSubmitting) {
      return;
    }

    const body = chatDraft.trim();
    if (!body) {
      return;
    }

    setChatSubmitting(true);

    try {
      const result = await submitLiveShoppingChatMessage({
        eventId: activeRoom.id,
        body,
      });

      if (!result.ok) {
        setToast(result.body.message ?? "Impossible d envoyer le message.");
        return;
      }

      if (result.body.roomState) {
        const roomState = result.body.roomState;
        mergeRoomStateSnapshot(roomState);
      } else if (result.body.chatMessage) {
        const chatMessage = result.body.chatMessage;
        setRoomStateByEventId((current) => {
          const previous = current[activeRoom.id];
          if (!previous) {
            return current;
          }

          return {
            ...current,
            [activeRoom.id]: {
              ...previous,
              chat: [...previous.chat, chatMessage].slice(-200),
              updatedAt: Date.now(),
            },
          };
        });
      }

      setChatDraft("");
    } finally {
      setChatSubmitting(false);
    }
  };
  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendChatMessage();
  };
  const watcherFeed = useMemo(() => {
    if (!activeRoom) return [];
    const entries = new Map<string, string>();
    activeRoomChat.forEach((message) => {
      if (!entries.has(message.author)) entries.set(message.author, message.body);
    });
    return Array.from(entries.entries()).slice(0, 8);
  }, [activeRoom, activeRoomChat]);
  const leadingBidder = useMemo(() => {
    if (!activeRoom) return null;
    return activeRoomChat.find((message) => !message.mod)?.author ?? activeRoom.seller;
  }, [activeRoom, activeRoomChat]);
  const activeRoomViewerCount = useMemo(() => {
    if (!activeRoom) {
      return 0;
    }

    return activeRoomPresence?.totalUsers ?? activeRoom.viewers;
  }, [activeRoom, activeRoomPresence]);
  useEffect(() => {
    setChatDraft("");
  }, [activeRoomId]);
  useEffect(() => {
    if ((!bidOpen && !customBidOpen) || !selectedLot || selectedLot.mode !== "auction") {
      return;
    }

    const minimumBid = nextBid(selectedLot, activeRoomRealtimeState);
    setBidValue((current) => {
      const parsedCurrent = Number.parseInt(current, 10);
      if (Number.isFinite(parsedCurrent) && parsedCurrent >= minimumBid) {
        return current;
      }

      return String(minimumBid);
    });
  }, [activeRoomRealtimeState, bidOpen, customBidOpen, selectedLot]);

  const handleNav = (item: HeaderNavItemId) => {
    if (item === "home") return router.push("/");
    if (item === "shop") return router.push("/marketplace");
    if (item === "watch") return router.push("/live-shopping");
    if (item === "search") return router.push("/live-shopping");
  };
  const handleHeaderNotificationClick = () => setToast("Notifications live ouvertes.");
  const handleHeaderMessageClick = () => setToast("Messagerie live ouverte.");
  const handleHeaderMenuClick = () => setToast("Menu du compte ouvert.");
  const handleEditScheduledLive = (id: string) => {
    router.push(`/live-shopping/schedule?edit=${encodeURIComponent(id)}`);
  };
  const handleCancelScheduledLive = async (id: string) => {
    if (scheduleBusyId) {
      return;
    }

    setScheduleBusyId(id);
    try {
      const nextSchedule = scheduledLives.filter((item) => item.id !== id);
      setScheduledLives(nextSchedule);
      const persisted = await writeLiveShoppingScheduleToApi(nextSchedule);
      setScheduledLives(persisted);
      setToast("Live retire du planning.");
    } finally {
      setScheduleBusyId(null);
    }
  };
  const handleSetScheduledLiveState = async ({
    item,
    nextState,
  }: {
    item: LiveShoppingScheduledLive;
    nextState: ScheduledLiveRuntimeState;
  }) => {
    if (scheduleBusyId) {
      return;
    }

    setScheduleBusyId(item.id);

    try {
      const persistedEntry = await persistScheduledLiveState({
        id: item.id,
        state: nextState,
      });

      if (!persistedEntry) {
        setToast("Impossible de mettre a jour ce live.");
        return;
      }

      if (nextState === "live") {
        setSelectedLotId(null);
        setRoomQuery("");
        router.push(`/live-shopping/session/${encodeURIComponent(item.id)}`);
        setToast("Session live activee.");
        return;
      }

      if (nextState === "paused") {
        setToast("Session live mise en pause.");
        return;
      }

      if (nextState === "ended") {
        setToast("Session live terminee.");
        return;
      }

      setToast("Session live mise a jour.");
    } finally {
      setScheduleBusyId(null);
    }
  };
  const handleStartScheduledLive = async (item: LiveShoppingScheduledLive) => {
    const state = getScheduledLiveRuntimeState(item);
    if (state === "live") {
      router.push(`/live-shopping/session/${encodeURIComponent(item.id)}`);
      return;
    }

    await handleSetScheduledLiveState({
      item,
      nextState: "live",
    });
  };
  const handlePauseScheduledLive = async (item: LiveShoppingScheduledLive) => {
    const state = getScheduledLiveRuntimeState(item);
    if (state !== "live") {
      return;
    }

    await handleSetScheduledLiveState({
      item,
      nextState: "paused",
    });
  };

  const handleBuy = () => {
    if (!selectedLot) return;
    setCheckoutOpen(true);
  };
  const handleBid = async () => {
    if (!selectedLot || !activeRoom) return;
    const roomState = await syncRoomStateForEvent(activeRoom.id);
    setBidValue(String(nextBid(selectedLot, roomState)));
    setBidOpen(true);
  };
  const handleLotPrimaryAction = async (lot: LiveShoppingLot) => {
    setSelectedLotId(lot.id);
    if (lot.mode === "auction") {
      const roomState = activeRoom ? await syncRoomStateForEvent(activeRoom.id) : null;
      setBidValue(String(nextBid(lot, roomState)));
      setBidOpen(true);
      return;
    }
    setCheckoutOpen(true);
  };
  const handleLotCustomAction = async (lot: LiveShoppingLot) => {
    setSelectedLotId(lot.id);
    if (lot.mode === "auction") {
      const roomState = activeRoom ? await syncRoomStateForEvent(activeRoom.id) : null;
      setBidValue(String(nextBid(lot, roomState)));
      setCustomBidOpen(true);
      return;
    }
    setWalletOpen(true);
  };
  const toggleLotSave = (lotId: string) =>
    setSavedLotIds((current) => (current.includes(lotId) ? current.filter((id) => id !== lotId) : [...current, lotId]));
  const handleSave = () => activeRoom && setSavedIds((current) => current.includes(activeRoom.id) ? current.filter((id) => id !== activeRoom.id) : [...current, activeRoom.id]);
  const handleFollowRoom = () => {
    if (!activeRoom) {
      return;
    }

    setFollowedRoomIds((current) => {
      const alreadyFollowed = current.includes(activeRoom.id);
      setToast(alreadyFollowed ? "Tu ne suis plus ce vendeur." : "Tu suis ce vendeur.");
      return alreadyFollowed ? current.filter((id) => id !== activeRoom.id) : [...current, activeRoom.id];
    });
  };
  const handleCopy = async () => {
    if (!activeRoom || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${getLiveShoppingShareHref(activeRoom)}`);
      setCopied(true);
    } catch {
      setToast("Impossible de copier le lien.");
    }
  };
  const confirmCheckout = async () => {
    if (!activeRoom || !selectedLot || checkoutSubmitting) return;
    setCheckoutSubmitting(true);
    const checkoutRequestKey =
      checkoutRequestKeyRef.current ?? createActionIdempotencyKey("checkout", selectedLot.id);
    checkoutRequestKeyRef.current = checkoutRequestKey;

    try {
      const result = await submitLiveShoppingAction({
        action: "checkout",
        eventId: activeRoom.id,
        liveSlug: activeRoom.slug,
        eventSeller: activeRoom.seller,
        lot: selectedLot,
        quantity: 1,
        note: buyerNote,
        paymentMethod,
        idempotencyKey: checkoutRequestKey,
      });

      if (!result.ok) {
        setToast(result.body.message ?? "Impossible de finaliser la commande live.");
        return;
      }

      if (!Array.isArray(result.body.orders)) {
        setToast("La commande est revenue avec une reponse incomplete. Recharge la salle avant de continuer.");
        return;
      }

      setOrders(result.body.orders);
      if (result.body.inventory) {
        setInventoryProducts(result.body.inventory);
      }
      if (result.body.roomState) {
        const roomState = result.body.roomState;
        mergeRoomStateSnapshot(roomState);
      }
      setCheckoutOpen(false);
      setToast(result.replayed ? "Commande deja confirmee. Reponse rejouee." : "Paiement simule valide. Reservation confirmee.");
    } finally {
      setCheckoutSubmitting(false);
      checkoutRequestKeyRef.current = null;
    }
  };
  const confirmBid = async () => {
    if (!activeRoom || !selectedLot || bidSubmitting) return;
    const offer = Number.parseInt(bidValue, 10);
    const minimumBid = nextBid(selectedLot, activeRoomRealtimeState);
    if (Number.isNaN(offer) || offer < minimumBid) {
      setToast(`Offre minimale: ${euros(minimumBid)}.`);
      return;
    }
    setBidSubmitting(true);
    const bidRequestKey = bidRequestKeyRef.current ?? createActionIdempotencyKey("place_bid", selectedLot.id);
    bidRequestKeyRef.current = bidRequestKey;

    try {
      const result = await submitLiveShoppingAction({
        action: "place_bid",
        eventId: activeRoom.id,
        liveSlug: activeRoom.slug,
        eventSeller: activeRoom.seller,
        lot: selectedLot,
        amount: offer,
        idempotencyKey: bidRequestKey,
      });

      if (!result.ok) {
        setToast(result.body.message ?? "Impossible d enregistrer cette enchere.");
        return;
      }

      if (result.body.roomState) {
        const roomState = result.body.roomState;
        mergeRoomStateSnapshot(roomState);
      }

      if (typeof result.body.minimumBid === "number") {
        setBidValue(String(result.body.minimumBid));
      }

      if (result.body.inventory) {
        setInventoryProducts(result.body.inventory);
      }

      setBidOpen(false);
      setCustomBidOpen(false);
      setToast(result.replayed ? "Enchere deja prise en compte. Reponse rejouee." : "Offre enregistree et synchronisee.");
    } finally {
      setBidSubmitting(false);
      bidRequestKeyRef.current = null;
    }
  };
  const selectedLotBidCount = selectedLot ? bidCount(selectedLot) : 0;
  const selectedPrimaryActionLabel = selectedLot
    ? selectedLot.mode === "auction"
      ? `Enchere : ${lotPrice(selectedLot)}`
      : `Acheter maintenant : ${euros(selectedLot.price)}`
    : "";
  const selectedSecondaryNote = selectedLot
    ? selectedLot.mode === "auction"
      ? `${selectedLotBidCount} encheres • livraison ${selectedLot.delivery}`
      : `Stock ${count(selectedLot.stock)} • livraison ${selectedLot.delivery}`
    : "";
  const selectedAuctionCountdown =
    selectedLot && selectedLot.mode === "auction"
      ? `00:${String(Math.max(5, 18 - Math.min(selectedLotBidCount, 12))).padStart(2, "0")}`
      : null;
  const selectedLotStatus = selectedLot ? (selectedLot.mode === "auction" ? "Enchere live" : "Achat direct") : "";
  const isFollowingRoomSeller = activeRoom ? followedRoomIds.includes(activeRoom.id) : false;
  void selectedPrimaryActionLabel;
  void selectedSecondaryNote;
  void selectedAuctionCountdown;
  void selectedLotStatus;

  return (
    <div className="min-h-screen bg-white">
      <LiveHeader
        onNavClick={handleNav}
        onProfileClick={() => router.push("/profile")}
        onCreateClick={() => router.push("/live-shopping/schedule")}
        onNotificationsClick={handleHeaderNotificationClick}
        onMessagesClick={handleHeaderMessageClick}
        onMenuClick={handleHeaderMenuClick}
      />

      {!activeRoom ? (
        <section className="pt-[120px]">
          <div className="mx-auto w-[1440px] px-8 pb-20">
            {!activeCategory ? (
              <>
                <div className="flex items-end justify-between gap-8">
                  <div>
                    <h1 className="text-[44px] font-semibold tracking-[-0.06em] text-[#101522]">Parcourir par categorie</h1>
                    <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-[#66768c]">Choisis une categorie, regarde les lives ouverts, puis entre dans la salle sans friction.</p>
                  </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/live-shopping/inventory")}
                    className="inline-flex h-12 items-center justify-center rounded-[10px] border border-black/8 bg-white px-5 text-[14px] font-semibold text-[#101522] transition hover:border-[#cfe0ff]"
                  >
                    Inventaire
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/admin/audit")}
                    className="inline-flex h-12 items-center justify-center rounded-[10px] border border-black/8 bg-white px-5 text-[14px] font-semibold text-[#101522] transition hover:border-[#cfe0ff]"
                  >
                    Audit logs
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/live-shopping/schedule")}
                    className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[#d8e4ff] bg-[#2b6fff] px-5 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(43,111,255,0.16)] transition hover:bg-[#1f63f5]"
                  >
                      Programmer un live
                    </button>
                  </div>
                </div>
                <div className="mt-8 flex items-center gap-3">
                  {liveShoppingBrowseTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBrowseTab(tab.id)}
                      className={`rounded-[10px] px-4 py-2 text-[14px] font-semibold ${tab.id === browseTab ? "bg-[#101522] text-white" : "border border-[#e2e8f4] bg-white text-[#101522]"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="mt-8 rounded-[10px] border border-black/8 bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[20px] font-semibold tracking-[-0.03em] text-[#101522]">Mes lives</p>
                      <p className="mt-1 text-[13px] text-[#66768c]">
                        Garde la main sur ton planning et lance un live en un clic.
                      </p>
                    </div>
                    <span className="rounded-full border border-[#d7e4f7] px-3 py-1 text-[12px] font-medium text-[#2b6fff]">
                      {scheduledLives.length} planifie{scheduledLives.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {!scheduleHydrated ? (
                    <div className="mt-4 rounded-[10px] border border-dashed border-[#d9e3f2] bg-[#fbfdff] px-4 py-4 text-[14px] text-[#7a889b]">
                      Chargement de ton planning...
                    </div>
                  ) : myScheduledLives.length === 0 ? (
                    <div className="mt-4 rounded-[10px] border border-dashed border-[#d9e3f2] bg-[#fbfdff] px-4 py-4 text-[14px] text-[#7a889b]">
                      Aucun live programme. Clique sur &quot;Programmer un live&quot; pour ajouter ta prochaine session.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {myScheduledLives.map((item) => {
                        const liveState = getScheduledLiveRuntimeState(item);
                        const isLive = liveState === "live";
                        const isPaused = liveState === "paused";
                        const startLabel = isLive ? "Entrer" : isPaused ? "Reprendre" : "Demarrer";

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 rounded-[10px] border border-black/8 bg-white px-4 py-3"
                          >
                            <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-[#101522]">{item.title}</p>
                            <p className="mt-1 text-[13px] text-[#6a788c]">
                              {formatScheduledLiveDate(item)} · {item.categoryLabel} · {item.saleFormat}
                            </p>
                            <div className="mt-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getScheduledLiveRuntimeBadgeClass(liveState)}`}
                              >
                                {scheduledLiveStateLabels[liveState]}
                              </span>
                            </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditScheduledLive(item.id)}
                              className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#dce4f2] px-3 text-[13px] font-medium text-[#101522] transition hover:border-[#bfd3ff] hover:text-[#2b6fff]"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              disabled={scheduleBusyId === item.id}
                              onClick={() => {
                                void handleStartScheduledLive(item);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#d8e4ff] bg-[#2b6fff] px-3 text-[13px] font-semibold text-white transition hover:bg-[#1f63f5] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {startLabel}
                            </button>
                            {isLive ? (
                              <button
                                type="button"
                                disabled={scheduleBusyId === item.id}
                                onClick={() => {
                                  void handlePauseScheduledLive(item);
                                }}
                                className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#ffe0c0] bg-[#fff8ee] px-3 text-[13px] font-semibold text-[#a66a0f] transition hover:bg-[#fff2de] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Pause
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={scheduleBusyId === item.id}
                              onClick={() => {
                                void handleCancelScheduledLive(item.id);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#dce4f2] px-3 text-[13px] font-medium text-[#5f6f84] transition hover:border-[#f3c7cc] hover:text-[#b34354] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Annuler
                            </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-10 grid grid-cols-7 gap-x-4 gap-y-5">
                  {categories.map((category: LiveShoppingCategory, index) => {
                    const theme = categoryTileThemes[index % categoryTileThemes.length];

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => router.push(`/live-shopping?category=${category.id}`)}
                        className="group live-shopping-category-card rounded-[10px] border border-[#edf1f7] bg-white p-3 text-left transition hover:-translate-y-[2px] hover:border-[#cfe0ff] hover:shadow-[0_22px_44px_rgba(16,21,34,0.08)]"
                        style={{ animationDelay: `${(index % 9) * 0.12}s` }}
                      >
                        <p className="min-h-[44px] text-center text-[13px] font-medium leading-5 tracking-[-0.02em] text-[#101522]">{category.label}</p>

                        <div
                          className="live-shopping-category-stage relative mt-3 h-[198px] overflow-hidden rounded-[8px] border border-[#eef2f8]"
                          style={{
                            background: `linear-gradient(180deg, ${theme.base} 0%, ${theme.edge} 100%)`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.88), 0 16px 28px ${theme.glow}`,
                          }}
                        >
                          <div className="live-shopping-category-backdrop absolute inset-0" style={{ background: `radial-gradient(circle at 18% 18%, ${theme.orbA} 0%, rgba(255,255,255,0) 34%), radial-gradient(circle at 84% 82%, ${theme.orbB} 0%, rgba(255,255,255,0) 38%)` }} />
                          <CategoryLoopingMediaPreview categoryId={category.id} theme={theme} delay={`${(index % 7) * 0.16}s`} />
                        </div>
                        <div className="mt-3 text-[13px] leading-[1.08] text-[#101522]">
                          <p className="font-medium">{audiencePrimary(category.audienceLabel)}</p>
                          <p className="mt-1 font-medium">Spectateurs</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => router.push("/live-shopping")}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d7e1f0] px-4 py-2 text-[14px] font-medium text-[#101522]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Parcourir
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex min-w-max gap-3 pb-2">
                    {shelves.map((item) => (
                      <div key={item.id} className="w-[180px] rounded-[10px] border border-[#edf1f7] bg-[#f7faff] p-3">
                        <div className="relative h-[86px] overflow-hidden rounded-[8px] bg-[#dfe9ff]"><Image src={item.cover} alt={item.label} fill sizes="180px" className="object-cover" /></div>
                        <p className="mt-3 text-[14px] font-semibold text-[#101522]">{item.label}</p>
                        <div className="mt-2 flex items-center gap-2 text-[12px] text-[#66768c]"><span className="h-2.5 w-2.5 rounded-full bg-[#ff465f]" />{item.viewersLabel}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-10 grid grid-cols-[260px_minmax(0,1fr)] gap-8">
                  <aside className="pt-2">
                    <div className="rounded-[10px] border border-[#edf1f7] bg-white p-5">
                      <div className="flex items-center justify-between"><h2 className="text-[16px] font-semibold text-[#101522]">Trier</h2><ChevronDown className="h-4 w-4 text-[#7f8da1]" /></div>
                      <div className="mt-5 space-y-4 text-[15px] text-[#101522]">
                        {[{ id: "recommended", label: "Recommande" }, { id: "viewers-desc", label: "Spectateurs : ordre decroissant" }, { id: "viewers-asc", label: "Spectateurs : ordre croissant" }].map((item) => (
                          <label key={item.id} className="flex cursor-pointer items-center gap-3">
                            <span className={`h-4 w-4 rounded-full border ${sortMode === item.id ? "border-[#101522]" : "border-[#a9b7c8]"}`}><span className={`m-[3px] block h-[6px] w-[6px] rounded-full ${sortMode === item.id ? "bg-[#101522]" : "bg-transparent"}`} /></span>
                            <input type="radio" className="sr-only" checked={sortMode === item.id} onChange={() => setSortMode(item.id as SortMode)} />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 space-y-3 rounded-[10px] border border-[#edf1f7] bg-white p-5">
                      {["Categorie", "Heure du live", "Format du live", "Tag", "Boutique premium", "Pays d expedition"].map((section) => (
                        <button
                          key={section}
                          type="button"
                          onClick={() => setToast(`Filtre "${section}" ouvert.`)}
                          className="flex w-full items-center justify-between py-1 text-left text-[15px] text-[#101522]"
                        >
                          <span>{section}</span><ChevronDown className="h-4 w-4 text-[#7f8da1]" />
                        </button>
                      ))}
                    </div>
                  </aside>
                  <div>
                    <div className="mb-6">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8aa0bd]">{activeCategory.label}</p>
                      <h2 className="mt-2 text-[42px] font-semibold tracking-[-0.06em] text-[#101522]">{activeCategory.label}</h2>
                      <p className="mt-2 text-[15px] leading-7 text-[#66768c]">{activeCategory.helper}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-x-6 gap-y-9">
                      {listing.map((event) => (
                        <button key={event.id} type="button" onClick={() => router.push(getLiveShoppingHref(event))} className="text-left">
                          <div className="mb-3 flex items-center gap-2"><div className="relative h-7 w-7 overflow-hidden rounded-full border border-[#d7e2f0]"><Image src={event.avatar} alt={event.seller} fill sizes="28px" className="object-cover" /></div><p className="text-[13px] font-medium text-[#101522]">{event.handle.replace("@", "")}</p></div>
                          <div className="relative overflow-hidden rounded-[10px] bg-black">
                            <div className="relative aspect-[4/5]"><Image src={event.cover} alt={event.title} fill sizes="320px" className="object-cover transition duration-300 hover:scale-[1.02]" /></div>
                            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
                              <span className="rounded-[8px] bg-[#ff465f] px-2.5 py-1 text-[12px] font-semibold text-white">{event.liveBadge}</span>
                              <span className="rounded-full bg-[rgba(16,21,34,0.66)] px-2.5 py-1 text-[12px] font-medium text-white">{viewers(event.viewers)}</span>
                            </div>
                          </div>
                          <h3 className="mt-3 text-[20px] font-medium leading-7 text-[#101522]">{event.title}</h3>
                          <p className="mt-2 text-[14px] leading-6 text-[#101522]">{event.subtitle}</p>
                          <p className="mt-2 text-[13px] text-[#2b6fff]">{event.tags[0]}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      ) : activeRoom && selectedLot ? (
        <section className="pt-[108px]">
          <div className="mx-auto w-[1440px] px-8 pb-8">
            <div className="mb-5 flex items-center gap-3">
              <button type="button" onClick={() => router.push(`/live-shopping?category=${activeRoom.categoryId}`)} className="inline-flex items-center gap-2 rounded-full border border-[#d7e1f0] px-4 py-2 text-[14px] font-medium text-[#101522]"><ArrowLeft className="h-4 w-4" />Retour aux lives</button>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8aa0bd]">{activeRoom.category}</p>
            </div>
            <div className="grid grid-cols-[320px_minmax(0,1fr)_350px] gap-6">
              <aside className="rounded-[10px] border border-[#edf1f7] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[30px] font-semibold tracking-[-0.05em] text-[#101522]">Boutique</h2>
                    <p className="mt-1 text-[13px] text-[#7f8da1]">Selection active du live, mise a jour en temps reel.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                      savedIds.includes(activeRoom.id)
                        ? "border-[#101522] bg-[#101522] text-white"
                        : "border-[#d8e2f1] bg-white text-[#7f8da1]"
                    }`}
                  >
                    <Bookmark className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0ba]" />
                  <input value={roomQuery} onChange={(e) => setRoomQuery(e.target.value)} placeholder="Rechercher boutique..." className="h-[46px] w-full rounded-full border border-[#dde4f1] bg-white pl-11 pr-4 text-[14px] text-[#101522] outline-none placeholder:text-[#8ea0ba]" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInventoryUtilityPanel((current) => (current === "filter" ? null : "filter"))}
                    className={`rounded-[10px] border px-4 py-2 text-[14px] transition ${
                      inventoryUtilityPanel === "filter"
                        ? "border-[#2b6fff] bg-[#edf4ff] text-[#101522]"
                        : "border-[#d8e2f1] bg-white text-[#101522]"
                    }`}
                  >
                    Filtrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setInventoryUtilityPanel((current) => (current === "sort" ? null : "sort"))}
                    className={`rounded-[10px] border px-4 py-2 text-[14px] transition ${
                      inventoryUtilityPanel === "sort"
                        ? "border-[#2b6fff] bg-[#edf4ff] text-[#101522]"
                        : "border-[#d8e2f1] bg-white text-[#101522]"
                    }`}
                  >
                    Trier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoomFilter("auction");
                      setInventoryUtilityPanel(null);
                    }}
                    className={`rounded-[10px] border px-4 py-2 text-[14px] transition ${
                      roomFilter === "auction" ? "border-[#101522] bg-[#101522] text-white" : "border-[#d8e2f1] bg-white text-[#101522]"
                    }`}
                  >
                    Vente aux encheres
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoomFilter("fixed");
                      setInventoryUtilityPanel(null);
                    }}
                    className={`rounded-[10px] border px-4 py-2 text-[14px] transition ${
                      roomFilter === "fixed" ? "border-[#101522] bg-[#101522] text-white" : "border-[#d8e2f1] bg-white text-[#101522]"
                    }`}
                  >
                    Acheter maintenant
                  </button>
                </div>
                {inventoryUtilityPanel === "filter" ? (
                  <div className="mt-3 rounded-[10px] border border-[#dce8ff] bg-[#f7fbff] p-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6f88ad]">Type de vente</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { id: "all", label: "Toutes" },
                        { id: "auction", label: "Encheres" },
                        { id: "fixed", label: "Achat direct" },
                      ].map((option) => {
                        const active = roomFilter === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setRoomFilter(option.id as LiveShoppingRoomFilter);
                              setInventoryUtilityPanel(null);
                            }}
                            className={`rounded-[8px] border px-3 py-2 text-[13px] font-medium transition ${
                              active
                                ? "border-[#2b6fff] bg-[#edf4ff] text-[#101522]"
                                : "border-[#dbe4f2] bg-white text-[#5f6f84] hover:border-[#b9cce8]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {inventoryUtilityPanel === "sort" ? (
                  <div className="mt-3 rounded-[10px] border border-[#dce8ff] bg-[#f7fbff] p-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6f88ad]">Ordre des produits</p>
                    <div className="mt-3 space-y-2">
                      {[
                        { id: "featured", label: "Mis en avant" },
                        { id: "price-asc", label: "Prix croissant" },
                        { id: "price-desc", label: "Prix decroissant" },
                        { id: "stock-desc", label: "Stock disponible" },
                      ].map((option) => {
                        const active = roomSortMode === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setRoomSortMode(option.id as LiveShoppingRoomSortMode);
                              setInventoryUtilityPanel(null);
                            }}
                            className={`flex w-full items-center justify-between rounded-[8px] border px-3 py-2 text-[13px] transition ${
                              active
                                ? "border-[#2b6fff] bg-[#edf4ff] font-semibold text-[#101522]"
                                : "border-[#dbe4f2] bg-white text-[#5f6f84] hover:border-[#b9cce8]"
                            }`}
                          >
                            <span>{option.label}</span>
                            {active ? <Check className="h-4 w-4 text-[#2b6fff]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="mt-8 flex items-center justify-between">
                  <p className="text-[16px] font-semibold text-[#101522]">({lots.length}) Produits</p>
                  <ChevronDown className="h-4 w-4 text-[#7f8da1]" />
                </div>
                <div className="mt-5 max-h-[758px] space-y-4 overflow-y-auto pr-1">
                  {lots.map((lot) => (
                    <div
                      key={lot.id}
                      onClick={() => setSelectedLotId(lot.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedLotId(lot.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`w-full rounded-[10px] border p-3 text-left transition ${
                        lot.id === selectedLot.id ? "border-[#2b6fff] bg-[#f8fbff]" : "border-[#edf1f7] bg-white hover:border-[#dbe5f4]"
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="relative h-[92px] w-[92px] overflow-hidden rounded-[8px] bg-black">
                          <Image src={lot.cover} alt={lot.title} fill sizes="92px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="line-clamp-2 text-[15px] font-semibold leading-6 text-[#101522]">{lot.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[14px]">
                                <span className="font-semibold text-[#101522]">{lotPrice(lot)}</span>
                                <span className="text-[#7f8da1]">{lot.mode === "auction" ? `${bidCount(lot)} enchères` : "achat direct"}</span>
                              </div>
                              <p className="mt-1 text-[13px] text-[#7f8da1]">Qté {lot.stock}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLotSave(lot.id);
                              }}
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                                savedLotIds.includes(lot.id) ? "border-[#101522] bg-[#101522] text-white" : "border-[#d8e2f1] text-[#7f8da1]"
                              }`}
                            >
                              <Bookmark className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLotPrimaryAction(lot);
                              }}
                              data-testid={`live-lot-action-${lot.id}`}
                              className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-[14px] font-semibold ${
                                lot.mode === "auction" ? "bg-[#f2f3f6] text-[#101522]" : "bg-[#101522] text-white"
                              }`}
                            >
                              {lot.mode === "auction" ? "Pré-enchère" : "Acheter maintenant"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="overflow-hidden rounded-[10px] bg-[#0e1015]">
                <div className="relative aspect-[9/12] min-h-[820px] overflow-hidden">
                  <Image src={activeRoom.cover} alt={activeRoom.title} fill sizes="760px" className="object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,12,18,0.12)_0%,rgba(9,12,18,0)_26%,rgba(9,12,18,0.14)_58%,rgba(9,12,18,0.54)_100%)]" />
                  <div className="absolute inset-y-0 left-0 w-[176px] bg-[linear-gradient(90deg,rgba(5,8,14,0.92)_0%,rgba(5,8,14,0.72)_58%,rgba(5,8,14,0)_100%)]" />
                  <div className="absolute inset-y-0 right-0 w-[140px] bg-[linear-gradient(270deg,rgba(5,8,14,0.88)_0%,rgba(5,8,14,0.5)_56%,rgba(5,8,14,0)_100%)]" />

                  <div className="absolute left-6 top-6 inline-flex items-center gap-3 rounded-full bg-[rgba(10,12,18,0.72)] px-2 py-2 pr-3 text-white backdrop-blur-[10px]">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15">
                      <Image src={activeRoom.avatar} alt={activeRoom.seller} fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[18px] font-semibold">{activeRoom.seller}</p>
                      <div className="mt-1 flex items-center gap-2 text-[13px] text-white/82">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-[#f7d43f] text-[#f7d43f]" />
                          4,9
                        </span>
                        <span className="text-white/56">·</span>
                        <span>{activeRoom.handle}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleFollowRoom}
                      className={`ml-1 inline-flex rounded-full px-4 py-2 text-[14px] font-semibold ${
                        isFollowingRoomSeller ? "bg-white text-[#101522]" : "bg-[#f6dd1f] text-[#101522]"
                      }`}
                    >
                      {isFollowingRoomSeller ? "Suivi" : "Suivre"}
                    </button>
                  </div>

                  <div className="absolute right-6 top-6 flex items-center gap-2">
                    {selectedLot.mode === "auction" ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,77,79,0.94)] px-3 py-1.5 text-[13px] font-semibold text-white">
                        Live
                        <span className="rounded-full bg-white/18 px-2 py-0.5 text-[12px]">{selectedLotBidCount}</span>
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(11,13,20,0.58)] px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur-[6px]">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#ff4d4f]" />
                      {count(activeRoomViewerCount)}
                    </span>
                  </div>

                  <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col gap-3">
                    <button type="button" onClick={() => setMuted((current) => !current)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] text-white backdrop-blur-[8px]"><Volume2 className="h-5 w-5" /></button>
                    <button type="button" onClick={handleCopy} className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] text-white backdrop-blur-[8px]"><Share2 className="h-5 w-5" /></button>
                    <button data-testid="live-wallet-open" type="button" onClick={() => setWalletOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] text-white backdrop-blur-[8px]"><CreditCard className="h-5 w-5" /></button>
                    <button type="button" onClick={handleSave} className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-[8px] ${savedIds.includes(activeRoom.id) ? "bg-white text-[#101522]" : "bg-[rgba(255,255,255,0.12)] text-white"}`}><Bookmark className="h-5 w-5" /></button>
                  </div>

                  {selectedLot.mode === "auction" ? (
                    <div className="absolute left-6 bottom-[168px] inline-flex items-center gap-2 rounded-full bg-[rgba(12,14,20,0.68)] px-3 py-2 text-[13px] font-medium text-white backdrop-blur-[8px]">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1ec88b] text-[12px] font-semibold text-[#101522]">
                        {leadingBidder?.slice(0, 1).toUpperCase()}
                      </span>
                      {leadingBidder} est en tête !
                    </div>
                  ) : null}

                  <div className="absolute inset-x-6 bottom-6">
                    <div className="flex items-end justify-between gap-5">
                      <div className="flex min-w-0 items-start gap-4 rounded-[10px] bg-[rgba(14,17,24,0.76)] p-4 text-white backdrop-blur-[10px]">
                        <div className="relative h-20 w-20 overflow-hidden rounded-[8px] bg-black"><Image src={selectedLot.cover} alt={selectedLot.title} fill sizes="80px" className="object-cover" /></div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-[24px] font-semibold tracking-[-0.04em]">{selectedLot.title}</p>
                          <p className="mt-1 line-clamp-2 max-w-[410px] text-[15px] leading-6 text-white/76">{selectedLot.subtitle}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-[14px] text-white/82">
                            <span>{selectedLot.mode === "auction" ? `${bidCount(selectedLot)} enchères` : "Achat direct"}</span>
                            <span>Livraison {selectedLot.delivery}</span>
                            <span>Frais {euros(liveFees(selectedLot))} + taxes</span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-white">
                        <p className="text-[30px] font-semibold tracking-[-0.05em]">{lotPrice(selectedLot)}</p>
                        <p className="mt-1 text-[14px] text-white/74">{selectedLot.mode === "auction" ? "enchère en cours" : "achat immédiat"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleLotCustomAction(selectedLot)}
                        data-testid="live-selected-lot-custom-action"
                        className="rounded-full bg-white px-7 py-3 text-[15px] font-semibold text-[#101522]"
                      >
                        Personnalisé
                      </button>
                      <button
                        type="button"
                        onClick={selectedLot.mode === "auction" ? handleBid : handleBuy}
                        data-testid="live-selected-lot-primary-action"
                        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[16px] font-semibold ${selectedLot.mode === "auction" ? "bg-[#d0b511] text-[#101522]" : "bg-[#2b6fff] text-white shadow-[0_18px_30px_rgba(43,111,255,0.26)]"}`}
                      >
                        {selectedLot.mode === "auction" ? `Enchère : ${lotPrice(selectedLot)}` : `Acheter maintenant : ${euros(selectedLot.price)}`}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="overflow-hidden rounded-[10px] border border-[#edf1f7] bg-white">
                <div className="flex items-center gap-5 border-b border-[#edf1f7] px-5 py-4">
                  <button type="button" onClick={() => setSideTab("chat")} className={`pb-2 text-[15px] ${sideTab === "chat" ? "border-b-2 border-[#101522] font-semibold text-[#101522]" : "text-[#7f8da1]"}`}>Chat</button>
                  <button type="button" onClick={() => setSideTab("watch")} className={`pb-2 text-[15px] ${sideTab === "watch" ? "border-b-2 border-[#101522] font-semibold text-[#101522]" : "text-[#7f8da1]"}`}>Regarder</button>
                </div>
                {sideTab === "chat" ? (
                  <>
                    <div className="max-h-[796px] overflow-y-auto px-5 py-5" data-testid="live-chat-list">
                      {activeRoomChat.map((message) => (
                        <div key={message.id} className="mb-5">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${message.accent === "warm" ? "bg-[#ffe7c7] text-[#a85f00]" : "bg-[#eef4ff] text-[#2b6fff]"}`}>{message.author.slice(0, 1).toUpperCase()}</div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[14px] font-semibold text-[#101522]">{message.author}</p>
                                {message.mod ? <span className="rounded-[6px] bg-[#101522] px-1.5 py-0.5 text-[11px] font-semibold text-white">Mod</span> : null}
                              </div>
                              <p className={`mt-1 text-[14px] leading-6 ${message.accent === "warm" ? "text-[#ff6b1b]" : "text-[#101522]"}`}>{message.body}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#edf1f7] px-5 py-4">
                      <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                        <input
                          value={chatDraft}
                          onChange={(event) => setChatDraft(event.target.value)}
                          maxLength={320}
                          disabled={chatSubmitting}
                          placeholder="Ajoute un commentaire..."
                          data-testid="live-chat-input"
                          className="h-[46px] w-full rounded-full border border-[#dde4f1] px-4 text-[14px] text-[#101522] outline-none placeholder:text-[#8ea0ba] disabled:cursor-not-allowed disabled:opacity-70"
                        />
                        <button
                          type="submit"
                          disabled={chatSubmitting || chatDraft.trim().length === 0}
                          data-testid="live-chat-submit"
                          className="inline-flex h-[46px] shrink-0 items-center justify-center rounded-full border border-[#d8e4ff] bg-[#2b6fff] px-4 text-[13px] font-semibold text-white transition hover:bg-[#1f63f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Envoyer
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="px-5 py-5">
                    <div className="rounded-[10px] border border-[#edf1f7] bg-[#fafbfd] p-4">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#8aa0bd]">Salle en direct</p>
                      <p className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[#101522]">{activeRoom.title}</p>
                      <p className="mt-2 text-[14px] leading-6 text-[#66768c]">{activeRoom.heroNote}</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {watcherFeed.map(([author, body], index) => (
                        <div key={`${author}-${index}`} className="flex items-start gap-3 rounded-[10px] border border-[#edf1f7] p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-[13px] font-semibold text-[#2b6fff]">
                            {author.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[#101522]">{author}</p>
                            <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-[#66768c]">{body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-[10px] border border-[#edf1f7] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] text-[#66768c]">Vue live</span>
                        <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#101522]">
                          <Eye className="h-4 w-4 text-[#7f8da1]" />
                          {viewers(activeRoomViewerCount)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[14px] text-[#66768c]">Statut audio</span>
                        <span className="text-[14px] font-semibold text-[#101522]">{muted ? "Coupé" : "Actif"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {activeRoom && selectedLot && checkoutOpen ? <CheckoutModal event={activeRoom} lot={selectedLot} method={paymentMethod} note={buyerNote} onMethod={setPaymentMethod} onNote={setBuyerNote} onClose={() => setCheckoutOpen(false)} onConfirm={confirmCheckout} /> : null}
      {selectedLot && bidOpen ? <LiveBidModal lot={selectedLot} value={bidValue} onValue={setBidValue} onClose={() => setBidOpen(false)} onConfirm={confirmBid} /> : null}
      {selectedLot && customBidOpen ? <LiveBidModal lot={selectedLot} variant="custom" value={bidValue} onValue={setBidValue} onClose={() => setCustomBidOpen(false)} onConfirm={confirmBid} /> : null}
      {selectedLot && walletOpen ? (
        <LiveWalletModal
          lot={selectedLot}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onClose={() => setWalletOpen(false)}
        />
      ) : null}
      {toast ? <div data-testid="live-toast" className="fixed bottom-6 right-6 z-[280] rounded-[10px] border border-[#d9e3f3] bg-white px-4 py-3 text-[14px] font-medium text-[#101522] shadow-[0_18px_42px_rgba(8,12,24,0.12)]">{toast}</div> : null}
      {copied ? <div className="fixed bottom-6 left-6 z-[280] rounded-[10px] border border-[#d9e3f3] bg-white px-4 py-3 text-[14px] font-medium text-[#101522] shadow-[0_18px_42px_rgba(8,12,24,0.12)]">Lien du live copie.</div> : null}
    </div>
  );
}
