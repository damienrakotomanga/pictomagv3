"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { PublicProfileBundle } from "@/lib/posts";

type ProfileMePayload = {
  authenticated?: boolean;
  user?: {
    id?: string;
    email?: string | null;
  };
  profile?: PublicProfileBundle["profile"];
};

export function OnboardingPage() {
  const router = useRouter();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
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

      router.push("/profile");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'enregistrer votre profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 pb-10 pt-[96px] text-[#101522]">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[1180px] items-center gap-8">
        <section className="flex-1 rounded-[10px] border border-black/7 bg-[#f8fbff] p-8">
          <p className="type-kicker text-[#8ea2bc]">Onboarding</p>
          <h1 className="type-title-hero mt-4 max-w-[560px] text-[#101522]">
            On prepare ton profil pour qu&apos;il ressemble enfin a ton compte, pas a un prototype.
          </h1>
          <p className="type-body-lg mt-5 max-w-[560px] text-[#637488]">
            Ajoute l&apos;essentiel maintenant. Tu pourras publier juste apres et tomber sur un profil propre, meme s&apos;il est encore vide.
          </p>

          <div className="mt-10 overflow-hidden rounded-[10px] bg-white">
            <div className="relative h-[360px] w-full">
              <Image
                src="/figma-assets/photo-feed/photo-grid-7.jpg"
                alt="Portrait editorial Pictomag"
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section className="w-full max-w-[460px] rounded-[10px] border border-black/7 bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <Image src="/figma-assets/logo-mark.png" alt="Pictomag" width={30} height={30} priority />
            <Image src="/figma-assets/brand-wordmark.svg" alt="Pictomag" width={84} height={32} priority />
          </div>

          <div className="mt-6 rounded-[10px] border border-black/7 bg-[#f8fbff] px-4 py-3">
            <p className="text-[12px] font-medium text-[#8ea2bc]">Compte connecte</p>
            <p className="mt-1 text-[14px] font-medium tracking-[-0.01em] text-[#101522]">{email ?? "Utilisateur Pictomag"}</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#101522]">Nom affiche</label>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Axel Belujon"
                className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#101522]">@username</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="axelbelujon"
                className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#101522]">Bio</label>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                placeholder="Directeur creatif, maker, stories, visuels, videos."
                className="w-full rounded-[10px] border border-black/8 px-4 py-3 text-[15px] outline-none transition focus:border-[#2b6fff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#101522]">Photo de profil (URL)</label>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#101522]">Site web (optionnel)</label>
              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://www.votresite.com"
                className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
              />
            </div>

            {errorMessage ? <p className="text-[13px] font-medium text-[#d21d49]">{errorMessage}</p> : null}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="type-button h-12 flex-1 rounded-[10px] border border-black/7 px-4 text-[#101522] transition hover:bg-[#f8fbff]"
              >
                Voir mon profil
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="type-button h-12 flex-1 rounded-[10px] bg-[#101522] px-4 text-white transition hover:bg-[#1b2433] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {saving ? "Enregistrement..." : "Enregistrer et continuer"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
