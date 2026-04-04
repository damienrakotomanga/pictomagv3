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
import { DEFAULT_AVATAR, resolveProfileAvatarSrc } from "@/lib/profile-avatar";

type ProfileMePayload = {
  authenticated?: boolean;
  user?: {
    id?: string;
    email?: string | null;
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
  const [email, setEmail] = useState<string | null>(null);
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

        setEmail(payload.user?.email?.trim() || null);
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

  const safeAvatarSrc = resolveProfileAvatarSrc(avatarUrl, DEFAULT_AVATAR);
  const previewDisplayName = formatDisplayName(displayName, "Votre nom");
  const previewUsername = username.trim() || "username";
  const previewBio =
    bio.trim() ||
    "Ajoute une bio courte pour expliquer qui tu es, ce que tu publies et ce que les autres vont trouver ici.";
  const websiteHostname = websiteUrl.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const onboardingProgress = Math.round(
    ((displayName.trim().length > 1 ? 1 : 0) +
      (username.trim().length > 1 ? 1 : 0) +
      (bio.trim().length > 0 ? 1 : 0) +
      (avatarUrl.trim().length > 0 ? 1 : 0)) /
      4 *
      100,
  );
  const isEditMode = mode === "edit";
  const shellTitle = isEditMode ? "Modifier le profil" : "Finaliser le profil";
  const shellSubtitle = isEditMode
    ? "Edition directe, sans rechargement, puis retour propre vers ton profil."
    : "Edition directe, sans rechargement, puis retour propre vers ton profil.";
  const heroKicker = isEditMode ? "Edition du profil" : "Onboarding";
  const heroTitle = isEditMode
    ? "Mets ton profil a jour dans un shell propre, blanc et fluide."
    : "On prepare ton profil pour qu'il ressemble enfin a ton compte, pas a un prototype.";
  const heroDescription = isEditMode
    ? "Avatar, nom visible, identifiant, bio et lien se mettent a jour ici en direct. Tu sauvegardes, et ton profil refletera immediatement les changements."
    : "Nom visible, identifiant, bio, avatar et lien. Tout se met a jour ici en direct, puis on te renvoie sur ton vrai profil sans changer brutalement d'experience.";
  const sideTitle = isEditMode ? "Ce que tu peux mettre a jour" : "Ce que tu finalises";
  const sideItems = isEditMode
    ? ["Avatar recadre automatiquement", "Nom visible propre partout", "Identifiant public stable", "Bio et lien mis a jour en direct"]
    : ["Avatar recadre automatiquement", "Nom visible propre partout", "Identifiant public stable", "Bio lisible avant ton premier post"];
  const resultTitle = isEditMode ? "Profil mis a jour partout" : "Resultat attendu";
  const resultCopy = isEditMode
    ? "Tes changements seront visibles directement sur ton profil et dans les surfaces publiques."
    : "Un profil pret a publier, avec une sensation d'edition fluide et propre.";
  const footerTitle = isEditMode ? "Pret a enregistrer" : "Tu es presque pret";
  const footerCopy = isEditMode
    ? "Enregistre les changements et reviens immediatement sur ton profil sans rupture visuelle."
    : "Enregistre ce profil et on te renvoie directement vers ton espace reel.";
  const submitLabel = isEditMode ? "Enregistrer les changements" : "Enregistrer et continuer";

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

  const handleAvatarDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setAvatarDragActive(true);
  };

  const handleAvatarDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setAvatarDragActive(false);
  };

  const handleAvatarDrop = async (event: DragEvent<HTMLButtonElement>) => {
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
    <main className="min-h-screen bg-white px-5 pb-8 pt-[106px] text-[#101522]">
      <div className="mx-auto flex min-h-[calc(100vh-138px)] max-w-[1220px] items-center justify-center">
        <div className="w-full max-w-[1130px] overflow-hidden rounded-[34px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04]">
          <header className="flex flex-wrap items-center justify-between gap-4 px-7 py-5">
            <div className="flex items-center gap-3">
              <Image src="/figma-assets/logo-mark.png" alt="Pictomag" width={28} height={28} priority />
              <Image
                src="/figma-assets/pictomag-logo.svg"
                alt="Pictomag"
                width={94}
                height={34}
                priority
                className="h-[30px] w-auto"
              />
            </div>

            <div className="text-center">
              <p className="text-[15px] font-semibold text-[#101522]">{shellTitle}</p>
              <p className="mt-1 text-[12px] text-[#8ea2bc]">{shellSubtitle}</p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f7fb] px-4 py-2 text-[13px] font-medium text-[#637488]">
              <Sparkles className="h-4 w-4 text-[#4f46ff]" />
              {onboardingProgress}% complete
            </div>
          </header>

          <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_392px]">
            <section className="rounded-[30px] bg-[#fbfcff] px-8 py-8">
              <div className="max-w-[560px]">
                <p className="type-kicker text-[#9fb2cf]">{heroKicker}</p>
                <h1 className="mt-4 text-[56px] font-semibold leading-[0.94] tracking-[-0.05em] text-[#101522]">
                  {heroTitle}
                </h1>
                <p className="mt-6 max-w-[520px] text-[18px] leading-8 text-[#637488]">
                  {heroDescription}
                </p>
              </div>

              <div className="mt-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-[28px] bg-white px-6 py-6 shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start gap-5">
                    <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-black/5">
                      <Image
                        src={safeAvatarSrc}
                        alt={previewDisplayName}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized={safeAvatarSrc.startsWith("data:image/")}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[30px] font-semibold tracking-[-0.05em] text-[#101522]">{previewDisplayName}</p>
                      <p className="mt-1 text-[15px] text-[#7f8fa6]">@{previewUsername}</p>
                      <div className="mt-4 flex flex-wrap gap-5 text-[13px] text-[#637488]">
                        <span>12 posts</span>
                        <span>38 followers</span>
                        <span>11 following</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 max-w-[520px] text-[15px] leading-7 text-[#4f5f73]">{previewBio}</p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className="rounded-full bg-[#f5f8fc] px-4 py-2 text-[13px] font-medium text-[#101522]">
                      {email ?? "Utilisateur Pictomag"}
                    </div>
                    <div className="rounded-full bg-[#f5f8fc] px-4 py-2 text-[13px] font-medium text-[#101522]">
                      {websiteHostname ? websiteHostname : `pictomag.com/u/${previewUsername}`}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9aa8bc]">{sideTitle}</p>
                    <ul className="mt-4 space-y-3 text-[14px] leading-6 text-[#506174]">
                      {sideItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3ff] text-[#4f46ff]">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-[#101522]">{resultTitle}</p>
                        <p className="mt-1 text-[13px] leading-6 text-[#8ea2bc]">{resultCopy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="max-h-[calc(100vh-190px)] overflow-y-auto rounded-[30px] bg-[#fcfdff] px-6 py-6 shadow-[0_18px_52px_rgba(15,23,42,0.05)]">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_36px_rgba(16,21,34,0.05)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#8ea2bc]">Compte connecte</p>
                      <p className="mt-3 text-[15px] font-medium text-[#101522]">{email ?? "Utilisateur Pictomag"}</p>
                    </div>
                    <div className="rounded-full bg-[#f5f8fc] px-3 py-2 text-[12px] font-medium text-[#637488]">AJAX</div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_36px_rgba(16,21,34,0.05)]">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[#eef3f8]">
                      <Image
                        src={safeAvatarSrc}
                        alt={previewDisplayName}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized={safeAvatarSrc.startsWith("data:image/")}
                      />
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-[#101522]">Photo de profil</p>
                      <p className="mt-1 text-[13px] leading-6 text-[#8ea2bc]">
                        Choisis une image locale. On la recadre en carre automatiquement.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    onDragOver={handleAvatarDragOver}
                    onDragLeave={handleAvatarDragLeave}
                    onDrop={handleAvatarDrop}
                    className={cx(
                      "mt-5 flex w-full items-center justify-between rounded-[24px] px-4 py-4 text-left transition",
                      avatarDragActive ? "bg-[#eef4ff] shadow-[0_18px_44px_rgba(79,70,255,0.12)]" : "bg-[#f6f8fc]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#101522] shadow-[0_8px_24px_rgba(16,21,34,0.08)]">
                        {avatarUrl ? <Camera className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#101522]">
                          {avatarFileName ? "Changer la photo de profil" : "Parcourir la machine"}
                        </p>
                        <p className="mt-1 text-[12px] text-[#8ea2bc]">
                          {avatarFileName || "Glisse une image ici ou clique pour selectionner."}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#8ea2bc]" />
                  </button>

                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={clearAvatar}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f4f6fb] px-4 py-2 text-[13px] font-medium text-[#637488] transition hover:bg-[#ecf1f8]"
                    >
                      <X className="h-4 w-4" />
                      Retirer l&apos;image
                    </button>
                  ) : null}
                </div>

                <div className="space-y-4 rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_36px_rgba(16,21,34,0.05)]">
                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-[#101522]">Nom affiche</label>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Damien Rakotomanga"
                      className="h-12 w-full rounded-[18px] bg-[#f6f8fc] px-4 text-[15px] text-[#101522] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#4f46ff]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-[#101522]">@username</label>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value.replace(/\s+/g, "").toLowerCase())}
                      placeholder="damien"
                      className="h-12 w-full rounded-[18px] bg-[#f6f8fc] px-4 text-[15px] text-[#101522] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#4f46ff]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-[#101522]">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(event) => setBio(event.target.value.slice(0, 280))}
                      rows={4}
                      placeholder="Creatif, stories, visuels, videos, editions, projets."
                      className="w-full rounded-[20px] bg-[#f6f8fc] px-4 py-4 text-[15px] leading-7 text-[#101522] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#4f46ff]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-[#101522]">Site web (optionnel)</label>
                    <div className="flex items-center rounded-[18px] bg-[#f6f8fc] px-4 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4f46ff]">
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

                <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_36px_rgba(16,21,34,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef3ff] text-[#4f46ff]">
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
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[#f4f6fb] px-4 text-[14px] font-medium text-[#101522] transition hover:bg-[#ecf1f8]"
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
            </aside>
          </div>
        </div>
      </div>

      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelection} className="hidden" />
    </main>
  );
}
