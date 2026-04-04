"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AuthPageMode = "login" | "signup" | "forgot-password";

type AuthEntryPageProps = {
  mode: AuthPageMode;
};

type AuthPayload = {
  message?: string;
  authenticated?: boolean;
  profile?: {
    onboardingCompletedAt?: number | null;
  };
};

const copyByMode: Record<
  AuthPageMode,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    submit: string;
  }
> = {
  login: {
    eyebrow: "Connexion",
    title: "Revenir dans Pictomag",
    subtitle: "Retrouve ton feed, ton profil et tes conversations sans friction.",
    submit: "Se connecter",
  },
  signup: {
    eyebrow: "Inscription",
    title: "Creer ton compte Pictomag",
    subtitle: "Commence avec un vrai profil, puis publie ton premier texte, photo ou video.",
    submit: "Creer mon compte",
  },
  "forgot-password": {
    eyebrow: "Securite",
    title: "Mot de passe oublie",
    subtitle: "Entre ton email et on prepare la suite proprement.",
    submit: "Recevoir les instructions",
  },
};

export function AuthEntryPage({ mode }: AuthEntryPageProps) {
  const router = useRouter();
  const copy = copyByMode[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === "forgot-password") {
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as AuthPayload;
        if (cancelled || payload.authenticated !== true) {
          return;
        }

        router.replace(payload.profile?.onboardingCompletedAt ? "/" : "/onboarding");
      } catch {
        // Ignore session preload errors and let the user use the form normally.
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [mode, router]);

  const canSubmit = useMemo(() => {
    if (mode === "forgot-password") {
      return email.trim().length > 3;
    }

    if (mode === "login") {
      return email.trim().length > 3 && password.trim().length >= 8;
    }

    return (
      email.trim().length > 3 &&
      password.trim().length >= 8 &&
      confirmPassword.trim().length >= 8 &&
      displayName.trim().length > 1 &&
      username.trim().length > 1
    );
  }, [confirmPassword, displayName, email, mode, password, username]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      if (mode === "signup" && password.trim() !== confirmPassword.trim()) {
        setErrorMessage("Les mots de passe ne correspondent pas.");
        return;
      }

      const endpoint =
        mode === "signup"
          ? "/api/auth/register"
          : mode === "login"
            ? "/api/auth/login"
            : "/api/auth/forgot-password";
      const payload =
        mode === "signup"
          ? {
              email,
              password,
              displayName,
              username,
            }
          : mode === "login"
            ? {
                email,
                password,
              }
            : { email };

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => null)) as AuthPayload | null;
      if (!response.ok) {
        throw new Error(responsePayload?.message ?? "Action impossible pour le moment.");
      }

      if (mode === "forgot-password") {
        setMessage(
          responsePayload?.message ?? "Si un compte existe, les instructions seront envoyees a cette adresse.",
        );
        return;
      }

      router.push(mode === "signup" ? "/onboarding" : responsePayload?.profile?.onboardingCompletedAt ? "/" : "/onboarding");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Action impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 pb-10 pt-[96px] text-[#101522]">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[1180px] items-center gap-8">
        <section className="flex-1 rounded-[10px] border border-black/7 bg-[#f8fbff] p-8">
          <p className="type-kicker text-[#8ea2bc]">{copy.eyebrow}</p>
          <h1 className="type-title-hero mt-4 max-w-[520px] text-[#101522]">
            {copy.title}
          </h1>
          <p className="type-body-lg mt-5 max-w-[520px] text-[#637488]">{copy.subtitle}</p>

          <div className="mt-10 overflow-hidden rounded-[10px] bg-white">
            <div className="relative h-[360px] w-full">
              <Image
                src="/figma-assets/photo-feed/photo-grid-2.jpg"
                alt="Pictomag social visual"
                fill
                sizes="(max-width: 1180px) 100vw, 520px"
                priority
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section className="w-full max-w-[440px] rounded-[10px] border border-black/7 bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <Image
              src="/figma-assets/logo-mark.png"
              alt="Pictomag"
              width={30}
              height={30}
              style={{ width: "auto", height: "auto" }}
              priority
            />
            <Image src="/figma-assets/brand-wordmark.svg" alt="Pictomag" width={84} height={32} priority />
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#101522]">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="toi@pictomag.com"
                className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
              />
            </div>

            {mode !== "forgot-password" ? (
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#101522]">Mot de passe</label>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="8 caracteres minimum"
                  className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
                />
              </div>
            ) : null}

            {mode === "signup" ? (
              <>
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#101522]">Confirmer le mot de passe</label>
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type="password"
                    placeholder="Repete le mot de passe"
                    className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#101522]">Nom affiche</label>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    type="text"
                    placeholder="Axel Belujon"
                    className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#101522]">Nom utilisateur</label>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    type="text"
                    placeholder="axelbelujon"
                    className="h-12 w-full rounded-[10px] border border-black/8 px-4 text-[15px] outline-none transition focus:border-[#2b6fff]"
                  />
                </div>
              </>
            ) : null}

            {mode === "login" ? (
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-[13px] font-medium text-[#2b6fff]">
                  Mot de passe oublie ?
                </Link>
              </div>
            ) : null}

            {errorMessage ? <p className="text-[13px] font-medium text-[#d21d49]">{errorMessage}</p> : null}
            {message ? <p className="text-[13px] font-medium text-[#2b6fff]">{message}</p> : null}

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="type-button h-12 w-full rounded-[10px] bg-[#101522] text-white transition hover:bg-[#1b2433] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy ? "Chargement..." : copy.submit}
            </button>
          </form>

          <div className="mt-6 border-t border-black/6 pt-5 text-[14px] text-[#637488]">
            {mode === "login" ? (
              <p>
                Pas encore de compte ?{" "}
                <Link href="/signup" className="font-medium text-[#2b6fff]">
                  Creer un compte
                </Link>
              </p>
            ) : mode === "signup" ? (
              <p>
                Deja inscrit ?{" "}
                <Link href="/login" className="font-medium text-[#2b6fff]">
                  Se connecter
                </Link>
              </p>
            ) : (
              <p>
                Retour a la connexion{" "}
                <Link href="/login" className="font-medium text-[#2b6fff]">
                  Se connecter
                </Link>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
