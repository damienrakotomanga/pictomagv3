"use client";

import Image from "next/image";
import { AnimatedHeaderNav, type HeaderNavItemId } from "@/components/animated-header-nav";
import { SiteAccountMenu } from "@/components/site-account-menu";

export type FeedShellStory = {
  id: number;
  name: string;
  avatar: string;
  own?: boolean;
  live?: boolean;
  watchAll?: boolean;
};

const STORY_CARD_WIDTH = 86;
const STORY_CARD_STEP = 106;
const activeToolFilter =
  "invert(50%) sepia(94%) saturate(2761%) hue-rotate(192deg) brightness(102%) contrast(101%)";
const inactiveToolFilter = "brightness(0) saturate(100%)";
const topActions = [
  { id: "create", src: "/figma-assets/icon-create.svg", label: "Creer", left: 0 },
];

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
  style?: React.CSSProperties;
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

function StoryItem({ story, index }: { story: FeedShellStory; index: number }) {
  const left = index * STORY_CARD_STEP;

  if (story.watchAll) {
    return (
      <div className="story-card group absolute top-0 h-[110px] w-[86px]" style={{ left }}>
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
        <p className="absolute left-0 top-[99px] w-[86px] text-center text-[12px] font-medium leading-[15px] tracking-[-0.01em] text-black transition-colors duration-300 group-hover:text-[#0077ff]">
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
        } ${story.own ? "story-inst-own" : ""}`}
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
          <Image src={story.avatar} alt={story.name} fill sizes="80px" className="object-cover" />
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
          <span className="story-live-pill absolute left-1/2 top-[73px] z-40 -translate-x-1/2">LIVE</span>
        ) : null}
      </div>
      <p
        className={`absolute top-[99px] w-[86px] text-center text-[12px] leading-[15px] ${
          story.own
            ? "font-medium tracking-[-0.01em] text-[#aeaeae] transition-colors duration-300 group-hover:text-black"
            : "font-medium tracking-[-0.01em] text-black transition-colors duration-300 group-hover:text-[#0077ff]"
        }`}
      >
        {story.name}
      </p>
    </div>
  );
}

export function FeedShellChrome({
  isSearchOpen,
  onNavItemClick,
  onTopActionClick,
  stories,
  isClassicMode,
  isVideoMode,
  isPhotoMode,
  showPhotoTool,
  onSelectMode,
}: {
  isSearchOpen: boolean;
  onNavItemClick: (itemId: HeaderNavItemId) => void;
  onTopActionClick: (actionId: string) => void;
  stories: FeedShellStory[];
  isClassicMode: boolean;
  isVideoMode: boolean;
  isPhotoMode: boolean;
  showPhotoTool: boolean;
  onSelectMode: (mode: "classic" | "video" | "photo") => void;
}) {
  const storyTrackWidth =
    stories.length > 0 ? STORY_CARD_WIDTH + STORY_CARD_STEP * (stories.length - 1) : STORY_CARD_WIDTH;
  const toolButtonClass = (active: boolean) =>
    `hover-lift icon-bubble-hover absolute left-[9px] flex h-10 w-10 items-center justify-center rounded-[30px] border transition ${
      active
        ? "border-[#cfe7ff] bg-white shadow-[0_10px_22px_rgba(28,177,254,0.16)]"
        : "border-transparent bg-white"
    }`;

  return (
    <>
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

        <AnimatedHeaderNav activeItemId={isSearchOpen ? "search" : "home"} onItemClick={onNavItemClick} />

        <div className="absolute left-[1180px] top-6 h-6 w-[108px]">
          {topActions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTopActionClick(item.id)}
              className="hover-lift absolute top-0 h-6 w-6"
              style={{ left: item.left }}
              aria-label={item.label}
            >
              <Asset src={item.src} alt="" width={24} height={24} className="h-6 w-6" />
            </button>
          ))}
        </div>

        <div className="absolute left-[1303px] top-[19px] h-9 w-px bg-black/12" />

        <div className="absolute left-[1318px] top-5">
          <SiteAccountMenu
            className="flex h-8 w-[69px] items-center gap-[13px]"
            menuButtonClassName="hover-lift h-6 w-6"
            avatarButtonClassName="hover-lift relative h-8 w-8 overflow-hidden rounded-full"
            avatarImageClassName="object-cover"
            avatarSize="32px"
          />
        </div>
      </header>

      {stories.length > 0 ? (
        <section className="absolute left-1/2 top-24 h-[110px] -translate-x-1/2" style={{ width: storyTrackWidth }}>
          {stories.map((story, index) => (
            <StoryItem key={story.id} story={story} index={index} />
          ))}
        </section>
      ) : null}

      <div className="fixed left-16 top-[265px] z-[118] h-[162px] w-[58px] rounded-[100px] bg-[linear-gradient(180deg,#f1f5f8_0%,#f2f2f2_50%,#f1f5f8_100%)]">
        <button aria-label="Feed" onClick={() => onSelectMode("classic")} className={toolButtonClass(isClassicMode)} style={{ top: 11 }}>
          <Asset
            src="/figma-assets/tool-feed.svg"
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px]"
            style={{ filter: isClassicMode ? activeToolFilter : "none" }}
          />
        </button>

        <button aria-label="Video tool" onClick={() => onSelectMode("video")} className={toolButtonClass(isVideoMode)} style={{ top: 61 }}>
          <Asset
            src="/figma-assets/tool-video.svg"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6"
            style={{ filter: isVideoMode ? "none" : inactiveToolFilter }}
          />
        </button>

        {showPhotoTool ? (
          <button aria-label="Photo tool" onClick={() => onSelectMode("photo")} className={toolButtonClass(isPhotoMode)} style={{ top: 111 }}>
            <Asset
              src="/figma-assets/tool-photo.svg"
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px]"
              style={{ filter: isPhotoMode ? activeToolFilter : "none" }}
            />
          </button>
        ) : null}
      </div>
    </>
  );
}
