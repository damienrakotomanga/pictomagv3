"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlignJustify,
  Bookmark,
  Check,
  ChevronLeft,
  Clock3,
  Copy,
  Flag,
  Link2,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { PublicPostComment } from "@/lib/posts";

const DEFAULT_DRAWER_AVATAR = "/figma-assets/avatar-user.png";

export type PostInteractionVideo = {
  id: number;
  kind: "video" | "photo";
  src: string;
  author: string;
  title: string;
  music: string;
  duration: string;
  timeLikeCount: number;
  viewerHasTimeLike: boolean;
  viewerTimeLikeActiveMs: number | null;
  viewerTimeLikeMaxProgress: number | null;
};

export type TimeLikeRule = {
  minActiveMs: number;
  minProgress: number;
  mode: "time" | "or" | "and";
  segment: "photo" | "short" | "medium" | "long";
};

export type TimeLikeSnapshot = {
  videoId: number;
  kind: PostInteractionVideo["kind"];
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

type MoreDrawerView = "menu" | "description" | "playlist" | "report-primary" | "report-secondary";

type PlaylistOption = {
  id: number;
  name: string;
  meta: string;
  cover: string;
};

const playlistOptions: PlaylistOption[] = [
  { id: 1, name: "Inspiration feed", meta: "12 videos enregistrees", cover: "/figma-assets/avatar-post.png" },
  { id: 2, name: "Motion references", meta: "8 videos enregistrees", cover: "/figma-assets/avatar-user.png" },
  { id: 3, name: "Audio concepts", meta: "5 videos enregistrees", cover: "/figma-assets/avatar-story.png" },
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

export function parseDurationLabel(durationLabel: string) {
  const [minutesText, secondsText] = durationLabel.split(":");
  const minutes = Number(minutesText ?? 0);
  const seconds = Number(secondsText ?? 0);

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return 0;
  }

  return minutes * 60 + seconds;
}

export function getTimeLikeRule(kind: PostInteractionVideo["kind"], durationSeconds: number): TimeLikeRule {
  if (kind === "photo") {
    return { minActiveMs: 7000, minProgress: 0, mode: "time", segment: "photo" };
  }

  if (durationSeconds <= 20) {
    return { minActiveMs: 8000, minProgress: 0.7, mode: "or", segment: "short" };
  }

  if (durationSeconds <= 90) {
    return { minActiveMs: 12000, minProgress: 0.5, mode: "and", segment: "medium" };
  }

  return { minActiveMs: 22000, minProgress: 0.25, mode: "and", segment: "long" };
}

export function getTimeLikeProgress(rule: TimeLikeRule, activeMs: number, progress: number) {
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

export function shouldTriggerTimeLike(rule: TimeLikeRule, activeMs: number, progress: number) {
  if (rule.mode === "time") {
    return activeMs >= rule.minActiveMs;
  }

  if (rule.mode === "or") {
    return activeMs >= rule.minActiveMs || progress >= rule.minProgress;
  }

  return activeMs >= rule.minActiveMs && progress >= rule.minProgress;
}

export function createInitialTimeLikeSnapshot(
  video: PostInteractionVideo,
  overrides?: Partial<Pick<TimeLikeSnapshot, "count" | "activeMs" | "maxProgress" | "triggered">>,
): TimeLikeSnapshot {
  const durationSeconds = parseDurationLabel(video.duration);
  const rule = getTimeLikeRule(video.kind, durationSeconds);
  const activeMs = overrides?.activeMs ?? video.viewerTimeLikeActiveMs ?? 0;
  const maxProgress = overrides?.maxProgress ?? video.viewerTimeLikeMaxProgress ?? 0;
  const triggered = overrides?.triggered ?? video.viewerHasTimeLike;

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

function formatRelativeTimestamp(timestamp: number, now = Date.now()) {
  const diffMs = Math.max(0, now - timestamp);
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `il y a ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `il y a ${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `il y a ${diffDays} j`;
}

function getVideoDescription(video: PostInteractionVideo) {
  return `${video.title.replace(/\\.\\.\\.$/, "")} Son utilise: ${video.music}. Ce contenu fait partie du fil video Pictomag et peut etre enregistre, partage ou signale depuis le menu d'actions.`;
}

function formatTimeLikeRule(rule: TimeLikeRule) {
  const minSeconds = Math.max(1, Math.ceil(rule.minActiveMs / 1000));
  const minProgressPercent = Math.round(rule.minProgress * 100);

  if (rule.mode === "time") {
    return `${minSeconds}s d'attention continue`;
  }

  if (rule.mode === "or") {
    return `${minSeconds}s d'attention ou ${minProgressPercent}% de progression`;
  }

  return `${minSeconds}s d'attention et ${minProgressPercent}% de progression`;
}

function getTimeLikeRemainingCopy(snapshot: TimeLikeSnapshot) {
  if (snapshot.triggered) {
    return "Votre session a deja valide le signal TimeLike sur ce post.";
  }

  const secondsLeft = Math.max(0, Math.ceil((snapshot.rule.minActiveMs - snapshot.activeMs) / 1000));
  const progressLeft = Math.max(0, Math.ceil(snapshot.rule.minProgress * 100 - snapshot.maxProgress * 100));

  if (snapshot.rule.mode === "time") {
    return `Encore ${secondsLeft}s d'attention pour valider le signal.`;
  }

  if (snapshot.rule.mode === "or") {
    const parts: string[] = [];

    if (secondsLeft > 0) {
      parts.push(`${secondsLeft}s d'attention`);
    }

    if (progressLeft > 0) {
      parts.push(`${progressLeft}% de progression`);
    }

    return parts.length > 0
      ? `Encore ${parts.join(" ou ")} pour declencher le signal.`
      : "Le signal est pret a se declencher sur votre session.";
  }

  return `Encore ${secondsLeft}s d'attention et ${progressLeft}% de progression pour valider le signal.`;
}

export function CommentsDrawer({
  video,
  open,
  onClose,
  onCommentCountChange,
}: {
  video: PostInteractionVideo | null;
  open: boolean;
  onClose: () => void;
  onCommentCountChange?: (videoId: number, nextCount: number) => void;
}) {
  const [comments, setComments] = useState<PublicPostComment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !video) {
      return;
    }

    let cancelled = false;

    const loadComments = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/posts/${video.id}/comments`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | { comments?: PublicPostComment[]; totalCount?: number; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.message || "Impossible de charger les commentaires.");
        }

        if (cancelled) {
          return;
        }

        setComments(Array.isArray(payload?.comments) ? payload.comments : []);
        const nextCount = typeof payload?.totalCount === "number" ? payload.totalCount : 0;
        setTotalCount(nextCount);
        onCommentCountChange?.(video.id, nextCount);
      } catch (error) {
        if (!cancelled) {
          setComments([]);
          setTotalCount(0);
          setErrorMessage(error instanceof Error ? error.message : "Impossible de charger les commentaires.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [onCommentCountChange, open, video]);

  const handleSubmit = useCallback(async () => {
    if (!video || submitting) {
      return;
    }

    const body = draft.trim();
    if (!body) {
      setErrorMessage("Ecris un commentaire avant d'envoyer.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/posts/${video.id}/comments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { comment?: PublicPostComment; totalCount?: number; message?: string }
        | null;

      if (!response.ok || !payload?.comment) {
        throw new Error(payload?.message || "Impossible d'ajouter ce commentaire.");
      }

      setComments((current) => [payload.comment!, ...current]);
      const nextCount = typeof payload.totalCount === "number" ? payload.totalCount : totalCount + 1;
      setTotalCount(nextCount);
      setDraft("");
      onCommentCountChange?.(video.id, nextCount);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'ajouter ce commentaire.");
    } finally {
      setSubmitting(false);
    }
  }, [draft, onCommentCountChange, submitting, totalCount, video]);

  if (!open || !video) {
    return null;
  }

  const countLabel = new Intl.NumberFormat("fr-FR").format(totalCount);

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
            <span className="comments-drawer-count">{countLabel}</span>
          </div>
          <div className="comments-drawer-header-actions">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f3f5f8] px-3 py-2 text-[12px] font-medium text-[#6d7786]">
              <SlidersHorizontal size={15} strokeWidth={2.1} />
              Discussion active
            </span>
            <button type="button" aria-label="Close comments" onClick={onClose} className="comments-icon-btn">
              <X size={21} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="comments-drawer-list">
          {loading ? (
            <div className="rounded-[24px] bg-[#f7f9fc] px-5 py-5 text-[14px] leading-7 text-[#667085]">
              Chargement des commentaires...
            </div>
          ) : null}

          {!loading && errorMessage ? (
            <div className="rounded-[24px] bg-[#fff4f4] px-5 py-5 text-[14px] leading-7 text-[#b42318] ring-1 ring-[#f4c7c7]">
              {errorMessage}
            </div>
          ) : null}

          {!loading && comments.length === 0 ? (
            <div className="rounded-[24px] bg-[#f7f9fc] px-5 py-5 text-[14px] leading-7 text-[#667085]">
              Aucun commentaire publie pour l&apos;instant. Lance la discussion avec le premier message.
            </div>
          ) : null}

          {comments.map((entry) => (
            <article key={entry.id} className="comment-card">
              <div className="comment-card-top">
                <div className="comment-avatar-wrap">
                  <Image
                    src={entry.author.avatarUrl || DEFAULT_DRAWER_AVATAR}
                    alt={entry.author.displayName}
                    fill
                    sizes="38px"
                    className="object-cover"
                  />
                </div>
                <div className="comment-body">
                  <div className="comment-meta-row">
                    <p className="comment-author">
                      {entry.author.displayName}
                      <span className="ml-2 text-[13px] font-normal text-[#667085]">@{entry.author.username}</span>
                    </p>
                    <span className="comment-meta">{formatRelativeTimestamp(entry.createdAt)}</span>
                  </div>
                  <p className="comment-text">{entry.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="comments-drawer-footer">
          <div className="comments-footer-avatar">
            <Image src={DEFAULT_DRAWER_AVATAR} alt="Current user" fill sizes="36px" className="object-cover" />
          </div>
          <form
            className="flex min-w-0 flex-1 items-center gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ajouter un commentaire"
              className="comments-input-shell min-w-0 flex-1 bg-transparent outline-none"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={submitting || draft.trim().length === 0}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#101522] px-4 text-[13px] font-semibold text-white transition hover:bg-[#1b2433] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
            >
              {submitting ? "Envoi..." : "Envoyer"}
            </button>
          </form>
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
  video: PostInteractionVideo | null;
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!open || !video) {
    return null;
  }

  const shareUrl = `https://pictomag.app/watch/${video.id}`;

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
            <h2 className="share-drawer-title">Partager ce post</h2>
            <p className="share-drawer-subtitle">Copie le lien pour le partager ou l&apos;ouvrir ailleurs.</p>
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

        <div className="mx-8 mt-6 rounded-[24px] bg-[#f7f9fc] px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#101522] ring-1 ring-black/[0.05]">
              <Link2 className="h-[18px] w-[18px]" strokeWidth={2.1} />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[#101522]">Partage simple pour cette phase</p>
              <p className="mt-2 text-[14px] leading-7 text-[#667085]">
                Le partage interne n&apos;est pas encore ouvert ici. Pour l&apos;instant, le lien du post est la facon la plus propre de diffuser ton contenu.
              </p>
            </div>
          </div>
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
  video: PostInteractionVideo | null;
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

export function TimeLikeDrawer({
  video,
  snapshot,
  open,
  onClose,
}: {
  video: PostInteractionVideo | null;
  snapshot: TimeLikeSnapshot | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !video) {
    return null;
  }

  const resolvedSnapshot = snapshot ?? createInitialTimeLikeSnapshot(video);
  const progressPercent = Math.max(0, Math.min(100, Math.round(resolvedSnapshot.progressValue * 100)));
  const attentionSeconds = Math.max(0, Math.round(resolvedSnapshot.activeMs / 1000));
  const watchedPercent = Math.max(0, Math.min(100, Math.round(resolvedSnapshot.maxProgress * 100)));
  const statusLabel = resolvedSnapshot.triggered ? "Signal valide" : "Session en cours";

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
              Le signal repose sur l&apos;attention detectee pendant la session, pas sur un clic reflexe.
            </p>
          </div>
          <button type="button" aria-label="Close TimeLike panel" onClick={onClose} className="comments-icon-btn">
            <X size={21} strokeWidth={2.2} />
          </button>
        </div>

        <div className="timelike-status-card timelike-status-card-simple">
          <div className="timelike-status-top">
            <div className="timelike-position-card">
              <span className="timelike-position-label">Votre session</span>
              <p className="timelike-position-meta">{getTimeLikeRemainingCopy(resolvedSnapshot)}</p>
              <strong className="timelike-position-rank">{statusLabel}</strong>
            </div>
            <div className="timelike-summary-count">
              <span className="timelike-summary-count-label">TimeLikes enregistres</span>
              <strong>{resolvedSnapshot.count}</strong>
            </div>
          </div>
        </div>

        <div className="timelike-list-shell">
          <div className="timelike-list-header">
            <div>
              <h3 className="timelike-list-title">Ce qui compte vraiment</h3>
              <p className="timelike-list-subtitle">
                Ce panneau montre seulement la progression de votre session et la regle appliquee a ce contenu.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-[20px] border border-black/[0.06] bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea2bc]">Attention detectee</p>
                <p className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-[#101522]">{attentionSeconds}s</p>
                <p className="mt-2 text-[13px] leading-6 text-[#667085]">
                  Temps cumule observe pendant cette session sur ce contenu.
                </p>
              </article>
              <article className="rounded-[20px] border border-black/[0.06] bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea2bc]">Progression vue</p>
                <p className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-[#101522]">{watchedPercent}%</p>
                <p className="mt-2 text-[13px] leading-6 text-[#667085]">
                  Meilleure progression atteinte sur la lecture courante.
                </p>
              </article>
            </div>

            <article className="rounded-[24px] border border-black/[0.06] bg-[#f8fbff] px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea2bc]">Regle appliquee</p>
                  <p className="mt-2 text-[16px] font-semibold text-[#101522]">{formatTimeLikeRule(resolvedSnapshot.rule)}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#101522] ring-1 ring-black/[0.06]">
                  {resolvedSnapshot.rule.segment}
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-[12px] font-medium text-[#667085]">
                  <span>Progression de session</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className="h-full rounded-full bg-[#101522] transition-[width] duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </article>
          </div>
        </div>

        <div className="timelike-list-note">
          <Clock3 size={16} strokeWidth={2.15} />
          <span>
            Aucun classement public n&apos;est calcule ici. Le panneau affiche seulement le compteur du post et votre session courante.
          </span>
        </div>
      </aside>
    </>
  );
}
