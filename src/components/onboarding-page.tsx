"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ImagePlus,
  Link2,
  LoaderCircle,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { formatDisplayName } from "@/lib/display-name";
import type { PublicProfileBundle } from "@/lib/posts";
import { resolveProfileAvatarSrc } from "@/lib/profile-avatar";

type ProfileMePayload = {
  authenticated?: boolean;
  user?: {
    id?: string;
  };
  profile?: PublicProfileBundle["profile"];
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Lecture de l'image impossible."));
    };
    reader.onerror = () => reject(new Error("Lecture de l'image impossible."));
    reader.readAsDataURL(file);
  });
}

function loadBrowserImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Chargement de l'image impossible."));
    image.src = src;
  });
}

async function createAvatarDataUrl(file: File) {
  const source = await fileToDataUrl(file);
  const image = await loadBrowserImage(source);
  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const offsetX = (image.naturalWidth - cropSize) / 2;
  const offsetY = (image.naturalHeight - cropSize) / 2;
  const outputSize = 640;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");

  if (!context) {
    return source;
  }

  context.drawImage(image, offsetX, offsetY, cropSize, cropSize, 0, 0, outputSize, outputSize);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function NeutralAvatar({
  src,
  alt,
  size,
  iconSize,
}: {
  src: string | null;
  alt: string;
  size: string;
  iconSize: string;
}) {
  return (
    <div className={cx("relative overflow-hidden rounded-full bg-[#f3f6fa]", size)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="96px"
          className="object-cover"
          unoptimized={src.startsWith("data:image/")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#eef3ff,transparent_55%),#f3f6fa] text-[#7a879b]">
          <UserRound className={iconSize} strokeWidth={1.8} />
        </div>
      )}
    </div>
  );
}

export function OnboardingPage() {
  return <ProfileEditorPage mode="onboarding" />;
}

export function ProfileEditPage() {
  return <ProfileEditorPage mode="edit" />;
}

function ProfileEditorPage({ mode }: { mode: "onboarding" | "edit" }) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");
  const [avatarDragActive, setAvatarDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          throw new Error("Impossible de charger votre profil.");
        }

        const payload = (await response.json()) as ProfileMePayload;
        if (cancelled) {
          return;
        }

        setDisplayName(payload.profile?.displayName ?? "");
        setUsername(payload.profile?.username ?? "");
        setBio(payload.profile?.bio ?? "");
        setAvatarUrl(payload.profile?.avatarUrl ?? "");
        setWebsiteUrl(payload.profile?.websiteUrl ?? "");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Impossible de charger votre profil.");
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

  const canSubmit = useMemo(
    () => displayName.trim().length > 1 && username.trim().length > 1 && !loadingProfile && !saving,
    [displayName, loadingProfile, saving, username],
  );

  const safeAvatarSrc = resolveProfileAvatarSrc(avatarUrl, "") || null;
  const previewDisplayName = formatDisplayName(displayName, "Votre nom");
  const onboardingProgress = Math.round(
    ((displayName.trim().length > 1 ? 1 : 0) +
      (username.trim().length > 1 ? 1 : 0) +
      (bio.trim().length > 0 ? 1 : 0) +
      (avatarUrl.trim().length > 0 ? 1 : 0)) /
      4 *
      100,
  );
  const isEditMode = mode === "edit";
  const heroKicker = isEditMode ? "Edition" : "Onboarding";
  const heroTitle = isEditMode
    ? "Mets ton profil a jour dans une interface simple."
    : "On prepare ton profil avant ton premier post.";
  const heroDescription = isEditMode
    ? "Change ta photo, ton nom affiche, ton identifiant, ta bio ou ton lien. Enregistre et ton profil est mis a jour tout de suite."
    : "Ajoute une photo ou garde l'icone neutre, choisis ton nom visible, ton identifiant public et une bio courte.";
  const footerTitle = isEditMode ? "Pret a enregistrer" : "Pret a continuer";
  const footerCopy = isEditMode
    ? "Enregistre tes changements et reviens immediatement sur ton profil."
    : "Enregistre ton profil et continue vers ton espace personnel.";
  const submitLabel = isEditMode ? "Enregistrer les changements" : "Enregistrer et continuer";
  const avatarInputId = isEditMode ? "profile-edit-avatar-input" : "onboarding-avatar-input";

  const handleAvatarSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Choisis une image valide pour la photo de profil.");
      event.target.value = "";
      return;
    }

    try {
      const nextAvatarUrl = await createAvatarDataUrl(file);
      setAvatarUrl(nextAvatarUrl);
      setAvatarFileName(file.name);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de traiter l'image.");
    } finally {
      event.target.value = "";
    }
  };

  const handleAvatarDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setAvatarDragActive(true);
  };

  const handleAvatarDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setAvatarDragActive(false);
  };

  const handleAvatarDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setAvatarDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Choisis une image valide pour la photo de profil.");
      return;
    }

    try {
      const nextAvatarUrl = await createAvatarDataUrl(file);
      setAvatarUrl(nextAvatarUrl);
      setAvatarFileName(file.name);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de traiter l'image.");
    }
  };

  const clearAvatar = () => {
    setAvatarUrl("");
    setAvatarFileName("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/profile/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          username,
          bio,
          avatarUrl,
          websiteUrl,
          completeOnboarding: true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? "Impossible d'enregistrer votre profil.");
      }

      startTransition(() => {
        router.push("/profile");
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'enregistrer votre profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 pb-12 pt-[106px] text-[#101522]">
      <div className="mx-auto flex min-h-[calc(100vh-138px)] max-w-[960px] items-center justify-center">
        <div className="w-full max-w-[520px] rounded-[32px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04]">
          <header className="px-6 pb-5 pt-6 text-center sm:px-8">
              <div className="flex items-center justify-center">
                <Image
                  src="/figma-assets/pictomag-logo.svg"
                  alt="Pictomag"
                width={92}
                height={32}
                priority
                className="h-[28px] w-auto"
              />
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f5f7fb] px-3 py-2 text-[12px] font-medium text-[#64748b]">
              <Sparkles className="h-3.5 w-3.5 text-[#4f46ff]" />
              {onboardingProgress}% termine
            </div>

            <p className="mt-5 type-kicker-tight text-[#9aa8bc]">{heroKicker}</p>
            <h1 className="mt-3 text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] text-[#101522] sm:text-[42px]">
              {heroTitle}
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-[#64748b]">{heroDescription}</p>
          </header>

          <div className="border-t border-black/[0.04] px-6 py-6 sm:px-8">
            <form className="space-y-5" onSubmit={handleSubmit}>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-semibold text-[#101522]">Photo de profil</p>
                    <p className="mt-1 text-[13px] leading-6 text-[#8b97a8]">
                      Choisis une image locale, ou garde l&apos;icone neutre pour commencer.
                    </p>
                  </div>
                  <NeutralAvatar
                    src={safeAvatarSrc}
                    alt={previewDisplayName}
                    size="h-14 w-14"
                    iconSize="h-6 w-6"
                  />
                </div>

                <label
                  htmlFor={avatarInputId}
                  onDragOver={handleAvatarDragOver}
                  onDragLeave={handleAvatarDragLeave}
                  onDrop={handleAvatarDrop}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      avatarInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cx(
                    "mt-4 flex w-full cursor-pointer items-center justify-between rounded-[22px] bg-[#fafbfe] px-4 py-4 text-left transition",
                    avatarDragActive && "bg-[#eef4ff]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#101522] ring-1 ring-black/[0.04]">
                      {avatarUrl ? <Camera className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#101522]">
                        {avatarFileName ? "Changer la photo de profil" : "Choisir une image"}
                      </p>
                      <p className="mt-1 text-[12px] text-[#8ea2bc]">
                        {avatarFileName || "Glisse une image ici ou clique pour selectionner."}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8ea2bc]" />
                </label>

                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f5f7fb] px-4 py-2 text-[13px] font-medium text-[#64748b] transition hover:bg-[#eef3f8]"
                  >
                    <X className="h-4 w-4" />
                    Retirer l&apos;image
                  </button>
                ) : null}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#101522]">Nom affiche</label>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Damien Rakotomanga"
                    className="h-12 w-full rounded-[18px] bg-[#fafbfe] px-4 text-[15px] text-[#101522] outline-none transition focus:ring-2 focus:ring-[#4f46ff]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#101522]">@username</label>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value.replace(/\s+/g, "").toLowerCase())}
                    placeholder="damien"
                    className="h-12 w-full rounded-[18px] bg-[#fafbfe] px-4 text-[15px] text-[#101522] outline-none transition focus:ring-2 focus:ring-[#4f46ff]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#101522]">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value.slice(0, 280))}
                    rows={4}
                    placeholder="Creatif, stories, visuels, videos, editions, projets."
                    className="w-full rounded-[20px] bg-[#fafbfe] px-4 py-4 text-[15px] leading-7 text-[#101522] outline-none transition focus:ring-2 focus:ring-[#4f46ff]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#101522]">Site web (optionnel)</label>
                  <div className="flex items-center rounded-[18px] bg-[#fafbfe] px-4 transition focus-within:ring-2 focus-within:ring-[#4f46ff]">
                    <Link2 className="h-4 w-4 text-[#8ea2bc]" />
                    <input
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      placeholder="https://www.votresite.com"
                      className="h-12 w-full bg-transparent px-3 text-[15px] text-[#101522] outline-none"
                    />
                  </div>
                </div>
              </div>

              {errorMessage ? <p className="text-[13px] font-medium text-[#d21d49]">{errorMessage}</p> : null}

              <div className="rounded-[24px] bg-[#fafbfe] px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#4f46ff] ring-1 ring-black/[0.04]">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#101522]">{footerTitle}</p>
                    <p className="mt-1 text-[13px] leading-6 text-[#8ea2bc]">{footerCopy}</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-white px-4 text-[14px] font-medium text-[#101522] ring-1 ring-black/[0.05] transition hover:bg-[#f8fafc]"
                  >
                    Voir mon profil
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#101522] px-4 text-[14px] font-semibold text-white transition hover:bg-[#1b2433] disabled:cursor-not-allowed disabled:bg-[#b9c0d4]"
                  >
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {saving ? "Enregistrement..." : submitLabel}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <input
        id={avatarInputId}
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarSelection}
        className="hidden"
      />
    </main>
  );
}
