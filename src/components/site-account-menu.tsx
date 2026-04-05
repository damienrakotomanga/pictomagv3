"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayName } from "@/lib/display-name";
import { DEFAULT_AVATAR, resolveProfileAvatarSrc } from "@/lib/profile-avatar";
import type { CreatorSessionPayload } from "@/lib/use-creator-session";

type SiteAccountMenuProps = {
  className?: string;
  menuButtonClassName?: string;
  avatarButtonClassName?: string;
  avatarImageClassName?: string;
  avatarSize?: string;
  popoverClassName?: string;
};

export function SiteAccountMenu({
  className,
  menuButtonClassName = "h-6 w-6",
  avatarButtonClassName = "relative h-8 w-8 overflow-hidden rounded-full",
  avatarImageClassName = "object-cover",
  avatarSize = "32px",
  popoverClassName = "absolute right-0 top-[42px] z-[200] w-[292px] rounded-[10px] border border-black/7 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.14)]",
}: SiteAccountMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CreatorSessionPayload | null>(null);
  const [busy, setBusy] = useState<false | "logout">(false);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/profile/me", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 401) {
          if (!cancelled) {
            setSession(null);
          }
          return;
        }

        const payload = response.ok ? ((await response.json()) as CreatorSessionPayload) : null;
        if (!cancelled) {
          setSession(payload);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  const isAuthenticated = Boolean(session?.authenticated && session?.user?.id && session?.profile);
  const displayName = formatDisplayName(session?.profile?.displayName, "Bienvenue");
  const username = session?.profile?.username?.trim() || "guest";
  const email = session?.user?.email?.trim() || null;
  const avatarUrl = resolveProfileAvatarSrc(session?.profile?.avatarUrl, DEFAULT_AVATAR);

  const secondaryLines = useMemo(() => {
    if (isAuthenticated) {
      return [
        `@${username}`,
        email ?? "Compte Pictomag",
      ].filter(Boolean);
    }

    return ["Connecte-toi pour publier et personnaliser ton profil."];
  }, [email, isAuthenticated, username]);

  const handleNavigate = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    setBusy("logout");

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      setSession(null);
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={rootRef} className={className ? `relative ${className}` : "relative"}>
      <button
        type="button"
        aria-label="Compte"
        onClick={() => setMenuOpen((current) => !current)}
        className={menuButtonClassName}
      >
        <Image src="/figma-assets/top-menu.svg" alt="" width={24} height={24} className="h-full w-full" />
      </button>
      <button
        type="button"
        aria-label={isAuthenticated ? "Mon compte" : "Connexion"}
        onClick={() => setMenuOpen((current) => !current)}
        className={avatarButtonClassName}
      >
        <Image src={avatarUrl} alt={displayName} fill sizes={avatarSize} className={avatarImageClassName} />
      </button>

      {menuOpen ? (
        <div className={popoverClassName}>
          <p className="type-kicker text-[#8ea2bc]">
            {loading ? "Chargement" : isAuthenticated ? "Mon compte" : "Acces"}
          </p>

          <div className="mt-4 flex items-start gap-3 rounded-[10px] border border-black/7 bg-[#f8fbff] p-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-[#eef3f8]">
              <Image src={avatarUrl} alt={displayName} fill sizes="44px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium tracking-[-0.01em] text-[#101522]">{displayName}</p>
              {secondaryLines.map((line) => (
                <p key={line} className="mt-1 text-[13px] leading-5 text-[#637488]">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {isAuthenticated ? (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => handleNavigate("/messages")}
                className="flex w-full items-center justify-between rounded-[10px] border border-black/7 px-4 py-3 text-left transition hover:border-black/10 hover:bg-[#f8fbff]"
              >
                <div>
                  <p className="type-title-card text-[#101522]">Messages</p>
                  <p className="mt-1 text-[12px] text-[#637488]">Retrouver tes conversations privees.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/profile")}
                className="flex w-full items-center justify-between rounded-[10px] border border-black/7 px-4 py-3 text-left transition hover:border-black/10 hover:bg-[#f8fbff]"
              >
                <div>
                  <p className="type-title-card text-[#101522]">Mon profil</p>
                  <p className="mt-1 text-[12px] text-[#637488]">Voir ton profil personnel et tes posts.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/onboarding")}
                className="flex w-full items-center justify-between rounded-[10px] border border-black/7 px-4 py-3 text-left transition hover:border-black/10 hover:bg-[#f8fbff]"
              >
                <div>
                  <p className="type-title-card text-[#101522]">Completer le profil</p>
                  <p className="mt-1 text-[12px] text-[#637488]">Nom, @username, bio, photo et site.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/compose")}
                className="flex w-full items-center justify-between rounded-[10px] border border-black/7 px-4 py-3 text-left transition hover:border-black/10 hover:bg-[#f8fbff]"
              >
                <div>
                  <p className="type-title-card text-[#101522]">Nouveau post</p>
                  <p className="mt-1 text-[12px] text-[#637488]">Publier un texte, une photo ou une video.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={busy === "logout"}
                className="type-button mt-2 w-full rounded-[10px] bg-[#101522] px-4 py-3 text-white transition hover:bg-[#1b2433] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "logout" ? "Deconnexion..." : "Se deconnecter"}
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => handleNavigate("/login")}
                className="type-button w-full rounded-[10px] bg-[#101522] px-4 py-3 text-white transition hover:bg-[#1b2433]"
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/signup")}
                className="type-button w-full rounded-[10px] border border-black/7 px-4 py-3 text-[#101522] transition hover:bg-[#f8fbff]"
              >
                Creer un compte
              </button>
              <Link
                href="/forgot-password"
                onClick={() => setMenuOpen(false)}
                className="block pt-2 text-center text-[13px] font-medium text-[#2b6fff]"
              >
                Mot de passe oublie
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
