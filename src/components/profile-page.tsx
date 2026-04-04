"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Image as ImageIcon,
  LayoutList,
  Search,
  X,
} from "lucide-react";
import { AnimatedHeaderNav, type HeaderNavItemId } from "@/components/animated-header-nav";
import { ClassicFeedStream } from "@/components/classic-feed-view";
import {
  CommentsDrawer,
  createSeedTimeLikeSnapshot,
  type MockVideo,
  MoreActionsDrawer,
  ShareDrawer,
  TimeLikeLeaderboardDrawer,
  type TimeLikeSnapshot,
} from "@/components/feed-page";
import { SiteAccountMenu } from "@/components/site-account-menu";
import { readMarketplaceGigs } from "@/lib/marketplace-api";
import { getMarketplaceGigHref, type ServiceGig } from "@/lib/marketplace-data";
import { resolveProfileAvatarSrc } from "@/lib/profile-avatar";
import { formatDisplayName } from "@/lib/display-name";
import {
  type ClassicFeedCardItem,
  type ProfileAlbumItem,
  type PublicProfileBundle,
  toClassicFeedCardItem,
  toProfileAlbumItems,
  toProfileVideoItems,
} from "@/lib/posts";

type HeaderPanelId = "create" | "notifications" | "messages" | "menu" | null;
type ProfileView = "feed" | "videos" | "albums" | "shop";

type ProfileAlbumTile = ProfileAlbumItem;

type ProfileImageLightboxState = {
  images: string[];
  index: number;
  title: string;
};

type ProfileMePayload = {
  authenticated?: boolean;
  user?: {
    id?: string;
    email?: string | null;
    role?: string;
    authMode?: string;
    createdAt?: number;
    updatedAt?: number;
    lastLoginAt?: number | null;
  };
  profile?: {
    userId: string;
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    websiteUrl: string | null;
    onboardingCompletedAt?: number | null;
  };
};

const topActions = [
  { id: "create", src: "/figma-assets/top-plus.svg", left: 0, label: "Creer" },
  { id: "notifications", src: "/figma-assets/top-notification.svg", left: 42, label: "Notifications" },
  { id: "messages", src: "/figma-assets/top-message.svg", left: 84, label: "Messages" },
] as const;

const createMenuItems = [
  { title: "Nouveau post", copy: "Publier un texte, une photo ou une video", href: "/compose" },
  { title: "Completer mon profil", copy: "Mettre a jour photo, bio et username", href: "/onboarding" },
  { title: "Retour au feed", copy: "Revenir au fil principal", href: "/" },
];

const notificationItems = [
  "Axel Belujon Studio vient de livrer un nouveau gig.",
  "Un live shopping commence dans 15 minutes.",
  "Ton dernier post texte depasse 1 200 TimeLikes.",
];

const messageItems = [
  "Pictomag Studio: on peut relire la proposition cet apres-midi ?",
  "Studio Heat: le montage final est pret pour validation.",
  "Mila Content: ton moodboard est en cours de review.",
];

const searchSeedItems = [
  { title: "Feed video", copy: "Revenir au fil principal", href: "/" },
  { title: "Galerie photo", copy: "Ouvrir la vue photo", href: "/photos" },
  { title: "Nouveau post", copy: "Publier un texte, une photo ou une video", href: "/compose" },
  { title: "Completer mon profil", copy: "Renseigner bio, photo et site", href: "/onboarding" },
  { title: "Mon profil", copy: "Rester sur cette page", href: "/profile" },
];

const emptyPersonalProfile = {
  userId: "",
  username: "",
  displayName: "Ton profil",
  bio: "",
  avatarUrl: "/figma-assets/avatar-user.png",
  websiteUrl: null,
};

function parseCompactCount(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(/,/g, "");
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toProfileDrawerVideo(item: ClassicFeedCardItem): MockVideo | null {
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

function ProfileSectionHeader({
  profile,
  followersLabel,
  description,
  onPrimaryAction,
  primaryLabel,
  onSecondaryAction,
  secondaryLabel,
}: {
  profile: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
  followersLabel: string;
  description: string;
  onPrimaryAction: () => void;
  primaryLabel: string;
  onSecondaryAction: () => void;
  secondaryLabel: string;
}) {
  const profileDisplayName = formatDisplayName(profile.displayName, "Ton profil");

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex items-start gap-4">
        <div className="relative h-11 w-11 overflow-hidden rounded-full ring-1 ring-black/10">
          <Image
            src={resolveProfileAvatarSrc(profile.avatarUrl, "/figma-assets/avatar-user.png")}
            alt={profileDisplayName}
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[20px] font-medium tracking-[-0.03em] text-[#101522]">{profileDisplayName}</p>
            <BadgeCheck className="h-4 w-4 fill-[#2b6fff] text-white" />
            <p className="text-[14px] text-[#7d8798]">@{profile.username}</p>
            <span className="text-[14px] text-[#a0a9b7]">{followersLabel} followers</span>
          </div>
          <p className="type-body-md mt-1 text-[#101522]">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="type-button rounded-[10px] border border-black/8 px-5 py-3 text-[#101522] transition hover:bg-[#f8fbff]"
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={onSecondaryAction}
          className="type-button rounded-[10px] border border-black/8 px-5 py-3 text-[#101522] transition hover:bg-[#f8fbff]"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

function ProfileViewButton({
  active,
  label,
  top,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  top: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{ top }}
      className={`hover-lift icon-bubble-hover absolute left-[9px] flex h-10 w-10 items-center justify-center rounded-[30px] border transition ${
        active
          ? "border-[#cfe7ff] bg-white shadow-[0_10px_22px_rgba(28,177,254,0.16)]"
          : "border-transparent bg-white"
      }`}
    >
      {children}
    </button>
  );
}

export function ProfilePage() {
  const router = useRouter();
  const [headerPanel, setHeaderPanel] = useState<HeaderPanelId>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [profileView, setProfileView] = useState<ProfileView>("feed");
  const [lightboxState, setLightboxState] = useState<ProfileImageLightboxState | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileBundle, setProfileBundle] = useState<PublicProfileBundle | null>(null);
  const [profileShopGigs, setProfileShopGigs] = useState<ServiceGig[]>([]);
  const [commentsVideoId, setCommentsVideoId] = useState<number | null>(null);
  const [shareVideoId, setShareVideoId] = useState<number | null>(null);
  const [moreVideoId, setMoreVideoId] = useState<number | null>(null);
  const [timeLikeVideoId, setTimeLikeVideoId] = useState<number | null>(null);
  const [timeLikeSnapshots, setTimeLikeSnapshots] = useState<Record<number, TimeLikeSnapshot>>({});

  const searchItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return searchSeedItems;
    }

    return searchSeedItems.filter((item) => `${item.title} ${item.copy}`.toLowerCase().includes(query));
  }, [searchQuery]);

  const profileData = profileBundle?.profile ?? emptyPersonalProfile;
  const profileDisplayName = formatDisplayName(profileData.displayName, "Ton profil");
  const profilePosts = profileBundle?.posts ?? [];
  const hasAnyProfilePosts = profilePosts.length > 0;
  const profileFeedItems = profilePosts
    .map((post) => toClassicFeedCardItem(post))
    .filter((post): post is ClassicFeedCardItem => Boolean(post));
  const resolvedProfileAlbumTiles = profileBundle ? toProfileAlbumItems(profilePosts) : [];
  const resolvedProfileVideoShowcase = profileBundle ? toProfileVideoItems(profilePosts) : [];
  const profileHighlightsTiles = resolvedProfileAlbumTiles.slice(0, 3);
  const profileDrawerVideos = profileFeedItems.flatMap((item) => {
    const video = toProfileDrawerVideo(item);
    return video ? [video] : [];
  });
  const findProfileDrawerVideo = (videoId: number | null) =>
    videoId !== null ? profileDrawerVideos.find((video) => video.id === videoId) ?? null : null;
  const metrics = {
    posts: new Intl.NumberFormat("fr-FR").format(profileBundle?.stats.posts ?? 0),
    followers: "0",
    following: "0",
  };

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!sessionResponse.ok) {
          router.replace("/login");
          return;
        }

        const sessionPayload = (await sessionResponse.json()) as { authenticated?: boolean };
        if (!sessionPayload.authenticated) {
          router.replace("/login");
          return;
        }

        const meResponse = await fetch("/api/profile/me", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!meResponse.ok) {
          throw new Error("Impossible de charger la session du profil.");
        }

        const mePayload = (await meResponse.json()) as ProfileMePayload;
        if (!mePayload.authenticated || !mePayload.user?.id || !mePayload.profile) {
          router.replace("/login");
          return;
        }

        if (!mePayload.profile.onboardingCompletedAt) {
          router.replace("/onboarding");
          return;
        }

        const profileResponse = await fetch(`/api/profile/${encodeURIComponent(mePayload.user.id)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (profileResponse.ok) {
          const bundle = (await profileResponse.json()) as PublicProfileBundle;
          if (!cancelled) {
            setProfileBundle(bundle);
          }
          return;
        }

        if (!cancelled) {
          setProfileBundle({
            user: {
              id: mePayload.user.id,
              email: mePayload.user.email ?? null,
              role: mePayload.user.role ?? "buyer",
              authMode: mePayload.user.authMode ?? "local",
              createdAt: mePayload.user.createdAt ?? Date.now(),
              updatedAt: mePayload.user.updatedAt ?? Date.now(),
              lastLoginAt: mePayload.user.lastLoginAt ?? null,
            },
            profile: {
              userId: mePayload.profile.userId,
              username: mePayload.profile.username,
              displayName: mePayload.profile.displayName,
              bio: mePayload.profile.bio,
              avatarUrl: resolveProfileAvatarSrc(mePayload.profile.avatarUrl, "/figma-assets/avatar-post.png"),
              websiteUrl: mePayload.profile.websiteUrl,
            },
            stats: {
              posts: 0,
            },
            posts: [],
          });
        }
      } catch {
        if (!cancelled) {
          setProfileBundle(null);
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const loadProfileShopGigs = async () => {
      if (!profileData.username) {
        setProfileShopGigs([]);
        return;
      }

      const result = await readMarketplaceGigs({
        seller: profileData.username,
        limit: 12,
      });

      if (cancelled) {
        return;
      }

      setProfileShopGigs(result.ok ? result.data.gigs : []);
    };

    void loadProfileShopGigs();

    return () => {
      cancelled = true;
    };
  }, [profileData.username]);

  useEffect(() => {
    if (profileDrawerVideos.length === 0) {
      return;
    }

    setTimeLikeSnapshots((current) => {
      let changed = false;
      const nextSnapshots = { ...current };

      for (const video of profileDrawerVideos) {
        if (nextSnapshots[video.id]) {
          continue;
        }

        nextSnapshots[video.id] = createSeedTimeLikeSnapshot(video);
        changed = true;
      }

      return changed ? nextSnapshots : current;
    });
  }, [profileDrawerVideos]);

  const handleProfileTimeLikeStateChange = useCallback((videoId: number, snapshot: TimeLikeSnapshot) => {
    setTimeLikeSnapshots((current) => {
      const previous = current[videoId];
      if (
        previous &&
        previous.videoId === snapshot.videoId &&
        previous.kind === snapshot.kind &&
        previous.author === snapshot.author &&
        previous.title === snapshot.title &&
        previous.count === snapshot.count &&
        previous.triggered === snapshot.triggered &&
        previous.activeMs === snapshot.activeMs &&
        previous.maxProgress === snapshot.maxProgress &&
        previous.progressValue === snapshot.progressValue &&
        previous.rule.minActiveMs === snapshot.rule.minActiveMs &&
        previous.rule.minProgress === snapshot.rule.minProgress &&
        previous.rule.mode === snapshot.rule.mode &&
        previous.rule.segment === snapshot.rule.segment &&
        previous.durationSeconds === snapshot.durationSeconds
      ) {
        return current;
      }

      return {
        ...current,
        [videoId]: snapshot,
      };
    });
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      searchOpen ||
      Boolean(lightboxState) ||
      commentsVideoId !== null ||
      shareVideoId !== null ||
      moreVideoId !== null ||
      timeLikeVideoId !== null
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [commentsVideoId, lightboxState, moreVideoId, searchOpen, shareVideoId, timeLikeVideoId]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!lightboxState) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxState(null);
      }

      if (event.key === "ArrowLeft") {
        setLightboxState((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            index: (current.index - 1 + current.images.length) % current.images.length,
          };
        });
      }

      if (event.key === "ArrowRight") {
        setLightboxState((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            index: (current.index + 1) % current.images.length,
          };
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxState]);

  const closePanels = () => {
    setHeaderPanel(null);
    setSearchOpen(false);
  };

  const handleHeaderNav = (itemId: HeaderNavItemId) => {
    if (itemId === "search") {
      setHeaderPanel(null);
      setSearchOpen((current) => !current);
      return;
    }

    if (itemId === "home") {
      router.push("/");
      return;
    }

    if (itemId === "watch") {
      router.push("/live-shopping");
      return;
    }

    if (itemId === "shop") {
      router.push("/marketplace");
    }
  };

  const handleTopAction = (actionId: HeaderPanelId) => {
    setSearchOpen(false);
    setHeaderPanel((current) => (current === actionId ? null : actionId));
  };

  const handleCopyProfile = async () => {
    const publicProfilePath = profileData.username ? `/u/${encodeURIComponent(profileData.username)}` : "/profile";

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicProfilePath}`);
      setToastMessage("Lien du profil copie.");
    } catch {
      setToastMessage("Impossible de copier le lien.");
    }
  };

  const handleOpenComments = (videoId: number) => {
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setSearchOpen(false);
    setCommentsVideoId(videoId);
  };

  const handleCloseComments = () => {
    setCommentsVideoId(null);
  };

  const handleOpenShare = (videoId: number) => {
    setCommentsVideoId(null);
    setTimeLikeVideoId(null);
    setMoreVideoId(null);
    setSearchOpen(false);
    setShareVideoId(videoId);
  };

  const handleCloseShare = () => {
    setShareVideoId(null);
  };

  const handleOpenTimeLike = (videoId: number) => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setMoreVideoId(null);
    setSearchOpen(false);
    setTimeLikeVideoId(videoId);
  };

  const handleCloseTimeLike = () => {
    setTimeLikeVideoId(null);
  };

  const handleOpenMore = (videoId: number) => {
    setCommentsVideoId(null);
    setShareVideoId(null);
    setTimeLikeVideoId(null);
    setSearchOpen(false);
    setMoreVideoId(videoId);
  };

  const handleCloseMore = () => {
    setMoreVideoId(null);
  };

  const handleOpenAlbumImage = (album: ProfileAlbumTile) => {
    setLightboxState({
      images: album.images,
      index: 0,
      title: album.title,
    });
  };

  const handleOpenProfileWebsite = () => {
    if (!profileData.websiteUrl) {
      router.push("/onboarding");
      return;
    }

    window.open(profileData.websiteUrl, "_blank", "noopener,noreferrer");
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

  const renderHeaderPanel = () => {
    if (!headerPanel) {
      return null;
    }

    const panelClass =
      "fixed left-1/2 top-[92px] z-[180] w-[360px] -translate-x-1/2 rounded-[10px] border border-black/7 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.14)]";

    if (headerPanel === "create") {
      return (
        <div className={panelClass}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Creer</p>
          <div className="mt-4 space-y-2">
            {createMenuItems.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  setHeaderPanel(null);
                  router.push(item.href);
                }}
                className="flex w-full items-center justify-between rounded-[10px] border border-black/7 px-4 py-3 text-left transition hover:border-black/10 hover:bg-[#f8fbff]"
              >
                <div>
                  <p className="text-[15px] font-medium tracking-[-0.01em] text-[#101522]">{item.title}</p>
                  <p className="mt-1 text-[13px] text-[#637488]">{item.copy}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#73839a]" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (headerPanel === "notifications") {
      return (
        <div className={panelClass}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Notifications</p>
          <div className="mt-4 space-y-2">
            {notificationItems.map((item) => (
              <div key={item} className="rounded-[10px] border border-black/7 px-4 py-3 text-[14px] leading-6 text-[#101522]">
                {item}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (headerPanel === "messages") {
      return (
        <div className={panelClass}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Messages</p>
          <div className="mt-4 space-y-2">
            {messageItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setHeaderPanel(null);
                  setToastMessage("La messagerie complete arrive ensuite.");
                }}
                className="block w-full rounded-[10px] border border-black/7 px-4 py-3 text-left text-[14px] leading-6 text-[#101522] transition hover:border-black/10 hover:bg-[#f8fbff]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={panelClass}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Menu</p>
        <div className="mt-4 space-y-2">
          {[
            { label: "Mon profil", href: "/profile" },
            { label: "Accueil", href: "/" },
            { label: "Marketplace", href: "/marketplace" },
            { label: "Live shopping", href: "/live-shopping" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setHeaderPanel(null);
                router.push(item.href);
              }}
              className="flex w-full items-center justify-between rounded-[10px] border border-black/7 px-4 py-3 text-left transition hover:border-black/10 hover:bg-[#f8fbff]"
            >
              <span className="text-[14px] font-medium text-[#101522]">{item.label}</span>
              <ArrowRight className="h-4 w-4 text-[#73839a]" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#101522]">
      <header className="fixed inset-x-0 top-0 z-[120] bg-white/96 backdrop-blur-md" data-legacy-site-header="true">
        <div className="relative mx-auto h-[74px] w-[1440px]">
          <Image
            src="/figma-assets/logo-mark.png"
            alt="Pictomag"
            width={24}
            height={24}
            className="absolute left-10 top-6 h-6 w-6"
            style={{ width: "auto", height: "auto" }}
          />
          <Image src="/figma-assets/brand-wordmark.svg" alt="Pictomag" width={84} height={32} className="absolute left-[94px] top-[24px]" />
          <AnimatedHeaderNav activeItemId={null} onItemClick={handleHeaderNav} />

          <div className="absolute left-[1180px] top-6 h-6 w-[108px]">
            {topActions.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => handleTopAction(item.id)}
                className="absolute top-0 h-6 w-6 transition hover:-translate-y-[1px]"
                style={{ left: `${item.left}px` }}
              >
                <Image src={item.src} alt="" width={24} height={24} className="h-6 w-6" unoptimized />
              </button>
            ))}
          </div>

          <div className="absolute left-[1303px] top-[19px] h-9 w-px bg-black/12" />

          <div className="absolute left-[1318px] top-5">
            <SiteAccountMenu
              className="flex h-8 w-[69px] items-center gap-[13px]"
              menuButtonClassName="h-6 w-6 transition hover:-translate-y-[1px]"
              avatarButtonClassName="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-[#2b6fff]/18"
              avatarImageClassName="object-cover"
              avatarSize="32px"
            />
          </div>
        </div>
      </header>

      {searchOpen ? (
        <div className="fixed inset-0 z-[170] bg-[rgba(8,12,20,0.18)] px-6 pt-[96px]">
          <div className="mx-auto w-[900px] rounded-[10px] border border-black/7 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.14)]">
            <div className="flex items-center gap-3 rounded-[10px] border border-black/8 bg-[#f8fbff] px-4 py-3">
              <Search className="h-4 w-4 text-[#617286]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoFocus
                placeholder="Rechercher une page, un service ou une vue"
                className="w-full bg-transparent text-[15px] text-[#101522] outline-none placeholder:text-[#9aa7b8]"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-black/7">
                <X className="h-4 w-4 text-[#101522]" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {searchItems.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    closePanels();
                    router.push(item.href);
                  }}
                  className="rounded-[10px] border border-black/7 px-4 py-4 text-left transition hover:border-black/10 hover:bg-[#f8fbff]"
                >
                  <p className="text-[15px] font-medium tracking-[-0.01em] text-[#101522]">{item.title}</p>
                  <p className="mt-1 text-[13px] text-[#607085]">{item.copy}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {renderHeaderPanel()}

      <div className="fixed left-16 top-[265px] z-[118] h-[212px] w-[58px] rounded-[100px] bg-[linear-gradient(180deg,#f1f5f8_0%,#f2f2f2_50%,#f1f5f8_100%)]">
        <ProfileViewButton active={profileView === "feed"} label="Profil feed" top={11} onClick={() => setProfileView("feed")}>
          <LayoutList size={18} strokeWidth={2.1} className={profileView === "feed" ? "text-[#38a9ff]" : "text-black"} />
        </ProfileViewButton>

        <ProfileViewButton active={profileView === "videos"} label="Profil videos" top={61} onClick={() => setProfileView("videos")}>
          <Clapperboard size={18} strokeWidth={2.1} className={profileView === "videos" ? "text-[#38a9ff]" : "text-black"} />
        </ProfileViewButton>

        <ProfileViewButton active={profileView === "albums"} label="Albums photo" top={111} onClick={() => setProfileView("albums")}>
          <ImageIcon size={18} strokeWidth={2.1} className={profileView === "albums" ? "text-[#38a9ff]" : "text-black"} />
        </ProfileViewButton>

        <ProfileViewButton active={profileView === "shop"} label="Boutique profil" top={161} onClick={() => setProfileView("shop")}>
          <Image
            src="/figma-assets/nav-market.svg"
            alt=""
            width={18}
            height={18}
            className={profileView === "shop" ? "opacity-100" : "opacity-85"}
            style={{ filter: profileView === "shop" ? "brightness(0) saturate(100%) invert(59%) sepia(96%) saturate(1879%) hue-rotate(184deg) brightness(99%) contrast(101%)" : "brightness(0) saturate(100%)" }}
          />
        </ProfileViewButton>
      </div>

      <main className="w-full px-6 pb-20 pt-[98px] lg:px-10">
        {profileView === "feed" ? (
          <section className="mt-4 grid grid-cols-[338px_minmax(0,1fr)] justify-center gap-4 xl:grid-cols-[338px_468px_338px] xl:gap-6">
            <aside className="sticky top-[176px] self-start rounded-[10px] bg-white px-8 py-8">
              <div className="mx-auto flex w-full max-w-[252px] flex-col items-center">
                <div className="relative h-[110px] w-[110px] rounded-full bg-[conic-gradient(from_210deg_at_50%_50%,#ffb36a_0deg,#ff5f8f_120deg,#8a7dff_220deg,#4dbaff_300deg,#ffb36a_360deg)] p-[2px]">
                  <div className="absolute inset-[2px] rounded-full bg-white" />
                  <div className="absolute inset-[6px] overflow-hidden rounded-full bg-[#f3f6fa]">
                    <Image
                      src={resolveProfileAvatarSrc(profileData.avatarUrl, "/figma-assets/avatar-post.png")}
                      alt={`${profileDisplayName} portrait`}
                      fill
                      sizes="98px"
                      className="object-cover"
                    />
                  </div>
                </div>

                <div className="mt-8 grid w-full grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[15px] font-medium tracking-[-0.02em] text-[#101522]">{metrics.posts}</p>
                    <p className="mt-1 text-[12px] text-[#8a94a6]">posts</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-medium tracking-[-0.02em] text-[#101522]">{metrics.followers}</p>
                    <p className="mt-1 text-[12px] text-[#8a94a6]">followers</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-medium tracking-[-0.02em] text-[#101522]">{metrics.following}</p>
                    <p className="mt-1 text-[12px] text-[#8a94a6]">following</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/onboarding")}
                  className="mt-7 w-full rounded-[8px] bg-[#2b8fff] px-5 py-3 text-[16px] font-medium text-white transition hover:bg-[#247fe5]"
                >
                  Edit profile
                </button>

                <div className="mt-9 w-full text-left">
                  <h1 className="text-[28px] font-medium tracking-[-0.045em] text-[#101522]">{profileDisplayName}</h1>
                  <p className="mt-2 text-[14px] text-[#6b7688]">@{profileData.username || "username-a-definir"}</p>
                  <p className="mt-5 text-[15px] leading-7 text-[#101522]">
                    {profileData.bio || "Ajoute une bio courte pour expliquer qui tu es, ce que tu publies et ce que les autres vont trouver ici."}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenProfileWebsite}
                    className="mt-4 text-[15px] font-medium text-[#2b6fff]"
                  >
                    {profileData.websiteUrl ? profileData.websiteUrl.replace(/^https?:\/\//, "") : "Ajouter un site"}
                  </button>
                </div>

                {profileHighlightsTiles.length > 0 ? (
                  <div className="mt-10 flex w-full items-start justify-between gap-3">
                    {profileHighlightsTiles.map((highlight) => (
                      <button
                        key={highlight.id}
                        type="button"
                        onClick={() => {
                          setProfileView("albums");
                          handleOpenAlbumImage(highlight);
                        }}
                        className="group flex min-w-0 flex-1 flex-col items-center"
                      >
                        <div className="relative h-[66px] w-[66px] overflow-hidden rounded-full border border-black/10 bg-[#f5f7fa] p-[2px]">
                          <div className="relative h-full w-full overflow-hidden rounded-full">
                            <Image
                              src={highlight.src}
                              alt={highlight.title}
                              fill
                              sizes="62px"
                              className="object-cover transition duration-300 group-hover:scale-[1.02]"
                            />
                          </div>
                        </div>
                        <span className="mt-2 line-clamp-1 max-w-[84px] text-center text-[13px] text-[#4d5868]">{highlight.title}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </aside>

            <div className="min-w-0 xl:col-start-2">
              {profileLoading ? (
                <div className="rounded-[10px] border border-black/7 bg-white px-8 py-10 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Chargement</p>
                  <h2 className="mt-4 max-w-[520px] text-[40px] font-medium leading-[0.98] tracking-[-0.05em] text-[#101522]">
                    On prepare ton profil personnel.
                  </h2>
                  <p className="mt-4 max-w-[560px] text-[16px] leading-8 text-[#637488]">
                    Encore une seconde, on charge tes informations et tes contenus.
                  </p>
                </div>
              ) : profileFeedItems.length === 0 ? (
                <div className="rounded-[10px] border border-black/7 bg-white px-8 py-10 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">
                    {hasAnyProfilePosts ? "Feed classique vide" : "Profil vide"}
                  </p>
                  <h2 className="mt-4 max-w-[520px] text-[40px] font-medium leading-[0.98] tracking-[-0.05em] text-[#101522]">
                    {hasAnyProfilePosts
                      ? "Tu as deja publie, mais rien n'alimente encore cette vue classique."
                      : "Ton profil est pret, maintenant il faut lui donner quelque chose a montrer."}
                  </h2>
                  <p className="mt-4 max-w-[560px] text-[16px] leading-8 text-[#637488]">
                    {hasAnyProfilePosts
                      ? "Publie un texte, une lettre, une note, une photo ou une galerie pour enrichir ce flux, ou explore tes vues video et albums."
                      : "Commence avec un texte, une photo ou une video. Une fois publie, ton contenu apparaitra ici et dans le feed."}
                  </p>
                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/compose")}
                      className="rounded-[10px] bg-[#101522] px-5 py-3 text-[14px] font-medium tracking-[-0.01em] text-white transition hover:bg-[#1b2433]"
                    >
                      Creer mon premier post
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/onboarding")}
                      className="rounded-[10px] border border-black/7 px-5 py-3 text-[14px] font-medium tracking-[-0.01em] text-[#101522] transition hover:bg-[#f8fbff]"
                    >
                      Completer mon profil
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-[468px]">
                  <ClassicFeedStream
                    className="space-y-16"
                    trackingEnabled
                    flatCards
                    items={profileFeedItems}
                    onOpenComments={handleOpenComments}
                    onOpenShare={handleOpenShare}
                    onOpenTimeLike={handleOpenTimeLike}
                    onOpenMore={handleOpenMore}
                    onTimeLikeStateChange={handleProfileTimeLikeStateChange}
                  />
                </div>
              )}
            </div>
            <div className="hidden xl:block" aria-hidden />
          </section>
        ) : null}

        {profileView === "albums" ? (
          <section className="mt-4">
            <ProfileSectionHeader
              profile={profileData}
              followersLabel={metrics.followers}
              description="Albums photo du profil. Chaque album regroupe les images que tu as choisi d'organiser ensemble."
              onPrimaryAction={() => router.push("/onboarding")}
              primaryLabel="Edit profile"
              onSecondaryAction={handleCopyProfile}
              secondaryLabel="Share profile"
            />

            {resolvedProfileAlbumTiles.length > 0 ? (
              <div className="mt-6 grid grid-cols-3 gap-4">
                {resolvedProfileAlbumTiles.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => handleOpenAlbumImage(tile)}
                    className="group text-left"
                  >
                    <article className="relative h-[260px] overflow-hidden rounded-[10px] bg-[#f4f6f8]">
                      <Image
                        src={tile.src}
                        alt={tile.alt}
                        fill
                        sizes="320px"
                        className="object-cover transition duration-300 group-hover:scale-[1.015]"
                      />
                    </article>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-[15px] font-medium tracking-[-0.02em] text-[#101522]">{tile.title}</p>
                      <span className="shrink-0 text-[12px] text-[#7b8798]">{tile.photoCount} photo{tile.photoCount > 1 ? "s" : ""}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[10px] border border-black/8 bg-white px-6 py-8 text-[15px] leading-7 text-[#637488]">
                Aucun album photo pour l&apos;instant. Publie une photo puis coche la creation d&apos;album pour faire apparaitre tes albums ici.
              </div>
            )}
          </section>
        ) : null}

        {profileView === "videos" ? (
          <section className="mt-4">
            <ProfileSectionHeader
              profile={profileData}
              followersLabel={metrics.followers}
              description="Selection courte et formats verticaux publies sur le profil."
              onPrimaryAction={() => router.push("/")}
              primaryLabel="Open reel mode"
              onSecondaryAction={handleCopyProfile}
              secondaryLabel="Share profile"
            />

            {resolvedProfileVideoShowcase.length > 0 ? (
              <div className="mt-6 grid grid-cols-4 gap-[5px]">
                {resolvedProfileVideoShowcase.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => setToastMessage(`${tile.title} arrive en detail ensuite.`)}
                    className="group relative h-[498px] overflow-hidden rounded-[5px] bg-black text-left"
                  >
                    <video
                      src={tile.src}
                      poster={tile.poster}
                      muted
                      loop
                      autoPlay
                      playsInline
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                    />
                    <div className="absolute left-4 top-4 rounded-full bg-[rgba(15,23,42,0.72)] px-3 py-1 text-[12px] font-medium text-white">
                      {tile.duration}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/18 to-transparent px-4 pb-4 pt-10">
                        <p className="text-[18px] font-medium tracking-[-0.03em] text-white">{tile.title}</p>
                      <p className="mt-1 text-[14px] text-white/80">{tile.caption}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[10px] border border-black/8 bg-white px-6 py-8 text-[15px] leading-7 text-[#637488]">
                Aucune video publiee pour l&apos;instant. Poste une video pour activer cette vue.
              </div>
            )}
          </section>
        ) : null}

        {profileView === "shop" ? (
          <section className="mt-4">
            <ProfileSectionHeader
              profile={profileData}
              followersLabel={metrics.followers}
              description="Services, gigs et offres actives pour collaborer directement avec le profil."
              onPrimaryAction={() => router.push("/marketplace?view=seller")}
              primaryLabel="Open seller"
              onSecondaryAction={handleCopyProfile}
              secondaryLabel="Share profile"
            />

            <div className="mt-6 grid grid-cols-4 gap-4">
              {profileShopGigs.slice(0, 4).map((gig) => (
                <button
                  key={gig.id}
                  type="button"
                  onClick={() => router.push(`${getMarketplaceGigHref(gig)}?package=${gig.packages[0]?.id ?? "starter"}`)}
                  className="group overflow-hidden rounded-[10px] border border-black/8 bg-white text-left transition hover:border-black/12"
                >
                  <div className="relative h-[250px] overflow-hidden bg-[#f6f8fb]">
                    <Image src={gig.cover} alt={gig.title} fill sizes="260px" className="object-cover transition duration-500 group-hover:scale-[1.015]" />
                  </div>
                  <div className="px-4 py-4">
                      <p className="line-clamp-2 text-[20px] font-medium leading-[1.2] tracking-[-0.035em] text-[#101522]">{gig.title}</p>
                    <p className="mt-2 text-[14px] leading-6 text-[#667487]">{gig.subtitle}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-medium text-[#101522]">{gig.seller}</p>
                        <p className="mt-1 text-[13px] text-[#7d8798]">{gig.deliveryLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] uppercase tracking-[0.16em] text-[#9aa6b5]">A partir de</p>
                        <p className="mt-1 text-[24px] font-medium tracking-[-0.035em] text-[#101522]">{gig.priceFrom} €</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {profileShopGigs.length === 0 ? (
              <div className="mt-6 rounded-[10px] border border-black/8 bg-white px-5 py-5 text-[14px] leading-6 text-[#607085]">
                Aucun gig actif publie pour ce profil pour le moment.
              </div>
            ) : null}
          </section>
        ) : null}
      </main>

        {lightboxState ? (
          <div className="fixed inset-0 z-[230] bg-[rgba(0,0,0,0.92)]" onClick={() => setLightboxState(null)}>
          <div className="absolute left-8 top-8 z-10 flex items-center gap-3 text-white">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium">{lightboxState.title}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium">
              {lightboxState.index + 1} / {lightboxState.images.length}
            </span>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxState(null);
            }}
            className="absolute right-8 top-8 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/16"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handlePreviousImage();
            }}
            className="absolute left-8 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/16"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleNextImage();
            }}
            className="absolute right-8 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/16"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-16">
            <div className="relative h-full w-full max-w-[1200px]">
              <Image
                src={lightboxState.images[lightboxState.index]}
                alt={`${lightboxState.title} ${lightboxState.index + 1}`}
                fill
                sizes="1200px"
                className="object-contain"
              />
            </div>
          </div>
          </div>
        ) : null}

      <CommentsDrawer
        video={findProfileDrawerVideo(commentsVideoId)}
        open={commentsVideoId !== null}
        onClose={handleCloseComments}
      />
      <ShareDrawer
        key={shareVideoId !== null ? `profile-share-${shareVideoId}` : "profile-share-closed"}
        video={findProfileDrawerVideo(shareVideoId)}
        open={shareVideoId !== null}
        onClose={handleCloseShare}
      />
      <MoreActionsDrawer
        key={moreVideoId !== null ? `profile-more-${moreVideoId}` : "profile-more-closed"}
        video={findProfileDrawerVideo(moreVideoId)}
        open={moreVideoId !== null}
        onClose={handleCloseMore}
      />
      <TimeLikeLeaderboardDrawer
        key={timeLikeVideoId !== null ? `profile-timelike-${timeLikeVideoId}` : "profile-timelike-closed"}
        video={findProfileDrawerVideo(timeLikeVideoId)}
        snapshot={timeLikeVideoId !== null ? timeLikeSnapshots[timeLikeVideoId] ?? null : null}
        open={timeLikeVideoId !== null}
        onClose={handleCloseTimeLike}
      />

      {toastMessage ? (
        <div className="fixed bottom-8 left-1/2 z-[220] -translate-x-1/2 rounded-[10px] bg-[#101522] px-4 py-2 text-[13px] font-medium text-white shadow-[0_16px_40px_rgba(15,23,42,0.24)]">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
