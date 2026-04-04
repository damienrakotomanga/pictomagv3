"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BadgeCheck, ChevronLeft, Clapperboard, Image as ImageIcon, LayoutList, Link2 } from "lucide-react";
import { AuthRequiredModal } from "@/components/auth-required-modal";
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
import { formatDisplayName } from "@/lib/display-name";
import { resolveProfileAvatarSrc } from "@/lib/profile-avatar";
import {
  type ClassicFeedCardItem,
  type ProfileAlbumItem,
  type ProfileVideoItem,
  type PublicProfileBundle,
  toClassicFeedCardItem,
  toProfileAlbumItems,
  toProfileVideoItems,
} from "@/lib/posts";

type PublicProfilePageProps = {
  username: string;
};

type PublicProfileView = "feed" | "videos" | "albums";

type PublicSessionPayload = {
  authenticated?: boolean;
  user?: {
    id?: string;
  };
  profile?: {
    username?: string;
    onboardingCompletedAt?: number | null;
  };
};

type AuthPromptContent = {
  title: string;
  description: string;
};

function toDrawerVideo(item: ClassicFeedCardItem): MockVideo | null {
  if (item.media?.kind === "video" && item.media.src) {
    return {
      id: item.videoId,
      kind: "video",
      src: item.media.src,
      author: (item.authorUsername ?? item.handle.replace(/^@/, "")).trim(),
      title: item.title,
      music: item.eyebrow ?? "Video",
      duration: item.duration,
      timeLikeCount: Number(item.timelikeCount.replace(/\s+/g, "")) || 0,
    };
  }

  const imageSrc =
    item.media?.kind === "image"
      ? item.media.src
      : item.media?.kind === "gallery"
        ? item.media.gallery?.[0] ?? null
        : null;

  if (!imageSrc) {
    return null;
  }

  return {
    id: item.videoId,
    kind: "photo",
    src: imageSrc,
    author: (item.authorUsername ?? item.handle.replace(/^@/, "")).trim(),
    title: item.title,
    music: item.eyebrow ?? "Photo",
    duration: item.duration,
    timeLikeCount: Number(item.timelikeCount.replace(/\s+/g, "")) || 0,
  };
}

function PublicProfileTabButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[14px] font-medium transition ${
        active
          ? "border-[#cfe3ff] bg-[#eef6ff] text-[#1f5eff]"
          : "border-black/8 bg-white text-[#101522] hover:bg-[#f8fbff]"
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function LockedPublicProfileSection({
  locked,
  onUnlockRequest,
  children,
}: {
  locked: boolean;
  onUnlockRequest: () => void;
  children: ReactNode;
}) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-[0.48]">{children}</div>
      <button
        type="button"
        onClick={onUnlockRequest}
        className="absolute inset-0 z-10 rounded-[18px]"
        aria-label="Ouvrir le portail de connexion"
      />
      <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.22)_35%,rgba(243,245,246,0.65)_100%)]" />
    </div>
  );
}

export function PublicProfilePage({ username }: PublicProfilePageProps) {
  const router = useRouter();
  const [bundle, setBundle] = useState<PublicProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewerSession, setViewerSession] = useState<PublicSessionPayload | null>(null);
  const [authPrompt, setAuthPrompt] = useState<AuthPromptContent | null>(null);
  const [profileView, setProfileView] = useState<PublicProfileView>("feed");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [commentsVideoId, setCommentsVideoId] = useState<number | null>(null);
  const [shareVideoId, setShareVideoId] = useState<number | null>(null);
  const [timeLikeVideoId, setTimeLikeVideoId] = useState<number | null>(null);
  const [moreVideoId, setMoreVideoId] = useState<number | null>(null);
  const [timeLikeSnapshots, setTimeLikeSnapshots] = useState<Record<number, TimeLikeSnapshot>>({});

  useEffect(() => {
    let mounted = true;

    const loadBundle = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        const response = await fetch(`/api/profile/${encodeURIComponent(username)}`, {
          cache: "no-store",
        });

        if (response.status === 404) {
          if (mounted) {
            setBundle(null);
            setNotFound(true);
          }
          return;
        }

        if (!response.ok) {
          throw new Error("Impossible de charger ce profil.");
        }

        const payload = (await response.json()) as PublicProfileBundle;

        if (mounted) {
          setBundle(payload);
        }
      } catch {
        if (mounted) {
          setBundle(null);
          setNotFound(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadBundle();

    return () => {
      mounted = false;
    };
  }, [username]);

  useEffect(() => {
    let cancelled = false;

    const loadViewerSession = async () => {
      try {
        const response = await fetch("/api/profile/me", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (response.status === 401) {
          if (!cancelled) {
            setViewerSession(null);
          }
          return;
        }

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PublicSessionPayload;
        if (!cancelled) {
          setViewerSession(payload);
        }
      } catch {
        if (!cancelled) {
          setViewerSession(null);
        }
      }
    };

    void loadViewerSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const publicProfileHref = useMemo(() => `/u/${encodeURIComponent(username)}`, [username]);
  const signupHref = useMemo(() => `/signup?next=${encodeURIComponent(publicProfileHref)}`, [publicProfileHref]);
  const loginHref = useMemo(() => `/login?next=${encodeURIComponent(publicProfileHref)}`, [publicProfileHref]);

  const profilePosts = useMemo(() => bundle?.posts ?? [], [bundle]);
  const classicItems = useMemo(
    () => profilePosts.map((post) => toClassicFeedCardItem(post)).filter((item): item is ClassicFeedCardItem => item !== null),
    [profilePosts],
  );
  const albumItems = useMemo<ProfileAlbumItem[]>(() => (bundle ? toProfileAlbumItems(profilePosts) : []), [bundle, profilePosts]);
  const videoItems = useMemo<ProfileVideoItem[]>(() => (bundle ? toProfileVideoItems(profilePosts) : []), [bundle, profilePosts]);
  const drawerVideos = useMemo(
    () => classicItems.map((item) => toDrawerVideo(item)).filter((item): item is MockVideo => item !== null),
    [classicItems],
  );

  useEffect(() => {
    if (drawerVideos.length === 0) {
      return;
    }

    setTimeLikeSnapshots((current) => {
      const next = { ...current };

      for (const video of drawerVideos) {
        if (!next[video.id]) {
          next[video.id] = createSeedTimeLikeSnapshot(video);
        }
      }

      return next;
    });
  }, [drawerVideos]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const handleHeaderNav = (itemId: HeaderNavItemId) => {
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
      return;
    }

    router.push("/");
  };

  const handleCopyProfile = async () => {
    if (
      requireViewerAuth({
        title: "Copier le profil",
        description: `Connecte-toi pour copier le profil public de ${profile?.username ?? username}.`,
      })
    ) {
      return;
    }

    try {
      const slug = bundle?.profile.username ?? username;
      await navigator.clipboard.writeText(`${window.location.origin}/u/${encodeURIComponent(slug)}`);
      setToastMessage("Lien du profil copie.");
    } catch {
      setToastMessage("Impossible de copier le lien.");
    }
  };

  const handleOpenWebsite = () => {
    if (
      requireViewerAuth({
        title: "Ouvrir le site",
        description: `Connecte-toi pour ouvrir les liens publics de ${profile?.username ?? username}.`,
      })
    ) {
      return;
    }

    const rawWebsite = bundle?.profile.websiteUrl?.trim();

    if (!rawWebsite) {
      setToastMessage("Aucun site public pour ce profil.");
      return;
    }

    const normalizedWebsite = /^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`;
    window.open(normalizedWebsite, "_blank", "noopener,noreferrer");
  };

  const profile = bundle?.profile;
  const profileDisplayName = formatDisplayName(profile?.displayName, "Profil");
  const openAuthPrompt = useCallback(
    (content?: Partial<AuthPromptContent>) => {
      const profileHandle = profile?.username ?? username;

      setAuthPrompt({
        title: content?.title ?? "Ouvrir le profil complet",
        description:
          content?.description ??
          `Cree ton compte ou connecte-toi pour ouvrir les contenus de ${profileHandle}.`,
      });
    },
    [profile?.username, username],
  );
  const closeAuthPrompt = useCallback(() => setAuthPrompt(null), []);
  const requireViewerAuth = useCallback(
    (content?: Partial<AuthPromptContent>) => {
      if (viewerSession?.authenticated) {
        return false;
      }

      openAuthPrompt(content);
      return true;
    },
    [openAuthPrompt, viewerSession?.authenticated],
  );

  const isOwnPublicProfile =
    Boolean(viewerSession?.authenticated) &&
    viewerSession?.profile?.username?.trim().toLowerCase() === profile?.username.trim().toLowerCase();

  const handleProfileViewChange = useCallback(
    (nextView: PublicProfileView) => {
      if (
        requireViewerAuth({
          title: "Ouvrir le profil complet",
          description: `Connecte-toi pour ouvrir les autres contenus de ${profile?.username ?? username}.`,
        })
      ) {
        return;
      }

      setProfileView(nextView);
    },
    [profile?.username, requireViewerAuth, username],
  );

  const handleMessageProfile = () => {
    if (!profile) {
      return;
    }

    if (isOwnPublicProfile) {
      router.push("/profile");
      return;
    }

    if (
      requireViewerAuth({
        title: "Demarrer la conversation",
        description: `Connecte-toi pour envoyer un message a ${profile.username}.`,
      })
    ) {
      return;
    }

    router.push(`/messages?with=${encodeURIComponent(profile.username)}`);
  };

  const findDrawerVideo = (videoId: number | null) => {
    if (videoId === null) {
      return null;
    }

    return drawerVideos.find((video) => video.id === videoId) ?? null;
  };

  const handleOpenComments = (videoId: number) => setCommentsVideoId(videoId);
  const handleOpenShare = (videoId: number) => setShareVideoId(videoId);
  const handleOpenTimeLike = (videoId: number) => setTimeLikeVideoId(videoId);
  const handleOpenMore = (videoId: number) => setMoreVideoId(videoId);
  const handleCloseComments = () => setCommentsVideoId(null);
  const handleCloseShare = () => setShareVideoId(null);
  const handleCloseTimeLike = () => setTimeLikeVideoId(null);
  const handleCloseMore = () => setMoreVideoId(null);

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

  return (
    <div className="min-h-screen bg-[#f3f5f6] text-[#101522]">
      <header
        className="fixed inset-x-0 top-0 z-[120] h-[76px] border-b border-black/6 bg-white/92 backdrop-blur"
        data-legacy-site-header="true"
      >
        <div className="relative mx-auto h-full w-[1440px]">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="absolute left-[48px] top-[19px] flex h-9 items-center gap-3"
            aria-label="Retour a l'accueil"
          >
            <Image
              src="/figma-assets/logo-mark.png"
              alt="Pictomag"
              width={30}
              height={30}
              style={{ width: "auto", height: "auto" }}
              priority
            />
            <Image
              src="/figma-assets/brand-wordmark.svg"
              alt="Pictomag"
              width={84}
              height={32}
              priority
            />
          </button>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <AnimatedHeaderNav activeItemId={null} onItemClick={handleHeaderNav} />
          </div>

          <div className="absolute right-[48px] top-5">
            <SiteAccountMenu
              className="flex h-8 w-[69px] items-center gap-[13px]"
              menuButtonClassName="hover-lift h-6 w-6"
              avatarButtonClassName="hover-lift relative h-8 w-8 overflow-hidden rounded-full"
              avatarImageClassName="object-cover"
              avatarSize="32px"
            />
          </div>
        </div>
      </header>

      <main className="w-full px-6 pb-20 pt-[108px] lg:px-10">
        {loading ? (
          <section className="rounded-[10px] border border-black/7 bg-white px-8 py-10">
              <p className="type-kicker text-[#8ea2bc]">Chargement</p>
            <h1 className="mt-4 max-w-[520px] text-[40px] font-medium leading-[0.98] tracking-[-0.05em] text-[#101522]">
              On prepare ce profil public.
            </h1>
            <p className="mt-4 max-w-[560px] text-[16px] leading-8 text-[#637488]">
              Encore une seconde, on charge les informations et les publications visibles.
            </p>
          </section>
        ) : notFound || !profile ? (
          <section className="rounded-[10px] border border-black/7 bg-white px-8 py-10">
              <p className="type-kicker text-[#8ea2bc]">Profil introuvable</p>
            <h1 className="mt-4 max-w-[520px] text-[40px] font-medium leading-[0.98] tracking-[-0.05em] text-[#101522]">
              Ce profil public n&apos;existe pas ou n&apos;est plus disponible.
            </h1>
            <p className="mt-4 max-w-[560px] text-[16px] leading-8 text-[#637488]">
              Reviens au feed pour continuer a explorer les profils actifs et les contenus publics.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-8 inline-flex items-center gap-2 rounded-[10px] bg-[#101522] px-5 py-3 text-[14px] font-medium tracking-[-0.01em] text-white transition hover:bg-[#1b2433]"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour au feed
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-[10px] border border-black/7 bg-white px-8 py-8">
              <div className="flex items-start justify-between gap-8">
                <div className="flex min-w-0 items-start gap-6">
                  <div className="relative h-[92px] w-[92px] rounded-full bg-[conic-gradient(from_210deg_at_50%_50%,#ffb36a_0deg,#ff5f8f_120deg,#8a7dff_220deg,#4dbaff_300deg,#ffb36a_360deg)] p-[2px]">
                    <div className="absolute inset-[2px] rounded-full bg-white" />
                    <div className="absolute inset-[6px] overflow-hidden rounded-full bg-[#f3f6fa]">
                      <Image
                        src={resolveProfileAvatarSrc(profile.avatarUrl, "/figma-assets/avatar-post.png")}
                        alt={`${profileDisplayName} portrait`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-[32px] font-medium tracking-[-0.04em] text-[#101522]">{profileDisplayName}</h1>
                      <BadgeCheck className="h-4 w-4 fill-[#2b6fff] text-white" />
                      <p className="text-[15px] text-[#6b7688]">@{profile.username}</p>
                      <span className="text-[14px] text-[#9aa6b5]">{bundle.stats.posts} posts</span>
                    </div>

                    <p className="type-body-md mt-4 max-w-[720px] text-[#101522]">
                      {profile.bio || "Ce profil n'a pas encore ajoute de bio publique."}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="type-button inline-flex items-center gap-2 rounded-[10px] border border-black/8 px-5 py-3 text-[#101522] transition hover:bg-[#f8fbff]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Retour au feed
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyProfile}
                        className="rounded-[10px] border border-black/8 px-5 py-3 text-[14px] font-medium text-[#101522] transition hover:bg-[#f8fbff]"
                      >
                        Copier le profil
                      </button>
                      <button
                        type="button"
                        onClick={handleMessageProfile}
                        className="rounded-[10px] border border-black/8 px-5 py-3 text-[14px] font-medium text-[#101522] transition hover:bg-[#f8fbff]"
                      >
                        {isOwnPublicProfile ? "Mon profil" : "Message"}
                      </button>
                      {profile.websiteUrl ? (
                        <button
                          type="button"
                          onClick={handleOpenWebsite}
                          className="inline-flex items-center gap-2 rounded-[10px] border border-black/8 px-5 py-3 text-[14px] font-medium text-[#101522] transition hover:bg-[#f8fbff]"
                        >
                          <Link2 className="h-4 w-4" />
                          Visiter le site
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-black/6 pt-6">
                <PublicProfileTabButton active={profileView === "feed"} label="Feed public" onClick={() => handleProfileViewChange("feed")}>
                  <LayoutList className="h-4 w-4" />
                </PublicProfileTabButton>
                <PublicProfileTabButton active={profileView === "videos"} label="Videos" onClick={() => handleProfileViewChange("videos")}>
                  <Clapperboard className="h-4 w-4" />
                </PublicProfileTabButton>
                <PublicProfileTabButton active={profileView === "albums"} label="Albums" onClick={() => handleProfileViewChange("albums")}>
                  <ImageIcon className="h-4 w-4" />
                </PublicProfileTabButton>
              </div>
            </section>

            {profileView === "feed" ? (
              classicItems.length > 0 ? (
                <div className="mx-auto w-full max-w-[880px]">
                  <LockedPublicProfileSection
                    locked={!viewerSession?.authenticated}
                    onUnlockRequest={() =>
                      openAuthPrompt({
                        title: "Voir cette publication",
                        description: `Connecte-toi pour ouvrir les publications de ${profile.username}.`,
                      })
                    }
                  >
                    <ClassicFeedStream
                      className="mt-6 space-y-16"
                      trackingEnabled={Boolean(viewerSession?.authenticated)}
                      flatCards
                      items={classicItems}
                      onOpenComments={handleOpenComments}
                      onOpenShare={handleOpenShare}
                      onOpenTimeLike={handleOpenTimeLike}
                      onOpenMore={handleOpenMore}
                      onTimeLikeStateChange={handleTimeLikeStateChange}
                    />
                  </LockedPublicProfileSection>
                </div>
              ) : (
                <section className="mt-6 rounded-[10px] border border-black/7 bg-white px-8 py-8 text-[15px] leading-7 text-[#637488]">
                  Ce profil public n&apos;a pas encore de posts classiques a montrer dans cette vue.
                </section>
              )
            ) : null}

            {profileView === "videos" ? (
              videoItems.length > 0 ? (
                <LockedPublicProfileSection
                  locked={!viewerSession?.authenticated}
                    onUnlockRequest={() =>
                      openAuthPrompt({
                        title: "Voir les videos",
                        description: `Connecte-toi pour lancer les videos de ${profile.username}.`,
                      })
                    }
                  >
                  <section className="mt-6 grid grid-cols-4 gap-[5px]">
                    {videoItems.map((item) => (
                      <article key={item.id} className="group relative h-[498px] overflow-hidden rounded-[5px] bg-black">
                        <video
                          src={item.src}
                          poster={item.poster}
                          muted
                          loop
                          autoPlay
                          playsInline
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                        />
                        <div className="absolute left-4 top-4 rounded-full bg-[rgba(15,23,42,0.72)] px-3 py-1 text-[12px] font-medium text-white">
                          {item.duration}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/18 to-transparent px-4 pb-4 pt-10">
                          <p className="text-[18px] font-medium tracking-[-0.03em] text-white">{item.title}</p>
                          <p className="mt-1 text-[14px] text-white/80">{item.caption}</p>
                        </div>
                      </article>
                    ))}
                  </section>
                </LockedPublicProfileSection>
              ) : (
                <section className="mt-6 rounded-[10px] border border-black/7 bg-white px-8 py-8 text-[15px] leading-7 text-[#637488]">
                  Aucune video publique pour l&apos;instant sur ce profil.
                </section>
              )
            ) : null}

            {profileView === "albums" ? (
              albumItems.length > 0 ? (
                <LockedPublicProfileSection
                  locked={!viewerSession?.authenticated}
                    onUnlockRequest={() =>
                      openAuthPrompt({
                        title: "Voir les albums",
                        description: `Connecte-toi pour parcourir les albums de ${profile.username}.`,
                      })
                    }
                  >
                  <section className="mt-6 grid grid-cols-3 gap-4">
                    {albumItems.map((item) => (
                      <article key={item.id} className="group text-left">
                        <div className="relative h-[260px] overflow-hidden rounded-[10px] bg-[#f4f6f8]">
                          <Image
                            src={item.src}
                            alt={item.alt}
                            fill
                            sizes="320px"
                            className="object-cover transition duration-300 group-hover:scale-[1.015]"
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="line-clamp-1 text-[15px] font-medium tracking-[-0.02em] text-[#101522]">{item.title}</p>
                          <span className="shrink-0 text-[12px] text-[#7b8798]">{item.photoCount} photo{item.photoCount > 1 ? "s" : ""}</span>
                        </div>
                      </article>
                    ))}
                  </section>
                </LockedPublicProfileSection>
              ) : (
                <section className="mt-6 rounded-[10px] border border-black/7 bg-white px-8 py-8 text-[15px] leading-7 text-[#637488]">
                  Aucun album photo public pour l&apos;instant sur ce profil.
                </section>
              )
            ) : null}
          </>
        )}
      </main>

      <CommentsDrawer
        video={findDrawerVideo(commentsVideoId)}
        open={commentsVideoId !== null}
        onClose={handleCloseComments}
      />
      <ShareDrawer
        key={shareVideoId !== null ? `public-profile-share-${shareVideoId}` : "public-profile-share-closed"}
        video={findDrawerVideo(shareVideoId)}
        open={shareVideoId !== null}
        onClose={handleCloseShare}
      />
      <MoreActionsDrawer
        video={findDrawerVideo(moreVideoId)}
        open={moreVideoId !== null}
        onClose={handleCloseMore}
      />
      <TimeLikeLeaderboardDrawer
        video={findDrawerVideo(timeLikeVideoId)}
        snapshot={timeLikeVideoId !== null ? timeLikeSnapshots[timeLikeVideoId] ?? null : null}
        open={timeLikeVideoId !== null}
        onClose={handleCloseTimeLike}
      />

      {toastMessage ? (
        <div className="fixed bottom-8 left-1/2 z-[220] -translate-x-1/2 rounded-[10px] bg-[#101522] px-4 py-2 text-[13px] font-medium text-white shadow-[0_16px_40px_rgba(15,23,42,0.24)]">
          {toastMessage}
        </div>
      ) : null}

      <AuthRequiredModal
        open={authPrompt !== null}
        onClose={closeAuthPrompt}
        title={authPrompt?.title ?? "Ouvrir ce contenu"}
        description={authPrompt?.description ?? "Connecte-toi pour continuer sur Pictomag."}
        signupHref={signupHref}
        loginHref={loginHref}
        avatarSrc={profile?.avatarUrl ?? null}
        avatarAlt={profileDisplayName}
      />
    </div>
  );
}
