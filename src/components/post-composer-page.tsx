/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ChangeEvent, CSSProperties, DragEvent, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Crop,
  ImagePlus,
  Images,
  LoaderCircle,
  Plus,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import { formatDisplayName } from "@/lib/display-name";
import { DEFAULT_AVATAR, resolveProfileAvatarSrc } from "@/lib/profile-avatar";

type ComposerMode = "text" | "photo" | "video";
type PhotoStep = "select" | "crop" | "edit" | "details" | "sharing" | "success";
type EditorTab = "filters" | "settings";
type CropPreset = "original" | "square" | "portrait" | "landscape";
type RangeFieldKey = keyof PhotoAdjustments;
type FilterPresetId =
  | "original"
  | "aden"
  | "clarendon"
  | "crema"
  | "gingham"
  | "juno"
  | "lark"
  | "ludwig"
  | "moon"
  | "reyes"
  | "slumber";

type ProfileMePayload = {
  authenticated?: boolean;
  profile?: {
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
    onboardingCompletedAt?: number | null;
  };
};

type PhotoAdjustments = {
  brightness: number;
  contrast: number;
  fade: number;
  saturation: number;
  temperature: number;
  vignette: number;
};

type PhotoDraft = {
  id: string;
  fileName: string;
  src: string;
  cropPreset: CropPreset;
  zoom: number;
  offsetX: number;
  offsetY: number;
  filterPreset: FilterPresetId;
  adjustments: PhotoAdjustments;
  altText: string;
  naturalWidth: number;
  naturalHeight: number;
};

type FilterPreset = {
  id: FilterPresetId;
  label: string;
  deltas: Partial<PhotoAdjustments>;
};

const CAPTION_MAX_LENGTH = 2200;
const PHOTO_MAX_SELECTION = 10;
const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  fade: 0,
  saturation: 0,
  temperature: 0,
  vignette: 0,
};

const PHOTO_FLOW: PhotoStep[] = ["crop", "edit", "details"];

const CROP_PRESETS: Array<{ id: CropPreset; label: string; ratio?: number }> = [
  { id: "original", label: "Original" },
  { id: "square", label: "1:1", ratio: 1 },
  { id: "portrait", label: "4:5", ratio: 4 / 5 },
  { id: "landscape", label: "16:9", ratio: 16 / 9 },
];

const FILTER_PRESETS: FilterPreset[] = [
  { id: "original", label: "Original", deltas: {} },
  { id: "aden", label: "Aden", deltas: { brightness: 8, contrast: -10, saturation: -8, temperature: 10, fade: 14 } },
  { id: "clarendon", label: "Clarendon", deltas: { brightness: 6, contrast: 14, saturation: 18, temperature: -3 } },
  { id: "crema", label: "Crema", deltas: { brightness: 5, contrast: -6, saturation: 8, temperature: 6, fade: 10 } },
  { id: "gingham", label: "Gingham", deltas: { brightness: 6, contrast: -10, saturation: -12, temperature: 8, fade: 18 } },
  { id: "juno", label: "Juno", deltas: { brightness: 4, contrast: 12, saturation: 16, temperature: 2 } },
  { id: "lark", label: "Lark", deltas: { brightness: 8, contrast: 0, saturation: 12, temperature: 6 } },
  { id: "ludwig", label: "Ludwig", deltas: { brightness: 0, contrast: 18, saturation: 8, fade: 6 } },
  { id: "moon", label: "Moon", deltas: { brightness: 4, contrast: 10, saturation: -40, fade: 16 } },
  { id: "reyes", label: "Reyes", deltas: { brightness: 10, contrast: -12, saturation: -18, temperature: 8, fade: 20 } },
  { id: "slumber", label: "Slumber", deltas: { brightness: 4, contrast: -16, saturation: -10, temperature: 6, fade: 18 } },
];

const RANGE_FIELDS: Array<{ key: RangeFieldKey; label: string; min: number; max: number }> = [
  { key: "brightness", label: "Luminosite", min: -40, max: 40 },
  { key: "contrast", label: "Contraste", min: -40, max: 40 },
  { key: "fade", label: "Fondu", min: 0, max: 40 },
  { key: "saturation", label: "Saturation", min: -40, max: 40 },
  { key: "temperature", label: "Temperature", min: -40, max: 40 },
  { key: "vignette", label: "Vignette", min: 0, max: 45 },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveAltText(fileName: string, title: string) {
  const normalizedName = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return normalizedName || title || "Image du post";
}

function getCropRatio(draft: PhotoDraft) {
  const preset = CROP_PRESETS.find((entry) => entry.id === draft.cropPreset);
  if (preset?.ratio) {
    return preset.ratio;
  }

  return draft.naturalWidth > 0 && draft.naturalHeight > 0 ? draft.naturalWidth / draft.naturalHeight : 1;
}

function getEffectiveAdjustments(draft: PhotoDraft): PhotoAdjustments {
  const preset = FILTER_PRESETS.find((entry) => entry.id === draft.filterPreset);
  const deltas = preset?.deltas ?? {};

  return {
    brightness: clamp((deltas.brightness ?? 0) + draft.adjustments.brightness, -60, 60),
    contrast: clamp((deltas.contrast ?? 0) + draft.adjustments.contrast, -60, 60),
    fade: clamp((deltas.fade ?? 0) + draft.adjustments.fade, 0, 60),
    saturation: clamp((deltas.saturation ?? 0) + draft.adjustments.saturation, -60, 60),
    temperature: clamp((deltas.temperature ?? 0) + draft.adjustments.temperature, -60, 60),
    vignette: clamp((deltas.vignette ?? 0) + draft.adjustments.vignette, 0, 60),
  };
}

function buildPreviewFilter(adjustments: PhotoAdjustments) {
  return [
    `brightness(${1 + adjustments.brightness / 100})`,
    `contrast(${1 + adjustments.contrast / 100})`,
    `saturate(${1 + adjustments.saturation / 100})`,
  ].join(" ");
}

function buildCanvasFilter(adjustments: PhotoAdjustments) {
  return [
    `brightness(${1 + adjustments.brightness / 100})`,
    `contrast(${1 + adjustments.contrast / 100})`,
    `saturate(${1 + adjustments.saturation / 100})`,
  ].join(" ");
}

function getTintOverlayStyle(adjustments: PhotoAdjustments): CSSProperties {
  if (adjustments.temperature === 0) {
    return { opacity: 0 };
  }

  const alpha = Math.min(Math.abs(adjustments.temperature) / 220, 0.24);
  return {
    background:
      adjustments.temperature > 0
        ? `linear-gradient(180deg, rgba(255,173,92,${alpha}) 0%, rgba(255,130,105,${alpha / 1.6}) 100%)`
        : `linear-gradient(180deg, rgba(91,139,255,${alpha}) 0%, rgba(118,198,255,${alpha / 1.6}) 100%)`,
    mixBlendMode: "screen",
    opacity: 1,
  };
}

function getFadeOverlayOpacity(adjustments: PhotoAdjustments) {
  return clamp(adjustments.fade / 120, 0, 0.26);
}

function getVignetteOverlay(adjustments: PhotoAdjustments) {
  const alpha = clamp(adjustments.vignette / 170, 0, 0.3);
  return `radial-gradient(circle at center, rgba(0,0,0,0) 44%, rgba(0,0,0,${alpha}) 100%)`;
}

function getPreviewTransformStyle(draft: PhotoDraft): CSSProperties {
  const adjustments = getEffectiveAdjustments(draft);

  return {
    filter: buildPreviewFilter(adjustments),
    transform: `translate(${draft.offsetX * 18}%, ${draft.offsetY * 18}%) scale(${draft.zoom})`,
  };
}

function formatFilterValue(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return `${value}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Lecture du fichier impossible."));
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Dimensions de l'image indisponibles."));
    image.src = src;
  });
}

async function createPhotoDraft(file: File, title: string): Promise<PhotoDraft> {
  const src = await fileToDataUrl(file);
  const dimensions = await getImageDimensions(src);

  return {
    id: createDraftId(),
    fileName: file.name,
    src,
    cropPreset: "portrait",
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    filterPreset: "original",
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    altText: deriveAltText(file.name, title),
    naturalWidth: dimensions.width,
    naturalHeight: dimensions.height,
  };
}

function loadBrowserImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Chargement du media impossible."));
    image.src = src;
  });
}

async function renderProcessedPhoto(draft: PhotoDraft) {
  const image = await loadBrowserImage(draft.src);
  const ratio = getCropRatio(draft);
  const longestSide = 1440;

  let width = longestSide;
  let height = Math.round(longestSide / ratio);
  if (ratio < 1) {
    height = longestSide;
    width = Math.round(longestSide * ratio);
  }

  if (draft.cropPreset === "original") {
    const maxDimension = Math.max(draft.naturalWidth, draft.naturalHeight);
    const scale = maxDimension > 1440 ? 1440 / maxDimension : 1;
    width = Math.max(1, Math.round(draft.naturalWidth * scale));
    height = Math.max(1, Math.round(draft.naturalHeight * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return draft.src;
  }

  const adjustments = getEffectiveAdjustments(draft);
  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = baseScale * draft.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = (width - drawWidth) / 2 + draft.offsetX * width * 0.22;
  const drawY = (height - drawHeight) / 2 + draft.offsetY * height * 0.22;

  ctx.filter = buildCanvasFilter(adjustments);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.filter = "none";

  if (adjustments.temperature !== 0) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const shift = adjustments.temperature * 1.35;
    for (let index = 0; index < imageData.data.length; index += 4) {
      imageData.data[index] = clamp(imageData.data[index] + shift, 0, 255);
      imageData.data[index + 2] = clamp(imageData.data[index + 2] - shift, 0, 255);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (adjustments.fade > 0) {
    ctx.fillStyle = `rgba(255,255,255,${getFadeOverlayOpacity(adjustments)})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (adjustments.vignette > 0) {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.7);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${clamp(adjustments.vignette / 180, 0, 0.32)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
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
        active ? "bg-[#101522] text-white shadow-[0_12px_30px_rgba(16,21,34,0.18)]" : "bg-[#f4f6fb] text-[#637488] hover:bg-[#eef2f8]",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.1} />
      <span>{label}</span>
    </button>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (nextValue: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-[18px] bg-white px-4 py-4 shadow-[0_12px_40px_rgba(16,21,34,0.06)]">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-[#101522]">{label}</span>
        <span className="text-[13px] text-[#8ea2bc]">{formatFilterValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e9edf5] accent-[#101522]"
      />
    </div>
  );
}

function getModalTitle(mode: ComposerMode, step: PhotoStep) {
  if (step === "sharing") {
    return "Partage en cours";
  }

  if (step === "success") {
    return "Publication partagee";
  }

  if (mode === "photo") {
    if (step === "crop") {
      return "Rogner";
    }

    if (step === "edit") {
      return "Modifier";
    }
  }

  return "Creer une nouvelle publication";
}

export function PostComposerPage() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);
  const previewSurfaceRef = useRef<HTMLDivElement | null>(null);
  const cropDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<ProfileMePayload["profile"] | null>(null);
  const [mode, setMode] = useState<ComposerMode>("photo");
  const [photoStep, setPhotoStep] = useState<PhotoStep>("select");
  const [editorTab, setEditorTab] = useState<EditorTab>("filters");
  const [dragActive, setDragActive] = useState(false);
  const [cropDragging, setCropDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photoDrafts, setPhotoDrafts] = useState<PhotoDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [createAlbum, setCreateAlbum] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [durationLabel, setDurationLabel] = useState("");
  const [trackName, setTrackName] = useState("");
  const [altText, setAltText] = useState("");
  const [accessibilityOpen, setAccessibilityOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileDisplayName = formatDisplayName(profile?.displayName, "Chargement...");
  const activeDraft = useMemo(
    () => photoDrafts.find((draft) => draft.id === activeDraftId) ?? photoDrafts[0] ?? null,
    [activeDraftId, photoDrafts],
  );
  const activeDraftAltText = activeDraft?.altText ?? "";
  const captionCounter = `${body.length}/${CAPTION_MAX_LENGTH}`;

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile/me", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Impossible de charger votre session.");
        }

        const payload = (await response.json()) as ProfileMePayload;
        if (!payload.profile?.onboardingCompletedAt) {
          router.replace("/onboarding");
          return;
        }

        if (!cancelled) {
          setProfile(payload.profile);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Impossible de charger votre session.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (mode === "photo") {
      if (photoStep === "sharing" || photoStep === "success") {
        return;
      }

      if (photoDrafts.length === 0) {
        setPhotoStep("select");
      } else if (photoStep === "select") {
        setPhotoStep("crop");
      }
      return;
    }

    if (photoStep !== "sharing" && photoStep !== "success") {
      setPhotoStep("details");
    }
  }, [mode, photoDrafts.length, photoStep]);

  const canSubmit = useMemo(() => {
    if (loadingProfile || busy || title.trim().length < 2) {
      return false;
    }

    if (mode === "text") {
      return body.trim().length > 0;
    }

    if (mode === "photo") {
      if (photoDrafts.length === 0) {
        return false;
      }

      if (createAlbum && albumName.trim().length < 2) {
        return false;
      }

      return true;
    }

    return mediaUrl.trim().length > 0;
  }, [albumName, body, busy, createAlbum, loadingProfile, mediaUrl, mode, photoDrafts.length, title]);

  const canGoNext = useMemo(() => {
    if (mode !== "photo") {
      return false;
    }

    if (photoStep === "select") {
      return photoDrafts.length > 0;
    }

    return photoStep !== "details" && photoStep !== "sharing" && photoStep !== "success";
  }, [mode, photoDrafts.length, photoStep]);

  const addPhotoDrafts = async (files: File[]) => {
    const remainingSlots = PHOTO_MAX_SELECTION - photoDrafts.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`Tu peux ajouter jusqu'a ${PHOTO_MAX_SELECTION} medias maximum.`);
      return;
    }

    const selectedFiles = files.filter((file) => file.type.startsWith("image/")).slice(0, remainingSlots);
    if (selectedFiles.length === 0) {
      setErrorMessage("Choisis au moins une image valide depuis ta machine.");
      return;
    }

    try {
      const nextDrafts = await Promise.all(selectedFiles.map((file) => createPhotoDraft(file, title)));
      setPhotoDrafts((current) => [...current, ...nextDrafts]);
      setActiveDraftId((current) => current ?? nextDrafts[0]?.id ?? null);
      setMode("photo");
      setPhotoStep("crop");
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Lecture des medias impossible.");
    }
  };

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      await addPhotoDrafts(files);
    }
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      await addPhotoDrafts(files);
    }
  };

  const updateActiveDraft = (updater: (draft: PhotoDraft) => PhotoDraft) => {
    if (!activeDraft) {
      return;
    }

    setPhotoDrafts((current) => current.map((draft) => (draft.id === activeDraft.id ? updater(draft) : draft)));
  };

  const moveActiveDraft = (direction: -1 | 1) => {
    if (!activeDraft) {
      return;
    }

    setPhotoDrafts((current) => {
      const currentIndex = current.findIndex((draft) => draft.id === activeDraft.id);
      if (currentIndex === -1) {
        return current;
      }

      const nextIndex = clamp(currentIndex + direction, 0, current.length - 1);
      if (nextIndex === currentIndex) {
        return current;
      }

      const nextDrafts = [...current];
      const [draft] = nextDrafts.splice(currentIndex, 1);
      nextDrafts.splice(nextIndex, 0, draft);
      return nextDrafts;
    });
  };

  const removeDraft = (draftId: string) => {
    let nextActiveId: string | null = null;

    setPhotoDrafts((current) => {
      const currentIndex = current.findIndex((draft) => draft.id === draftId);
      if (currentIndex === -1) {
        nextActiveId = activeDraftId;
        return current;
      }

      const nextDrafts = current.filter((draft) => draft.id !== draftId);
      nextActiveId = nextDrafts[Math.min(currentIndex, nextDrafts.length - 1)]?.id ?? null;
      return nextDrafts;
    });

    setActiveDraftId((current) => (current === draftId ? nextActiveId : current));
  };

  const handleCropPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeDraft || photoStep !== "crop") {
      return;
    }

    event.preventDefault();
    cropDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: activeDraft.offsetX,
      startOffsetY: activeDraft.offsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setCropDragging(true);
  };

  const handleCropPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeDraft || photoStep !== "crop" || !cropDragRef.current || cropDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const bounds = previewSurfaceRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    const deltaX = (event.clientX - cropDragRef.current.startX) / bounds.width;
    const deltaY = (event.clientY - cropDragRef.current.startY) / bounds.height;

    setPhotoDrafts((current) =>
      current.map((draft) =>
        draft.id === activeDraft.id
          ? {
              ...draft,
              offsetX: clamp(cropDragRef.current!.startOffsetX + deltaX * 2, -1, 1),
              offsetY: clamp(cropDragRef.current!.startOffsetY + deltaY * 2, -1, 1),
            }
          : draft,
      ),
    );
  };

  const handleCropPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (cropDragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    cropDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setCropDragging(false);
  };

  const moveToPreviousStep = () => {
    if (photoStep === "sharing" || photoStep === "success") {
      return;
    }

    if (mode !== "photo") {
      router.push("/profile");
      return;
    }

    if (photoStep === "select") {
      router.push("/profile");
      return;
    }

    const currentIndex = PHOTO_FLOW.indexOf(photoStep);
    if (currentIndex <= 0) {
      setPhotoStep("select");
      return;
    }

    setPhotoStep(PHOTO_FLOW[currentIndex - 1]);
  };

  const moveToNextStep = () => {
    if (mode !== "photo") {
      return;
    }

    if (photoStep === "select" && photoDrafts.length > 0) {
      setPhotoStep("crop");
      return;
    }

    const currentIndex = PHOTO_FLOW.indexOf(photoStep);
    if (currentIndex === -1 || currentIndex === PHOTO_FLOW.length - 1) {
      return;
    }

    setPhotoStep(PHOTO_FLOW[currentIndex + 1]);
  };

  const sharePost = async () => {
    setBusy(true);
    setErrorMessage(null);
    setPhotoStep("sharing");

    try {
      const payload =
        mode === "text"
          ? {
              surface: "classic",
              kind: "letter",
              title: title.trim(),
              body: body.trim(),
            }
          : mode === "photo"
            ? {
                surface: "classic",
                kind: photoDrafts.length > 1 ? "gallery" : "photo",
                albumName: createAlbum ? albumName.trim() : undefined,
                title: title.trim(),
                body: body.trim(),
                media: await Promise.all(
                  photoDrafts.map(async (draft, index) => ({
                    mediaType: "image",
                    src: await renderProcessedPhoto(draft),
                    altText: draft.altText || altText || title.trim(),
                    position: index,
                  })),
                ),
              }
            : {
                surface: "reel",
                kind: "video",
                title: title.trim(),
                body: body.trim(),
                trackName: trackName.trim(),
                durationLabel: durationLabel.trim(),
                media: [
                  {
                    mediaType: "video",
                    src: mediaUrl.trim(),
                    posterSrc: posterUrl.trim() || undefined,
                    altText: altText.trim() || title.trim(),
                  },
                ],
              };

      await new Promise((resolve) => window.setTimeout(resolve, 550));

      const response = await fetch("/api/posts", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(responsePayload?.message ?? "Publication impossible pour le moment.");
      }

      setPhotoStep("success");
      window.setTimeout(() => {
        startTransition(() => {
          router.push("/?mode=classic");
          router.refresh();
        });
      }, 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Publication impossible pour le moment.");
      setPhotoStep("details");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    await sharePost();
  };

  const previewFrameRatio = activeDraft ? getCropRatio(activeDraft) : 4 / 5;
  const previewImageStyle = activeDraft ? getPreviewTransformStyle(activeDraft) : undefined;
  const effectivePreviewAdjustments = activeDraft ? getEffectiveAdjustments(activeDraft) : DEFAULT_ADJUSTMENTS;
  const uploadBackdrop = activeDraft?.src ?? "/figma-assets/photo-feed/photo-grid-3.jpg";
  const showPhotoFlow = mode === "photo";
  const headerTitle = getModalTitle(mode, photoStep);
  const isDetailsStep = photoStep === "details";
  const headerActionLabel = isDetailsStep ? "Partager" : photoStep === "select" || photoStep === "crop" || photoStep === "edit" ? "Suivant" : "";
  const activeDraftIndex = activeDraft ? photoDrafts.findIndex((draft) => draft.id === activeDraft.id) : -1;
  const canMoveDraftBackward = activeDraftIndex > 0;
  const canMoveDraftForward = activeDraftIndex !== -1 && activeDraftIndex < photoDrafts.length - 1;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f1625] px-6 pb-10 pt-[102px] text-[#101522]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(63,94,251,0.16),transparent_38%),radial-gradient(circle_at_bottom,rgba(255,130,105,0.1),transparent_36%)]" />
        <img src={uploadBackdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[42px] saturate-150" />
        <div className="absolute inset-0 bg-[rgba(11,16,26,0.7)]" />
      </div>

      <div className="relative mx-auto max-w-[1200px]">
        <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_36px_120px_rgba(3,7,18,0.38)]">
          <header className="flex h-16 items-center justify-between border-b border-black/6 px-6">
            <div className="flex min-w-[120px] items-center gap-3">
              {photoStep === "sharing" || photoStep === "success" ? null : (
                <button
                  type="button"
                  onClick={moveToPreviousStep}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#101522] transition hover:bg-[#f3f5f9]"
                  aria-label={mode === "photo" && photoStep !== "select" ? "Revenir" : "Fermer"}
                >
                  {mode === "photo" && photoStep !== "select" ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </button>
              )}
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-[#101522]">{headerTitle}</p>
            </div>
            <div className="flex min-w-[120px] justify-end">
              {photoStep === "sharing" || photoStep === "success" ? null : headerActionLabel ? (
                <button
                  type={photoStep === "details" || mode !== "photo" ? "submit" : "button"}
                  form={photoStep === "details" || mode !== "photo" ? "post-composer-form" : undefined}
                  onClick={photoStep !== "details" && mode === "photo" ? moveToNextStep : undefined}
                  disabled={photoStep === "select" ? !canGoNext : photoStep === "details" ? !canSubmit : false}
                  className="inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold text-[#4f46ff] transition hover:bg-[#f3f5ff] disabled:cursor-not-allowed disabled:text-[#9ba6c7] disabled:hover:bg-transparent"
                >
                  {headerActionLabel}
                </button>
              ) : null}
            </div>
          </header>

          {photoStep === "sharing" || photoStep === "success" ? (
            <div className="flex min-h-[760px] flex-col items-center justify-center gap-8 bg-[#fbfcff] px-8 py-12 text-center">
              <div
                className={cx(
                  "relative flex h-24 w-24 items-center justify-center rounded-full",
                  photoStep === "sharing" ? "animate-spin" : "",
                )}
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(255,191,0,1), rgba(255,76,120,1), rgba(167,75,255,1), rgba(255,191,0,1))",
                }}
              >
                <div className="absolute inset-[3px] rounded-full bg-[#fbfcff]" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#fbfcff]">
                  {photoStep === "sharing" ? (
                    <LoaderCircle className="h-8 w-8 text-[#101522]" />
                  ) : (
                    <Check className="h-10 w-10 text-[#ff3d6c]" strokeWidth={2.25} />
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[16px] font-semibold text-[#101522]">
                  {photoStep === "sharing" ? "Nous preparons ta publication..." : "Votre publication a ete partagee."}
                </p>
                <p className="text-[14px] text-[#637488]">
                  {photoStep === "sharing"
                    ? "On applique tes reglages et on envoie le post dans ton profil sans recharger l'interface."
                    : "Retour automatique vers ton profil dans un instant."}
                </p>
              </div>
            </div>
          ) : showPhotoFlow && photoStep === "select" && photoDrafts.length === 0 ? (
            <div className="flex min-h-[760px] flex-col items-center justify-center bg-[#fbfcff] px-8 py-12">
              <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                <ModeChip active={false} label="Texte" icon={Type} onClick={() => setMode("text")} />
                <ModeChip active label="Photo" icon={Images} onClick={() => setMode("photo")} />
                <ModeChip active={false} label="Video" icon={Video} onClick={() => setMode("video")} />
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex h-12 items-center rounded-full bg-[#4f46ff] px-6 text-[14px] font-semibold text-white shadow-[0_16px_34px_rgba(79,70,255,0.22)] transition hover:bg-[#4138f5]"
                  >
                    Selectionner sur l&apos;ordinateur
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("text")}
                    className="inline-flex h-12 items-center rounded-full bg-[#f4f6fb] px-6 text-[14px] font-medium text-[#101522] transition hover:bg-[#eef2f8]"
                  >
                    Ecrire un post texte
                  </button>
                </div>
                <p className="mt-6 text-[13px] text-[#8ea2bc]">Jusqu&apos;a {PHOTO_MAX_SELECTION} photos, sans bordures inutiles.</p>
              </div>
            </div>
          ) : (
            <form id="post-composer-form" onSubmit={handleSubmit}>
              <div
                className={cx(
                  "grid min-h-[760px]",
                  showPhotoFlow ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-[minmax(0,1fr)_380px]",
                )}
              >
                <section className="relative overflow-hidden bg-[#0f1625]">
                  <div className="absolute inset-0">
                    <img src={uploadBackdrop} alt="" className="h-full w-full object-cover opacity-28 blur-[34px]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_44%),linear-gradient(180deg,rgba(11,16,26,0.06),rgba(11,16,26,0.5))]" />
                  </div>

                  <div className="relative flex h-full flex-col">
                    <div className="px-8 pt-8">
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <ModeChip active={mode === "text"} label="Texte" icon={Type} onClick={() => setMode("text")} />
                        <ModeChip active={mode === "photo"} label="Photo" icon={Images} onClick={() => setMode("photo")} />
                        <ModeChip active={mode === "video"} label="Video" icon={Video} onClick={() => setMode("video")} />
                      </div>
                    </div>

                    <div className="flex flex-1 items-center justify-center px-8 pb-28 pt-2">
                      {mode === "photo" ? (
                        <div className="relative flex w-full max-w-[640px] flex-col items-center justify-center">
                          {activeDraft ? (
                            <>
                              <div
                                ref={previewSurfaceRef}
                                onPointerDown={handleCropPointerDown}
                                onPointerMove={handleCropPointerMove}
                                onPointerUp={handleCropPointerEnd}
                                onPointerCancel={handleCropPointerEnd}
                                className={cx(
                                  "relative w-full max-w-[640px] overflow-hidden rounded-[28px] bg-[#dfe5ee] shadow-[0_30px_70px_rgba(0,0,0,0.28)]",
                                  photoStep === "crop" ? (cropDragging ? "cursor-grabbing" : "cursor-grab") : "",
                                )}
                                style={{ aspectRatio: `${previewFrameRatio}` }}
                              >
                                <img
                                  src={activeDraft.src}
                                  alt={activeDraft.altText || title || "Apercu"}
                                  draggable={false}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  style={previewImageStyle}
                                />
                                <div className="pointer-events-none absolute inset-0" style={getTintOverlayStyle(effectivePreviewAdjustments)} />
                                <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: getFadeOverlayOpacity(effectivePreviewAdjustments) }} />
                                <div className="pointer-events-none absolute inset-0" style={{ background: getVignetteOverlay(effectivePreviewAdjustments) }} />
                                {photoStep === "crop" ? (
                                  <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
                                    <div className="rounded-full bg-black/26 px-4 py-2 text-[12px] font-medium text-white/92 backdrop-blur-md">
                                      Glisse pour repositionner le cadrage
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              <div className="mt-5 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => addMoreInputRef.current?.click()}
                                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-white/20"
                                >
                                  <Plus className="h-4 w-4" />
                                  Ajouter des medias
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveActiveDraft(-1)}
                                  disabled={!canMoveDraftBackward}
                                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <ArrowLeft className="h-4 w-4" />
                                  Avant
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveActiveDraft(1)}
                                  disabled={!canMoveDraftForward}
                                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  Apres
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => activeDraft && removeDraft(activeDraft.id)}
                                  disabled={photoDrafts.length === 0}
                                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-[rgba(255,102,132,0.28)] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Retirer
                                </button>
                                <div className="inline-flex h-10 items-center rounded-full bg-white/12 px-4 text-[13px] font-medium text-white/88 backdrop-blur-md">
                                  {activeDraftIndex + 1}/{photoDrafts.length} media{photoDrafts.length > 1 ? "s" : ""}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex min-h-[520px] w-full items-center justify-center rounded-[28px] bg-white/7 text-white">
                              <p className="text-[15px]">Aucun media selectionne.</p>
                            </div>
                          )}
                        </div>
                      ) : mode === "text" ? (
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
                      ) : (
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
                      )}
                    </div>

                    {mode === "photo" && photoDrafts.length > 0 ? (
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="mx-auto flex max-w-[720px] items-center gap-3 overflow-x-auto rounded-full bg-white/12 px-4 py-3 backdrop-blur-md">
                          {photoDrafts.map((draft) => (
                            <div key={draft.id} className="relative h-16 w-16 shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveDraftId(draft.id)}
                                className={cx(
                                  "relative h-16 w-16 overflow-hidden rounded-[18px] transition",
                                  draft.id === activeDraft?.id ? "ring-2 ring-white" : "opacity-72 hover:opacity-100",
                                )}
                              >
                                <img src={draft.src} alt={draft.altText || draft.fileName} className="h-full w-full object-cover" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDraft(draft.id)}
                                className="absolute -right-1 -top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#101522] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:bg-[#ff4c78]"
                                aria-label={`Retirer ${draft.fileName}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addMoreInputRef.current?.click()}
                            className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-white/16 text-white transition hover:bg-white/22"
                            aria-label="Ajouter une photo"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                <aside className="min-h-[760px] bg-[#fbfcff]">
                  <div className="flex h-full flex-col">
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      {mode === "photo" && photoStep === "crop" ? (
                        <div className="space-y-6">
                          <div>
                            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#8ea2bc]">Recadrage</p>
                            <h2 className="mt-3 text-[26px] font-semibold leading-[1.05] text-[#101522]">
                              Cadre ton visuel avant de passer aux filtres.
                            </h2>
                            <p className="mt-3 text-[14px] leading-7 text-[#637488]">
                              On garde un recadrage simple: ratio, zoom et placement. Le rendu final sera bien celui que tu vois ici.
                            </p>
                          </div>

                          <div className="grid gap-3">
                            {CROP_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => updateActiveDraft((draft) => ({ ...draft, cropPreset: preset.id }))}
                                className={cx(
                                  "flex items-center justify-between rounded-[20px] px-4 py-4 text-left transition",
                                  activeDraft?.cropPreset === preset.id ? "bg-white shadow-[0_12px_34px_rgba(16,21,34,0.08)]" : "bg-transparent hover:bg-white",
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f6fb] text-[#101522]">
                                    <Crop className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-[14px] font-medium text-[#101522]">{preset.label}</p>
                                    <p className="text-[12px] text-[#8ea2bc]">
                                      {preset.id === "original" ? "Respecte le ratio du fichier" : "Publie avec un cadre plus net"}
                                    </p>
                                  </div>
                                </div>
                                {activeDraft?.cropPreset === preset.id ? <Check className="h-4 w-4 text-[#4f46ff]" /> : null}
                              </button>
                            ))}
                          </div>

                          <SettingSlider
                            label="Zoom"
                            value={Math.round(((activeDraft?.zoom ?? 1) - 1) * 100)}
                            min={0}
                            max={130}
                            onChange={(nextValue) => updateActiveDraft((draft) => ({ ...draft, zoom: 1 + nextValue / 100 }))}
                          />
                          <SettingSlider
                            label="Position horizontale"
                            value={Math.round((activeDraft?.offsetX ?? 0) * 100)}
                            min={-100}
                            max={100}
                            onChange={(nextValue) => updateActiveDraft((draft) => ({ ...draft, offsetX: nextValue / 100 }))}
                          />
                          <SettingSlider
                            label="Position verticale"
                            value={Math.round((activeDraft?.offsetY ?? 0) * 100)}
                            min={-100}
                            max={100}
                            onChange={(nextValue) => updateActiveDraft((draft) => ({ ...draft, offsetY: nextValue / 100 }))}
                          />
                        </div>
                      ) : mode === "photo" && photoStep === "edit" ? (
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 rounded-full bg-white p-1 shadow-[0_12px_40px_rgba(16,21,34,0.06)]">
                            <button
                              type="button"
                              onClick={() => setEditorTab("filters")}
                              className={cx(
                                "flex-1 rounded-full px-4 py-3 text-[14px] font-medium transition",
                                editorTab === "filters" ? "bg-[#101522] text-white" : "text-[#8ea2bc]",
                              )}
                            >
                              Filtres
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditorTab("settings")}
                              className={cx(
                                "flex-1 rounded-full px-4 py-3 text-[14px] font-medium transition",
                                editorTab === "settings" ? "bg-[#101522] text-white" : "text-[#8ea2bc]",
                              )}
                            >
                              Reglages
                            </button>
                          </div>

                          {editorTab === "filters" ? (
                            <div className="grid grid-cols-3 gap-3">
                              {FILTER_PRESETS.map((preset) => {
                                const previewDraft = activeDraft
                                  ? {
                                      ...activeDraft,
                                      filterPreset: preset.id,
                                    }
                                  : null;

                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => updateActiveDraft((draft) => ({ ...draft, filterPreset: preset.id }))}
                                    className={cx(
                                      "group rounded-[20px] bg-white p-2 text-left shadow-[0_12px_34px_rgba(16,21,34,0.05)] transition",
                                      activeDraft?.filterPreset === preset.id ? "ring-2 ring-[#4f46ff]" : "hover:-translate-y-0.5",
                                    )}
                                  >
                                    <div className="relative overflow-hidden rounded-[16px] bg-[#ecf0f7]" style={{ aspectRatio: "1 / 1" }}>
                                      {previewDraft ? (
                                        <>
                                          <img src={previewDraft.src} alt={preset.label} className="absolute inset-0 h-full w-full object-cover" style={getPreviewTransformStyle(previewDraft)} />
                                          <div className="pointer-events-none absolute inset-0" style={getTintOverlayStyle(getEffectiveAdjustments(previewDraft))} />
                                          <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: getFadeOverlayOpacity(getEffectiveAdjustments(previewDraft)) }} />
                                          <div className="pointer-events-none absolute inset-0" style={{ background: getVignetteOverlay(getEffectiveAdjustments(previewDraft)) }} />
                                        </>
                                      ) : null}
                                    </div>
                                    <p className="px-1 pb-1 pt-3 text-center text-[12px] font-medium text-[#101522]">{preset.label}</p>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {RANGE_FIELDS.map((field) => (
                                <SettingSlider
                                  key={field.key}
                                  label={field.label}
                                  value={activeDraft ? activeDraft.adjustments[field.key] : 0}
                                  min={field.min}
                                  max={field.max}
                                  onChange={(nextValue) =>
                                    updateActiveDraft((draft) => ({
                                      ...draft,
                                      adjustments: {
                                        ...draft.adjustments,
                                        [field.key]: nextValue,
                                      },
                                    }))
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-[#eef3f8]">
                              <Image
                                src={resolveProfileAvatarSrc(profile?.avatarUrl, DEFAULT_AVATAR)}
                                alt={profileDisplayName}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold text-[#101522]">{profileDisplayName}</p>
                              <p className="text-[12px] text-[#8ea2bc]">@{profile?.username ?? "..."}</p>
                            </div>
                          </div>

                          <div className="space-y-5">
                            <div className="space-y-2">
                              <label className="text-[13px] font-medium text-[#101522]">Titre</label>
                              <input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Donne un vrai titre a ton post"
                                className="h-12 w-full rounded-[18px] bg-white px-4 text-[15px] text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[13px] font-medium text-[#101522]">
                                  {mode === "text" ? "Contenu" : "Caption"}
                                </label>
                                <span className="text-[12px] text-[#b2bdd2]">{captionCounter}</span>
                              </div>
                              <textarea
                                value={body}
                                onChange={(event) => setBody(event.target.value.slice(0, CAPTION_MAX_LENGTH))}
                                rows={7}
                                placeholder={mode === "text" ? "Ecris ton texte ici..." : "Ajoute un contexte, une idee, une legende."}
                                className="w-full rounded-[20px] bg-white px-4 py-4 text-[15px] leading-7 text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                              />
                            </div>

                            {mode === "photo" ? (
                              <div className="space-y-4">
                                <div className="rounded-[22px] bg-white px-4 py-4 shadow-[0_12px_40px_rgba(16,21,34,0.05)]">
                                  <label className="flex items-center gap-3 text-[14px] font-medium text-[#101522]">
                                    <input
                                      type="checkbox"
                                      checked={createAlbum}
                                      onChange={(event) => {
                                        const nextValue = event.target.checked;
                                        setCreateAlbum(nextValue);
                                        if (!nextValue) {
                                          setAlbumName("");
                                        }
                                      }}
                                      className="h-4 w-4 rounded border-black/15"
                                    />
                                    Creer un album photo
                                  </label>
                                  <p className="mt-2 text-[13px] leading-6 text-[#8ea2bc]">
                                    Quand cette option est active, ton album apparaitra dans les bulles albums du profil.
                                  </p>
                                  {createAlbum ? (
                                    <input
                                      value={albumName}
                                      onChange={(event) => setAlbumName(event.target.value)}
                                      placeholder="Nom de l'album"
                                      className="mt-4 h-12 w-full rounded-[16px] bg-[#fbfcff] px-4 text-[15px] text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                                    />
                                  ) : null}
                                </div>

                                <div className="rounded-[22px] bg-white px-4 py-4 shadow-[0_12px_40px_rgba(16,21,34,0.05)]">
                                  <button
                                    type="button"
                                    onClick={() => setAccessibilityOpen((current) => !current)}
                                    className="flex w-full items-center justify-between"
                                  >
                                    <div>
                                      <p className="text-[15px] font-semibold text-[#101522]">Accessibilite</p>
                                      <p className="mt-1 text-[13px] leading-6 text-[#8ea2bc]">
                                        Decris le visuel actif pour les personnes malvoyantes.
                                      </p>
                                    </div>
                                    <ChevronDown className={cx("h-4 w-4 text-[#8ea2bc] transition", accessibilityOpen ? "rotate-180" : "")} />
                                  </button>
                                  {accessibilityOpen ? (
                                    <div className="mt-4 space-y-4">
                                      <div className="flex gap-2 overflow-x-auto">
                                        {photoDrafts.map((draft) => (
                                          <button
                                            key={draft.id}
                                            type="button"
                                            onClick={() => setActiveDraftId(draft.id)}
                                            className={cx(
                                              "relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] transition",
                                              draft.id === activeDraft?.id ? "ring-2 ring-[#4f46ff]" : "opacity-72 hover:opacity-100",
                                            )}
                                          >
                                            <img src={draft.src} alt={draft.altText || draft.fileName} className="h-full w-full object-cover" />
                                          </button>
                                        ))}
                                      </div>
                                      <input
                                        value={activeDraftAltText}
                                        onChange={(event) =>
                                          updateActiveDraft((draft) => ({
                                            ...draft,
                                            altText: event.target.value,
                                          }))
                                        }
                                        placeholder="Ecrivez un texte alternatif..."
                                        className="h-12 w-full rounded-[16px] bg-[#fbfcff] px-4 text-[15px] text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            {mode === "video" ? (
                              <>
                                <div className="space-y-2">
                                  <label className="text-[13px] font-medium text-[#101522]">URL video</label>
                                  <input
                                    value={mediaUrl}
                                    onChange={(event) => setMediaUrl(event.target.value)}
                                    placeholder="https://..."
                                    className="h-12 w-full rounded-[18px] bg-white px-4 text-[15px] text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[13px] font-medium text-[#101522]">Poster video (optionnel)</label>
                                  <input
                                    value={posterUrl}
                                    onChange={(event) => setPosterUrl(event.target.value)}
                                    placeholder="https://..."
                                    className="h-12 w-full rounded-[18px] bg-white px-4 text-[15px] text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-[#101522]">Duree</label>
                                    <input
                                      value={durationLabel}
                                      onChange={(event) => setDurationLabel(event.target.value)}
                                      placeholder="0:42"
                                      className="h-12 w-full rounded-[18px] bg-white px-4 text-[15px] text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-[#101522]">Piste audio</label>
                                    <input
                                      value={trackName}
                                      onChange={(event) => setTrackName(event.target.value)}
                                      placeholder="Nom du son"
                                      className="h-12 w-full rounded-[18px] bg-white px-4 text-[15px] text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[13px] font-medium text-[#101522]">Texte alternatif</label>
                                  <input
                                    value={altText}
                                    onChange={(event) => setAltText(event.target.value)}
                                    placeholder="Decris rapidement le visuel"
                                    className="h-12 w-full rounded-[18px] bg-white px-4 text-[15px] text-[#101522] outline-none ring-1 ring-black/6 transition focus:ring-[#4f46ff]"
                                  />
                                </div>
                              </>
                            ) : null}

                            {mode === "text" ? (
                              <div className="rounded-[22px] bg-white px-4 py-4 shadow-[0_12px_40px_rgba(16,21,34,0.05)]">
                                <p className="text-[14px] font-medium text-[#101522]">Format texte</p>
                                <p className="mt-2 text-[13px] leading-6 text-[#8ea2bc]">
                                  On garde une note simple, lisible et publiee directement dans le feed classique.
                                </p>
                              </div>
                            ) : null}

                            {mode === "photo" ? (
                              <div className="rounded-[22px] bg-white px-4 py-4 shadow-[0_12px_40px_rgba(16,21,34,0.05)]">
                                <button
                                  type="button"
                                  onClick={() => setDetailsOpen((current) => !current)}
                                  className="flex w-full items-center justify-between"
                                >
                                  <div>
                                    <p className="text-[15px] font-semibold text-[#101522]">Details du partage</p>
                                    <p className="mt-1 text-[13px] leading-6 text-[#8ea2bc]">
                                      {photoDrafts.length > 1 ? "Le post sera publie comme galerie." : "Le post sera publie comme photo classique."}
                                    </p>
                                  </div>
                                  <ChevronDown className={cx("h-4 w-4 text-[#8ea2bc] transition", detailsOpen ? "rotate-180" : "")} />
                                </button>
                                {detailsOpen ? (
                                  <div className="mt-4 grid gap-3 text-[13px] text-[#637488]">
                                    <div className="flex items-center justify-between rounded-[16px] bg-[#fbfcff] px-4 py-3">
                                      <span>Medias selectionnes</span>
                                      <span className="font-medium text-[#101522]">{photoDrafts.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-[16px] bg-[#fbfcff] px-4 py-3">
                                      <span>Album</span>
                                      <span className="font-medium text-[#101522]">{createAlbum ? albumName || "A nommer" : "Non"}</span>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {errorMessage ? <p className="text-[13px] font-medium text-[#d21d49]">{errorMessage}</p> : null}

                            {mode !== "photo" ? (
                              <div className="flex gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => router.push("/profile")}
                                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-white text-[14px] font-medium text-[#101522] shadow-[0_12px_34px_rgba(16,21,34,0.05)] transition hover:bg-[#f5f7fb]"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="submit"
                                  disabled={!canSubmit}
                                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[#4f46ff] text-[14px] font-semibold text-white shadow-[0_16px_34px_rgba(79,70,255,0.2)] transition hover:bg-[#4138f5] disabled:cursor-not-allowed disabled:bg-[#b9c0d4]"
                                >
                                  {busy ? "Publication..." : "Partager"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            </form>
          )}
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelection} className="hidden" />
      <input ref={addMoreInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelection} className="hidden" />
    </main>
  );
}
