"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ClassicFeedStream } from "@/components/classic-feed-view";
import {
  CommentsDrawer,
  createInitialTimeLikeSnapshot,
  MoreActionsDrawer,
  ShareDrawer,
  TimeLikeDrawer,
  type TimeLikeSnapshot,
} from "@/components/post-interaction-drawers";
import { toPostInteractionVideoFromPost } from "@/components/post-interaction-video";
import { usePostInteractionOverlays } from "@/components/use-post-interaction-overlays";
import { formatDisplayName } from "@/lib/display-name";
import {
  formatRelativeTimestamp,
  type PublicPost,
  toPostDisplayCardItem,
} from "@/lib/posts";
import { DEFAULT_AVATAR, resolveProfileAvatarSrc } from "@/lib/profile-avatar";

function formatCompactCount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function PostDetailPage({ post, relatedPosts = [] }: { post: PublicPost; relatedPosts?: PublicPost[] }) {
  const router = useRouter();
  const [timeLikeSnapshots, setTimeLikeSnapshots] = useState<Record<number, TimeLikeSnapshot>>({});
  const [commentCount, setCommentCount] = useState(post.commentCount);
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
    shareVideoId,
    timeLikeVideoId,
  } = usePostInteractionOverlays({ manageBodyScroll: false });

  const item = useMemo(() => {
    const card = toPostDisplayCardItem(post);
    return {
      ...card,
      commentCount: formatCompactCount(commentCount),
    };
  }, [commentCount, post]);
  const drawerVideo = useMemo(() => toPostInteractionVideoFromPost(post), [post]);

  const findDrawerVideo = useCallback(
    (videoId: number | null) => (videoId !== null && drawerVideo?.id === videoId ? drawerVideo : null),
    [drawerVideo],
  );

  const heroMedia = useMemo(
    () => [...post.media].sort((left, right) => left.position - right.position)[0] ?? null,
    [post.media],
  );

  const authorAvatar = resolveProfileAvatarSrc(post.author.avatarUrl, DEFAULT_AVATAR);

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 pb-16 pt-10 text-[#101522]">
      <div className="mx-auto max-w-[1120px]">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-medium ring-1 ring-black/[0.06] transition hover:bg-[#eef4ff]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_420px]">
          <div className="rounded-[32px] bg-white p-6 ring-1 ring-black/[0.05]">
            {heroMedia ? (
              heroMedia.mediaType === "video" ? (
                <div className="overflow-hidden rounded-[28px] bg-black">
                  <video
                    src={heroMedia.src}
                    poster={heroMedia.posterSrc ?? undefined}
                    controls
                    playsInline
                    className="aspect-[16/9] w-full bg-black object-contain"
                  />
                </div>
              ) : (
                <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[#eef3fb]">
                  <Image src={heroMedia.src} alt={heroMedia.altText || post.title} fill sizes="720px" className="object-cover" />
                </div>
              )
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-[28px] bg-[#eef3fb] text-[15px] text-[#637488]">
                Aucun media sur ce post.
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[32px] bg-white p-6 ring-1 ring-black/[0.05]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Post</p>
              <h1 className="mt-4 text-[42px] font-medium leading-[0.96] tracking-[-0.06em] text-[#101522]">
                {post.title}
              </h1>
              {post.body ? (
                <p className="mt-4 text-[15px] leading-8 text-[#4d6074]">{post.body}</p>
              ) : null}
              <div className="mt-6 flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-black/[0.06]">
                  <Image src={authorAvatar} alt={post.author.displayName} fill sizes="48px" className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/u/${encodeURIComponent(post.author.username)}`)}
                  className="text-left transition hover:opacity-80"
                >
                  <p className="text-[15px] font-semibold text-[#101522]">
                    {formatDisplayName(post.author.displayName, post.author.username)}
                  </p>
                  <p className="text-[13px] text-[#667085]">@{post.author.username}</p>
                </button>
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-6 ring-1 ring-black/[0.05]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Contexte</p>
              <div className="mt-4 space-y-3 text-[14px] leading-7 text-[#4d6074]">
                <p>
                  <span className="font-semibold text-[#101522]">Type:</span> {post.kind}
                </p>
                <p>
                  <span className="font-semibold text-[#101522]">Surface:</span> {post.surface}
                </p>
                <p>
                  <span className="font-semibold text-[#101522]">Son:</span> {post.trackName || "Aucun son"}
                </p>
                <p>
                  <span className="font-semibold text-[#101522]">Duree:</span> {post.durationLabel}
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 rounded-[32px] bg-white px-6 py-8 ring-1 ring-black/[0.05]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Lecture du post</p>
          <div className="mt-6">
            <ClassicFeedStream
              className="space-y-0"
              trackingEnabled
              flatCards
              items={[item]}
              onOpenComments={openComments}
              onOpenShare={openShare}
              onOpenTimeLike={openTimeLike}
              onOpenMore={openMore}
              onTimeLikeStateChange={(videoId, snapshot) =>
                setTimeLikeSnapshots((current) => ({ ...current, [videoId]: snapshot }))
              }
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[32px] bg-white px-6 py-8 ring-1 ring-black/[0.05]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">A suivre</p>
            <h2 className="mt-4 text-[30px] font-medium leading-[1] tracking-[-0.05em] text-[#101522]">
              D&apos;autres posts de {formatDisplayName(post.author.displayName, post.author.username)}
            </h2>
            {relatedPosts.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {relatedPosts.map((relatedPost) => {
                  const media = [...relatedPost.media].sort((left, right) => left.position - right.position)[0] ?? null;
                  return (
                    <button
                      key={relatedPost.id}
                      type="button"
                      onClick={() => router.push(`/posts/${relatedPost.id}`)}
                      className="group text-left"
                    >
                      <article className="overflow-hidden rounded-[24px] bg-[#f4f7fb] ring-1 ring-black/[0.04] transition hover:-translate-y-[1px]">
                        <div className="relative aspect-[4/5] overflow-hidden bg-[#eef3fb]">
                          {media ? (
                            media.mediaType === "video" ? (
                              <video
                                src={media.src}
                                poster={media.posterSrc ?? undefined}
                                muted
                                loop
                                autoPlay
                                playsInline
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                              />
                            ) : (
                              <Image
                                src={media.src}
                                alt={media.altText || relatedPost.title}
                                fill
                                sizes="280px"
                                className="object-cover transition duration-500 group-hover:scale-[1.015]"
                              />
                            )
                          ) : (
                            <div className="flex h-full items-center justify-center text-[13px] text-[#7b8798]">
                              Sans media
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea2bc]">
                            {relatedPost.kind}
                          </p>
                          <p className="line-clamp-2 text-[16px] font-medium leading-6 tracking-[-0.02em] text-[#101522]">
                            {relatedPost.title}
                          </p>
                          <p className="text-[13px] text-[#667085]">{formatRelativeTimestamp(relatedPost.publishedAt)}</p>
                        </div>
                      </article>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-[15px] leading-8 text-[#637488]">
                Ce createur n&apos;a pas encore d&apos;autres posts visibles ici.
              </p>
            )}
          </div>

          <aside className="rounded-[32px] bg-white p-6 ring-1 ring-black/[0.05]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Profil</p>
            <h2 className="mt-4 text-[28px] font-medium leading-[1] tracking-[-0.05em] text-[#101522]">
              Continue sur @{post.author.username}
            </h2>
            <p className="mt-4 text-[15px] leading-8 text-[#4d6074]">
              {post.author.bio || "Retrouve le profil public, les autres formats et la suite du contenu publie par ce createur."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/u/${encodeURIComponent(post.author.username)}`)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#101522] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1b2433]"
              >
                Voir le profil
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-[14px] font-semibold text-[#101522] ring-1 ring-black/[0.08] transition hover:bg-[#f7f9fc]"
              >
                Retour au feed
              </button>
            </div>
          </aside>
        </section>
      </div>

      <CommentsDrawer
        video={findDrawerVideo(commentsVideoId)}
        open={commentsVideoId !== null}
        onClose={closeComments}
        onCommentCountChange={(videoId, nextCount) => {
          if (videoId === post.id) {
            setCommentCount(nextCount);
          }
        }}
      />
      <ShareDrawer video={findDrawerVideo(shareVideoId)} open={shareVideoId !== null} onClose={closeShare} />
      <MoreActionsDrawer
        video={findDrawerVideo(moreVideoId)}
        open={moreVideoId !== null}
        onClose={closeMore}
      />
      <TimeLikeDrawer
        video={findDrawerVideo(timeLikeVideoId)}
        snapshot={
          timeLikeVideoId !== null
            ? timeLikeSnapshots[timeLikeVideoId] ??
              (drawerVideo && drawerVideo.id === timeLikeVideoId ? createInitialTimeLikeSnapshot(drawerVideo) : null)
            : null
        }
        open={timeLikeVideoId !== null}
        onClose={closeTimeLike}
      />
    </main>
  );
}
