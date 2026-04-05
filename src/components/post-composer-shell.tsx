/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { DragEventHandler } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Images,
  LoaderCircle,
  Plus,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";

type ComposerMode = "text" | "photo" | "video";

export type ComposerPreviewDraft = {
  id: string;
  src: string;
  altText: string;
  fileName: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function ModeChip({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition",
        active
          ? "bg-white text-[#101522] shadow-[0_14px_30px_rgba(16,21,34,0.14)]"
          : "bg-white/10 text-white/78 hover:bg-white/16",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

export function PostComposerHeader({
  title,
  backAriaLabel,
  onBack,
  showBackButton,
  actionLabel,
  actionDisabled,
  actionForm,
  actionType,
  onAction,
  showAction,
}: {
  title: string;
  backAriaLabel: string;
  onBack: () => void;
  showBackButton: boolean;
  actionLabel: string;
  actionDisabled: boolean;
  actionForm?: string;
  actionType: "button" | "submit";
  onAction?: () => void;
  showAction: boolean;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-black/6 px-6">
      <div className="flex min-w-[120px] items-center gap-3">
        {showBackButton ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#101522] transition hover:bg-[#f3f5f9]"
            aria-label={backAriaLabel}
          >
            {backAriaLabel === "Revenir" ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        ) : null}
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-[#101522]">{title}</p>
      </div>
      <div className="flex min-w-[120px] justify-end">
        {showAction ? (
          <button
            type={actionType}
            form={actionForm}
            onClick={onAction}
            disabled={actionDisabled}
            className="inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold text-[#4f46ff] transition hover:bg-[#f3f5ff] disabled:cursor-not-allowed disabled:text-[#9ba6c7] disabled:hover:bg-transparent"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function PostComposerStatusView({ sharing }: { sharing: boolean }) {
  return (
    <div className="flex min-h-[760px] flex-col items-center justify-center gap-8 bg-[#fbfcff] px-8 py-12 text-center">
      <div
        className={cx(
          "relative flex h-24 w-24 items-center justify-center rounded-full",
          sharing ? "animate-spin" : "",
        )}
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,191,0,1), rgba(255,76,120,1), rgba(167,75,255,1), rgba(255,191,0,1))",
        }}
      >
        <div className="absolute inset-[3px] rounded-full bg-[#fbfcff]" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#fbfcff]">
          {sharing ? (
            <LoaderCircle className="h-8 w-8 text-[#101522]" />
          ) : (
            <Check className="h-10 w-10 text-[#ff3d6c]" strokeWidth={2.25} />
          )}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-[16px] font-semibold text-[#101522]">
          {sharing ? "Nous preparons ta publication..." : "Votre publication a ete partagee."}
        </p>
        <p className="text-[14px] text-[#637488]">
          {sharing
            ? "On applique tes reglages et on envoie le post dans ton profil sans recharger l'interface."
            : "Retour automatique vers ton profil dans un instant."}
        </p>
      </div>
    </div>
  );
}

export function PostComposerModeSwitcher({
  mode,
  onSelectMode,
}: {
  mode: ComposerMode;
  onSelectMode: (mode: ComposerMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ModeChip active={mode === "text"} label="Texte" icon={Type} onClick={() => onSelectMode("text")} />
      <ModeChip active={mode === "photo"} label="Photo" icon={Images} onClick={() => onSelectMode("photo")} />
      <ModeChip active={mode === "video"} label="Video" icon={Video} onClick={() => onSelectMode("video")} />
    </div>
  );
}

export function PostComposerEmptyPhotoSelection({
  dragActive,
  maxSelection,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectMode,
  onOpenFilePicker,
}: {
  dragActive: boolean;
  maxSelection: number;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onSelectMode: (mode: ComposerMode) => void;
  onOpenFilePicker: () => void;
}) {
  return (
    <div className="flex min-h-[760px] flex-col items-center justify-center bg-[#fbfcff] px-8 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
        <PostComposerModeSwitcher mode="photo" onSelectMode={onSelectMode} />
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cx(
          "flex w-full max-w-[560px] flex-col items-center justify-center rounded-[28px] px-8 py-20 text-center transition",
          dragActive ? "bg-[#eef3ff] shadow-[0_20px_60px_rgba(79,70,255,0.18)]" : "bg-white shadow-[0_24px_70px_rgba(16,21,34,0.08)]",
        )}
      >
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[#f4f6fb]">
          <ImagePlus className="h-10 w-10 text-[#101522]" strokeWidth={1.9} />
        </div>
        <h1 className="text-[32px] font-semibold leading-[1.08] text-[#101522]">Faites glisser les photos ici</h1>
        <p className="mt-4 max-w-[380px] text-[15px] leading-7 text-[#637488]">
          Selection locale, parcours en plusieurs etapes, ajustements non destructifs, puis partage sans recharger le site.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenFilePicker}
            className="inline-flex h-12 items-center rounded-full bg-[#4f46ff] px-6 text-[14px] font-semibold text-white shadow-[0_16px_34px_rgba(79,70,255,0.22)] transition hover:bg-[#4138f5]"
          >
            Selectionner sur l&apos;ordinateur
          </button>
          <button
            type="button"
            onClick={() => onSelectMode("text")}
            className="inline-flex h-12 items-center rounded-full bg-[#f4f6fb] px-6 text-[14px] font-medium text-[#101522] transition hover:bg-[#eef2f8]"
          >
            Ecrire un post texte
          </button>
        </div>
        <p className="mt-6 text-[13px] text-[#8ea2bc]">Jusqu&apos;a {maxSelection} photos, sans bordures inutiles.</p>
      </div>
    </div>
  );
}

export function PostComposerPhotoPreviewToolbar({
  currentIndex,
  totalCount,
  canMoveBackward,
  canMoveForward,
  onAddMedia,
  onMoveBackward,
  onMoveForward,
  onRemove,
}: {
  currentIndex: number;
  totalCount: number;
  canMoveBackward: boolean;
  canMoveForward: boolean;
  onAddMedia: () => void;
  onMoveBackward: () => void;
  onMoveForward: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onAddMedia}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-white/20"
      >
        <Plus className="h-4 w-4" />
        Ajouter des medias
      </button>
      <button
        type="button"
        onClick={onMoveBackward}
        disabled={!canMoveBackward}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ArrowLeft className="h-4 w-4" />
        Avant
      </button>
      <button
        type="button"
        onClick={onMoveForward}
        disabled={!canMoveForward}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
      >
        Apres
        <ArrowRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={totalCount === 0}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-[rgba(255,102,132,0.28)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Trash2 className="h-4 w-4" />
        Retirer
      </button>
      <div className="inline-flex h-10 items-center rounded-full bg-white/12 px-4 text-[13px] font-medium text-white/88 backdrop-blur-md">
        {currentIndex}/{totalCount} media{totalCount > 1 ? "s" : ""}
      </div>
    </div>
  );
}

export function PostComposerPhotoFilmstrip({
  drafts,
  activeDraftId,
  onSelectDraft,
  onRemoveDraft,
  onAddPhoto,
}: {
  drafts: ComposerPreviewDraft[];
  activeDraftId: string | null;
  onSelectDraft: (draftId: string) => void;
  onRemoveDraft: (draftId: string) => void;
  onAddPhoto: () => void;
}) {
  return (
    <div className="absolute bottom-6 left-6 right-6">
      <div className="mx-auto flex max-w-[720px] items-center gap-3 overflow-x-auto rounded-full bg-white/12 px-4 py-3 backdrop-blur-md">
        {drafts.map((draft) => (
          <div key={draft.id} className="relative h-16 w-16 shrink-0">
            <button
              type="button"
              onClick={() => onSelectDraft(draft.id)}
              className={cx(
                "relative h-16 w-16 overflow-hidden rounded-[18px] transition",
                draft.id === activeDraftId ? "ring-2 ring-white" : "opacity-72 hover:opacity-100",
              )}
            >
              <img src={draft.src} alt={draft.altText || draft.fileName} className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => onRemoveDraft(draft.id)}
              className="absolute -right-1 -top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#101522] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:bg-[#ff4c78]"
              aria-label={`Retirer ${draft.fileName}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAddPhoto}
          className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-white/16 text-white transition hover:bg-white/22"
          aria-label="Ajouter une photo"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function PostComposerIdentityBadge({
  avatarUrl,
  displayName,
  username,
}: {
  avatarUrl: string;
  displayName: string;
  username: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 overflow-hidden rounded-full bg-[#eef3f8]">
        <Image src={avatarUrl} alt={displayName} fill sizes="44px" className="object-cover" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[#101522]">{displayName}</p>
        <p className="text-[12px] text-[#8ea2bc]">@{username}</p>
      </div>
    </div>
  );
}

export function PostComposerTextPreviewCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex w-full max-w-[560px] flex-col justify-between rounded-[28px] bg-white px-8 py-8 shadow-[0_30px_70px_rgba(0,0,0,0.22)]">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[#8ea2bc]">Apercu texte</p>
        <h1 className="mt-6 text-[42px] font-semibold leading-[0.96] text-[#101522]">
          {title.trim() || "Ecris une note qui merite de rester dans le feed."}
        </h1>
      </div>
      <p className="mt-10 text-[16px] leading-8 text-[#637488]">
        {body.trim() || "Ton texte apparaitra ici, dans une version plus editoriale et plus calme que l'ancien composeur."}
      </p>
    </div>
  );
}

export function PostComposerVideoPreviewCard({
  posterUrl,
  title,
  durationLabel,
  trackName,
}: {
  posterUrl: string;
  title: string;
  durationLabel: string;
  trackName: string;
}) {
  return (
    <div className="flex w-full max-w-[560px] flex-col items-center rounded-[28px] bg-white px-8 py-8 text-center shadow-[0_30px_70px_rgba(0,0,0,0.22)]">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[#f4f6fb]">
        <Video className="h-10 w-10 text-[#101522]" strokeWidth={1.9} />
      </div>
      {posterUrl.trim() ? (
        <img src={posterUrl} alt="Poster video" className="h-[340px] w-full rounded-[24px] object-cover" />
      ) : (
        <div className="flex h-[340px] w-full items-center justify-center rounded-[24px] bg-[#f4f6fb]">
          <p className="max-w-[240px] text-[15px] leading-7 text-[#637488]">
            Ajoute l&apos;URL de la video et, si tu veux, un poster pour retrouver un rendu plus propre dans le feed.
          </p>
        </div>
      )}
      <p className="mt-6 text-[15px] font-medium text-[#101522]">{title.trim() || "Post video"}</p>
      <p className="mt-2 text-[13px] text-[#637488]">
        {durationLabel.trim() || "0:00"}
        {trackName.trim() ? ` - ${trackName.trim()}` : ""}
      </p>
    </div>
  );
}
