"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { AnimatedHeaderNav } from "@/components/animated-header-nav";

type PhotoStory = {
  id: number;
  name: string;
  avatar: string;
  own?: boolean;
  watchAll?: boolean;
};

type PhotoTile = {
  id: number;
  src: string;
  alt: string;
};

const stories: PhotoStory[] = [
  { id: 1, name: "Your Story", avatar: "/figma-assets/avatar-user.png", own: true },
  { id: 2, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 3, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 4, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 5, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 6, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 7, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 8, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 9, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 10, name: "axelbelujon", avatar: "/figma-assets/avatar-story.png" },
  { id: 11, name: "Watch all", avatar: "/figma-assets/story-watch-all.svg", watchAll: true },
];

const topActions = [
  { id: "create", src: "/figma-assets/top-plus.svg", left: 0, label: "Create" },
  { id: "notifications", src: "/figma-assets/top-notification.svg", left: 42, label: "Notifications" },
  { id: "messages", src: "/figma-assets/top-message.svg", left: 84, label: "Messages" },
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

function ToolbarButton({
  ariaLabel,
  active = false,
  top,
  onClick,
  children,
}: {
  ariaLabel: string;
  active?: boolean;
  top: number;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{ top }}
      className={`hover-lift absolute left-[73px] flex h-10 w-10 items-center justify-center rounded-[30px] border transition ${
        active
          ? "border-[#cfe7ff] bg-white shadow-[0_10px_22px_rgba(28,177,254,0.16)]"
          : "border-transparent bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function PhotoStoryItem({ story, index }: { story: PhotoStory; index: number }) {
  const left = index * 96;

  if (story.watchAll) {
    return (
      <div className="absolute top-0 h-[87px] w-[64px]" style={{ left }}>
        <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full">
          <Image src={story.avatar} alt={story.name} fill sizes="64px" className="object-cover" />
        </div>
        <p className="mt-2 text-center text-[12px] font-medium leading-[15px] text-black">{story.name}</p>
      </div>
    );
  }

  return (
    <div className="absolute top-0 h-[87px] w-[64px]" style={{ left }}>
      <div className="relative h-16 w-16">
        <div
          className={`absolute inset-0 rounded-full ${
            story.own
              ? "border border-[#e9edf4] bg-white"
              : "bg-[linear-gradient(145deg,#1b84ff_0%,#39b7ff_100%)] shadow-[0_4px_14px_rgba(28,177,254,0.18)]"
          }`}
        />
        <div className="absolute left-[3px] top-[3px] h-[58px] w-[58px] overflow-hidden rounded-full bg-white">
          <Image src={story.avatar} alt={story.name} fill sizes="58px" className="object-cover" />
        </div>
        {story.own ? (
          <div className="absolute left-[46px] top-[48.5px] h-[14.22px] w-[14.22px]">
            <Image src="/figma-assets/plus-small.svg" alt="" fill sizes="14px" className="object-contain" />
          </div>
        ) : null}
      </div>
      <p
        className={`mt-2 text-center text-[12px] leading-[15px] ${
          story.own ? "text-[#aeaeae]" : "font-medium text-black"
        }`}
      >
        {story.name}
      </p>
    </div>
  );
}

export function PhotoFeedPage() {
  const router = useRouter();
  const [uiToast, setUiToast] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoTile | null>(null);

  useEffect(() => {
    if (!uiToast) {
      return;
    }

    const timer = window.setTimeout(() => setUiToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [uiToast]);

  const handleTopActionClick = (actionId: string) => {
    if (actionId === "create") {
      router.push("/marketplace?view=create");
      return;
    }

    if (actionId === "notifications") {
      setUiToast("Notifications: ouverture en cours.");
      return;
    }

    setUiToast("Messagerie: ouverture en cours.");
  };

  return (
    <main className="overflow-x-auto bg-white">
      <div className="mx-auto w-[1440px] bg-white">
        <div className="relative min-h-[2009px] w-[1440px] bg-white text-black">
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
            <Image
              src="/figma-assets/brand-wordmark.svg"
              alt="Pictomag"
              width={83.52}
              height={31.69}
              className="absolute left-[94px] top-[24.28px] h-[31.69px] w-[83.52px]"
            />

            <AnimatedHeaderNav activeItemId="home" />

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
                  <Image src={item.src} alt="" width={24} height={24} className="h-6 w-6" />
                </button>
              ))}
            </div>

            <div className="absolute left-[1303px] top-[19px] h-9 w-px bg-black/12" />

            <div className="absolute left-[1318px] top-5 flex h-8 w-[69px] items-center gap-[13px]">
              <button
                type="button"
                aria-label="Menu"
                onClick={() => setUiToast("Menu du compte ouvert.")}
                className="hover-lift h-6 w-6"
              >
                <Image src="/figma-assets/top-menu.svg" alt="" width={24} height={24} className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Mon profil"
                onClick={() => router.push("/profile")}
                className="hover-lift relative h-8 w-8 overflow-hidden rounded-full"
              >
                <Image src="/figma-assets/avatar-user.png" alt="Current user" fill sizes="32px" className="object-cover" />
              </button>
            </div>
          </header>

          <section className="absolute left-[208px] top-24 h-[87px] w-[1024px]">
            {stories.map((story, index) => (
              <PhotoStoryItem key={story.id} story={story} index={index} />
            ))}
          </section>

          <div className="absolute left-16 top-[265px] h-[162px] w-[58px] rounded-[100px] bg-[linear-gradient(180deg,#f1f5f8_0%,#f2f2f2_50%,#f1f5f8_100%)]" />

          <ToolbarButton ariaLabel="Feed" top={276} onClick={() => router.push("/")}>
            <Image src="/figma-assets/tool-feed.svg" alt="" width={18} height={18} className="h-[18px] w-[18px]" />
          </ToolbarButton>

          <ToolbarButton ariaLabel="Video tool" top={326} onClick={() => router.push("/")}>
            <Image
              src="/figma-assets/tool-video.svg"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6"
            />
          </ToolbarButton>

          <ToolbarButton ariaLabel="Photo tool" top={376} active onClick={() => router.push("/photos")}>
            <ImageIcon size={18} strokeWidth={2.1} className="text-[#38a9ff]" />
          </ToolbarButton>

          <div className="absolute left-[180px] top-[207px] grid w-[1091px] grid-cols-4 gap-[5px]">
            {photoTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => setSelectedPhoto(tile)}
                className="hover-lift group relative h-[447px] overflow-hidden rounded-[2px] bg-[#d9d9d9] text-left"
              >
                <Image src={tile.src} alt={tile.alt} fill sizes="269px" className="object-cover transition duration-300 group-hover:scale-[1.015]" />
                <div className="absolute inset-0 bg-black/10 transition duration-300 group-hover:bg-black/5" />
              </button>
            ))}
          </div>

          {selectedPhoto ? (
            <div className="fixed inset-0 z-[220] bg-[rgba(0,0,0,0.92)]">
              <button
                type="button"
                aria-label="Fermer l image"
                onClick={() => setSelectedPhoto(null)}
                className="absolute right-8 top-8 rounded-full border border-white/30 px-4 py-2 text-[14px] font-semibold text-white"
              >
                Fermer
              </button>
              <div className="absolute inset-0 flex items-center justify-center p-10">
                <div className="relative h-full max-h-[92vh] w-full max-w-[74vw]">
                  <Image src={selectedPhoto.src} alt={selectedPhoto.alt} fill sizes="74vw" className="object-contain" />
                </div>
              </div>
            </div>
          ) : null}

          {uiToast ? (
            <div className="fixed bottom-6 right-6 z-[230] rounded-[10px] border border-[#d9e3f3] bg-white px-4 py-3 text-[14px] font-medium text-[#101522] shadow-[0_18px_42px_rgba(8,12,24,0.12)]">
              {uiToast}
            </div>
          ) : null}

        </div>
      </div>
    </main>
  );
}
