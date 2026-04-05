"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Image as ImageIcon,
  LayoutList,
  X,
} from "lucide-react";
import { ClassicFeedStream } from "@/components/classic-feed-view";
import {
  CommentsDrawer,
  MoreActionsDrawer,
  ShareDrawer,
  TimeLikeDrawer,
  type TimeLikeSnapshot,
} from "@/components/post-interaction-drawers";
import { toPostInteractionVideo } from "@/components/post-interaction-video";
import { usePostInteractionOverlays } from "@/components/use-post-interaction-overlays";
import { formatDisplayName } from "@/lib/display-name";
import {
  type ClassicFeedCardItem,
  type PublicProfileBundle,
  toClassicFeedCardItem,
  toProfileAlbumItems,
  toProfileVideoItems,
} from "@/lib/posts";
import { resolveProfileAvatarSrc } from "@/lib/profile-avatar";
import { useCreatorSession } from "@/lib/use-creator-session";

type ProfileView = "feed" | "videos" | "albums";

type ProfileImageLightboxState = {
  images: string[];
  index: number;
  title: string;
};

const emptyPersonalProfile = {
  userId: "",
  username: "",
  displayName: "Ton profil",
  bio: "",
  avatarUrl: "/figma-assets/avatar-user.png",
  websiteUrl: null,
};

function ProfileViewTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition ${
        active ? "bg-[#101522] text-white" : "bg-white text-[#101522] ring-1 ring-black/[0.06] hover:bg-[#f8fbff]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SectionHeader({
  title,
  description,
  primaryLabel,
  onPrimaryAction,
  secondaryLabel,
  onSecondaryAction,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  secondaryLabel: string;
  onSecondaryAction: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] bg-white p-6 ring-1 ring-black/[0.05] lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">{title}</h2>
        <p className="mt-2 max-w-[620px] text-[14px] leading-7 text-[#667085]">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#101522] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1b2433]"
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={onSecondaryAction}
          className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-[14px] font-semibold text-[#101522] ring-1 ring-black/[0.08] transition hover:bg-[#f7f9fc]"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const router = useRouter();
  const session = useCreatorSession();
  const [profileView, setProfileView] = useState<ProfileView>("feed");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileBundle, setProfileBundle] = useState<PublicProfileBundle | null>(null);
  const [lightboxState, setLightboxState] = useState<ProfileImageLightboxState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [timeLikeSnapshots, setTimeLikeSnapshots] = useState<Record<number, TimeLikeSnapshot>>({});
  const [commentCountOverrides, setCommentCountOverrides] = useState<Record<number, string>>({});
  const {
    closeComments,
    closeMore,
    closeShare,
    closeTimeLike,
    commentsVideoId,
    moreVideoId,
    openComments,
    openMore,
    openShare,
    openTimeLike,
    overlayLocked,
    shareVideoId,
    timeLikeVideoId,
  } = usePostInteractionOverlays({ manageBodyScroll: false });

  const profileData = profileBundle?.profile ?? emptyPersonalProfile;
  const profileDisplayName = formatDisplayName(profileData.displayName, "Ton profil");
  const profilePosts = useMemo(() => profileBundle?.posts ?? [], [profileBundle]);
  const profileFeedItems = useMemo(
    () =>
      profilePosts
        .map((post) => toClassicFeedCardItem(post))
        .filter((post): post is ClassicFeedCardItem => Boolean(post))
        .map((item) =>
          commentCountOverrides[item.videoId]
            ? {
                ...item,
                commentCount: commentCountOverrides[item.videoId]!,
              }
            : item,
        ),
    [commentCountOverrides, profilePosts],
  );
  const profileAlbumTiles = profileBundle ? toProfileAlbumItems(profilePosts) : [];
  const profileVideoTiles = profileBundle ? toProfileVideoItems(profilePosts) : [];
  const hasPosts = profilePosts.length > 0;
  const profileDrawerVideos = profileFeedItems.flatMap((item) => {
    const video = toPostInteractionVideo(item);
    return video ? [video] : [];
  });

  const metrics = useMemo(
    () => ({
      posts: new Intl.NumberFormat("fr-FR").format(profileBundle?.stats.posts ?? 0),
      videos: new Intl.NumberFormat("fr-FR").format(profileVideoTiles.length),
      albums: new Intl.NumberFormat("fr-FR").format(profileAlbumTiles.length),
    }),
    [profileAlbumTiles.length, profileBundle, profileVideoTiles.length],
  );

  const findProfileDrawerVideo = useCallback(
    (videoId: number | null) => (videoId !== null ? profileDrawerVideos.find((video) => video.id === videoId) ?? null : null),
    [profileDrawerVideos],
  );

  useEffect(() => {
    if (session.status === "loading") {
      return;
    }

    if (session.status === "anonymous") {
      router.replace("/login");
      return;
    }

    if (session.status === "authenticated_not_onboarded") {
      router.replace("/onboarding");
      return;
    }

    if (session.status === "error" || !session.payload?.user?.id || !session.payload.profile) {
      setProfileBundle(null);
      setProfileLoading(false);
      return;
    }

    const currentUser = session.payload.user;
    const currentProfile = session.payload.profile;
    const currentUserId = currentUser.id;
    if (!currentUserId) {
      setProfileBundle(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await fetch(`/api/profile/${encodeURIComponent(currentUserId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.ok) {
          const bundle = (await response.json()) as PublicProfileBundle;
          if (!cancelled) {
            setProfileBundle(bundle);
          }
          return;
        }

        if (!cancelled) {
          setProfileBundle({
            user: {
              id: currentUserId,
              email: currentUser.email ?? null,
              role: currentUser.role ?? "buyer",
              authMode: currentUser.authMode ?? "local",
              createdAt: currentUser.createdAt ?? Date.now(),
              updatedAt: currentUser.updatedAt ?? Date.now(),
              lastLoginAt: currentUser.lastLoginAt ?? null,
            },
            profile: {
              userId: currentProfile.userId,
              username: currentProfile.username,
              displayName: currentProfile.displayName,
              bio: currentProfile.bio,
              avatarUrl: resolveProfileAvatarSrc(currentProfile.avatarUrl, "/figma-assets/avatar-post.png"),
              websiteUrl: currentProfile.websiteUrl,
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
  }, [router, session]);

  useEffect(() => {
    document.body.style.overflow = Boolean(lightboxState) || overlayLocked ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxState, overlayLocked]);

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
        setLightboxState((current) =>
          current
            ? {
                ...current,
                index: (current.index - 1 + current.images.length) % current.images.length,
              }
            : current,
        );
      }

      if (event.key === "ArrowRight") {
        setLightboxState((current) =>
          current
            ? {
                ...current,
                index: (current.index + 1) % current.images.length,
              }
            : current,
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxState]);

  const handleCopyProfile = async () => {
    const publicProfilePath = profileData.username ? `/u/${encodeURIComponent(profileData.username)}` : "/profile";

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicProfilePath}`);
      setToastMessage("Lien du profil copie.");
    } catch {
      setToastMessage("Impossible de copier le lien.");
    }
  };

  const handleOpenProfileWebsite = () => {
    if (!profileData.websiteUrl) {
      router.push("/profile/edit");
      return;
    }

    window.open(profileData.websiteUrl, "_blank", "noopener,noreferrer");
  };

  const handleProfileTimeLikeStateChange = useCallback((videoId: number, snapshot: TimeLikeSnapshot) => {
    setTimeLikeSnapshots((current) => ({
      ...current,
      [videoId]: snapshot,
    }));
  }, []);

  const handleProfileCommentCountChange = useCallback((videoId: number, nextCount: number) => {
    const formatted = new Intl.NumberFormat("fr-FR").format(nextCount);
    setCommentCountOverrides((current) => ({
      ...current,
      [videoId]: formatted,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#101522]">
      <main className="mx-auto grid max-w-[1360px] gap-8 px-6 pb-20 pt-[112px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[112px] lg:self-start">
          <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.05]">
            <div className="flex items-center gap-4">
              <div className="relative h-[84px] w-[84px] rounded-full bg-[conic-gradient(from_210deg_at_50%_50%,#ffb36a_0deg,#ff5f8f_120deg,#8a7dff_220deg,#4dbaff_300deg,#ffb36a_360deg)] p-[2px]">
                <div className="absolute inset-[2px] rounded-full bg-white" />
                <div className="absolute inset-[6px] overflow-hidden rounded-full bg-[#f3f6fa]">
                  <Image
                    src={resolveProfileAvatarSrc(profileData.avatarUrl, "/figma-assets/avatar-post.png")}
                    alt={`${profileDisplayName} portrait`}
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                </div>
              </div>

              <div>
                <h1 className="text-[28px] font-semibold tracking-[-0.05em] text-[#101522]">{profileDisplayName}</h1>
                <p className="mt-1 text-[14px] text-[#6b7688]">
                  {profileData.username ? `@${profileData.username}` : "Identifiant a definir"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 rounded-[20px] bg-[#fafbfe] px-4 py-4 text-center">
              <div>
                <p className="text-[15px] font-medium tracking-[-0.02em] text-[#101522]">{metrics.posts}</p>
                <p className="mt-1 text-[12px] text-[#8a94a6]">posts</p>
              </div>
              <div>
                <p className="text-[15px] font-medium tracking-[-0.02em] text-[#101522]">{metrics.videos}</p>
                <p className="mt-1 text-[12px] text-[#8a94a6]">videos</p>
              </div>
              <div>
                <p className="text-[15px] font-medium tracking-[-0.02em] text-[#101522]">{metrics.albums}</p>
                <p className="mt-1 text-[12px] text-[#8a94a6]">albums</p>
              </div>
            </div>

            <p className="mt-6 text-[15px] leading-7 text-[#101522]">
              {profileData.bio || "Ajoute une bio courte pour expliquer qui tu es et ce que les autres vont trouver ici."}
            </p>

            <button type="button" onClick={handleOpenProfileWebsite} className="mt-4 text-[15px] font-medium text-[#2b6fff]">
              {profileData.websiteUrl ? profileData.websiteUrl.replace(/^https?:\/\//, "") : "Ajouter un site"}
            </button>

            {hasPosts ? (
              <button
                type="button"
                onClick={() => router.push("/profile/edit")}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#2b8fff] px-5 text-[15px] font-semibold text-white transition hover:bg-[#247fe5]"
              >
                Modifier mon profil
              </button>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap gap-3">
            <ProfileViewTab
              active={profileView === "feed"}
              icon={<LayoutList size={18} strokeWidth={2.1} />}
              label="Posts"
              onClick={() => setProfileView("feed")}
            />
            <ProfileViewTab
              active={profileView === "videos"}
              icon={<Clapperboard size={18} strokeWidth={2.1} />}
              label="Videos"
              onClick={() => setProfileView("videos")}
            />
            <ProfileViewTab
              active={profileView === "albums"}
              icon={<ImageIcon size={18} strokeWidth={2.1} />}
              label="Albums"
              onClick={() => setProfileView("albums")}
            />
          </div>

          {profileView === "feed" ? (
            <section className="mt-6">
              {profileLoading ? (
                <div className="rounded-[28px] bg-white px-8 py-10 ring-1 ring-black/[0.05]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Chargement</p>
                  <h2 className="mt-4 max-w-[520px] text-[40px] font-medium leading-[0.98] tracking-[-0.05em] text-[#101522]">
                    On prepare ton profil personnel.
                  </h2>
                  <p className="mt-4 max-w-[560px] text-[16px] leading-8 text-[#637488]">
                    Encore une seconde, on charge tes informations et tes contenus.
                  </p>
                </div>
              ) : !hasPosts ? (
                <div className="rounded-[28px] bg-white px-8 py-10 ring-1 ring-black/[0.05]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Profil vide</p>
                  <h2 className="mt-4 max-w-[520px] text-[40px] font-medium leading-[0.98] tracking-[-0.05em] text-[#101522]">
                    Ton profil est pret. Il manque juste ton premier post.
                  </h2>
                  <p className="mt-4 max-w-[560px] text-[16px] leading-8 text-[#637488]">
                    Commence avec un texte, une photo ou une video. Une fois publie, ton contenu apparaitra ici et dans le feed.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/compose")}
                      className="rounded-full bg-[#101522] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1b2433]"
                    >
                      Creer mon premier post
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/profile/edit")}
                      className="rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-[#101522] ring-1 ring-black/[0.08] transition hover:bg-[#f8fbff]"
                    >
                      Modifier mon profil
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto mt-2 w-full max-w-[468px]">
                  <ClassicFeedStream
                    className="space-y-16"
                    trackingEnabled
                    flatCards
                    items={profileFeedItems}
                    onOpenPost={(postId) => router.push(`/posts/${postId}`)}
                    onOpenComments={openComments}
                    onOpenShare={openShare}
                    onOpenTimeLike={openTimeLike}
                    onOpenMore={openMore}
                    onTimeLikeStateChange={handleProfileTimeLikeStateChange}
                  />
                </div>
              )}
            </section>
          ) : null}

          {profileView === "albums" ? (
            <section className="mt-6 space-y-6">
              <SectionHeader
                title="Albums photo"
                description="Chaque album regroupe les images que tu as choisi d'organiser ensemble."
                primaryLabel="Modifier mon profil"
                onPrimaryAction={() => router.push("/profile/edit")}
                secondaryLabel="Copier le profil"
                onSecondaryAction={handleCopyProfile}
              />

              {profileAlbumTiles.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {profileAlbumTiles.map((tile) => (
                    <article key={tile.id} className="group text-left">
                      <button
                        type="button"
                        onClick={() => setLightboxState({ images: tile.images, index: 0, title: tile.title })}
                        className="relative block h-[260px] w-full overflow-hidden rounded-[20px] bg-[#f4f6f8]"
                      >
                        <Image src={tile.src} alt={tile.alt} fill sizes="320px" className="object-cover transition duration-300 group-hover:scale-[1.015]" />
                      </button>
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => router.push(`/posts/${tile.postId}`)}
                            className="line-clamp-1 text-[15px] font-medium tracking-[-0.02em] text-[#101522] transition hover:opacity-80"
                          >
                            {tile.title}
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/posts/${tile.postId}`)}
                            className="mt-2 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#101522] ring-1 ring-black/[0.08] transition hover:bg-[#f7f9fc]"
                          >
                            Voir le post
                          </button>
                        </div>
                        <span className="shrink-0 text-[12px] text-[#7b8798]">{tile.photoCount} photo{tile.photoCount > 1 ? "s" : ""}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] bg-white px-6 py-8 text-[15px] leading-7 text-[#637488] ring-1 ring-black/[0.05]">
                  Aucun album photo pour l&apos;instant. Publie une photo puis coche la creation d&apos;album pour faire apparaitre tes albums ici.
                </div>
              )}
            </section>
          ) : null}

          {profileView === "videos" ? (
            <section className="mt-6 space-y-6">
              <SectionHeader
                title="Videos"
                description="Selection courte et formats verticaux publies sur le profil."
                primaryLabel="Creer une video"
                onPrimaryAction={() => router.push("/compose")}
                secondaryLabel="Copier le profil"
                onSecondaryAction={handleCopyProfile}
              />

              {profileVideoTiles.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {profileVideoTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => router.push(`/posts/${tile.postId}`)}
                      className="group relative h-[498px] overflow-hidden rounded-[20px] bg-black text-left"
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
                        <span className="mt-3 inline-flex rounded-full bg-white/16 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-md">
                          Ouvrir le post
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] bg-white px-6 py-8 text-[15px] leading-7 text-[#637488] ring-1 ring-black/[0.05]">
                  Aucune video publiee pour l&apos;instant. Poste une video pour activer cette vue.
                </div>
              )}
            </section>
          ) : null}
        </section>
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
              setLightboxState((current) =>
                current
                  ? {
                      ...current,
                      index: (current.index - 1 + current.images.length) % current.images.length,
                    }
                  : current,
              );
            }}
            className="absolute left-8 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/16"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxState((current) =>
                current
                  ? {
                      ...current,
                      index: (current.index + 1) % current.images.length,
                    }
                  : current,
              );
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
        onClose={closeComments}
        onCommentCountChange={handleProfileCommentCountChange}
      />
      <ShareDrawer
        key={shareVideoId !== null ? `profile-share-${shareVideoId}` : "profile-share-closed"}
        video={findProfileDrawerVideo(shareVideoId)}
        open={shareVideoId !== null}
        onClose={closeShare}
      />
      <MoreActionsDrawer
        key={moreVideoId !== null ? `profile-more-${moreVideoId}` : "profile-more-closed"}
        video={findProfileDrawerVideo(moreVideoId)}
        open={moreVideoId !== null}
        onClose={closeMore}
      />
      <TimeLikeDrawer
        key={timeLikeVideoId !== null ? `profile-timelike-${timeLikeVideoId}` : "profile-timelike-closed"}
        video={findProfileDrawerVideo(timeLikeVideoId)}
        snapshot={timeLikeVideoId !== null ? timeLikeSnapshots[timeLikeVideoId] ?? null : null}
        open={timeLikeVideoId !== null}
        onClose={closeTimeLike}
      />

      {toastMessage ? (
        <div className="fixed bottom-8 left-1/2 z-[220] -translate-x-1/2 rounded-[10px] bg-[#101522] px-4 py-2 text-[13px] font-medium text-white shadow-[0_16px_40px_rgba(15,23,42,0.24)]">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
