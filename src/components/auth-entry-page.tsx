"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AuthPageMode = "login" | "signup" | "forgot-password";

type AuthEntryPageProps = {
  mode: AuthPageMode;
};

type AuthPayload = {
  message?: string;
  authenticated?: boolean;
  user?: {
    id?: string;
  };
  profile?: {
    onboardingCompletedAt?: number | null;
  };
};

function resolveSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  if (value.startsWith("//")) {
    return null;
  }

  if (
    value === "/login" ||
    value === "/signup" ||
    value === "/forgot-password" ||
    value === "/auth" ||
    value.startsWith("/debug/auth")
  ) {
    return null;
  }

  return value;
}

const copyByMode: Record<
  AuthPageMode,
  {
    heroTitle: string;
    heroBody: string;
    primaryTitle: string;
    secondaryTitle: string;
    submit: string;
  }
> = {
  login: {
    heroTitle: "Ca se passe\nmaintenant",
    heroBody: "",
    primaryTitle: "Inscrivez-vous.",
    secondaryTitle: "Vous avez deja un compte ?",
    submit: "Se connecter",
  },
  signup: {
    heroTitle: "Ca se passe\nmaintenant",
    heroBody: "",
    primaryTitle: "Creer un compte",
    secondaryTitle: "Tu as deja un compte ?",
    submit: "Creer mon compte",
  },
  "forgot-password": {
    heroTitle: "Recupere ton compte",
    heroBody: "",
    primaryTitle: "Mot de passe oublie",
    secondaryTitle: "Retour a la connexion",
    submit: "Recevoir les instructions",
  },
};
// Legacy auth scene kept temporarily while the new motion showcase is rolled out everywhere.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AuthPortalShowcase() {
  return (
    <section className="hidden flex-1 border-r border-black/[0.06] lg:flex lg:items-center lg:justify-center lg:px-12 lg:py-12 xl:px-16">
      <div className="w-full max-w-[760px]">
        <Image
          src="/figma-assets/pictomag-logo.svg"
          alt="Pictomag"
          width={626}
          height={167}
          priority
          className="h-[56px] w-auto"
        />

        <div className="mt-14 max-w-[620px]">
          <h1 className="whitespace-pre-line text-[72px] font-semibold leading-[0.92] tracking-[-0.08em] text-[#101522]">
            {"Publiez,\nvendez,\npassez en live."}
          </h1>
          <p className="mt-6 max-w-[470px] text-[20px] leading-8 text-[#6a778b]">
            Pictomag relie le feed, le profil, la marketplace et le live shopping dans un seul endroit.
          </p>
        </div>

        <div className="relative mt-14 h-[470px] max-w-[640px]">
          <div className="absolute left-0 top-[90px] h-[250px] w-[190px] overflow-hidden rounded-[34px] bg-[#eef4ff] shadow-[0_24px_80px_rgba(16,21,34,0.08)]">
            <Image src="/figma-assets/hero-feed.jpg" alt="" fill className="object-cover" />
            <div className="absolute bottom-5 left-5 right-5 h-[8px] rounded-full bg-white/80" />
          </div>

          <div className="absolute left-[150px] top-0 h-[390px] w-[290px] overflow-hidden rounded-[40px] bg-[#f4f7fb] shadow-[0_32px_110px_rgba(16,21,34,0.12)]">
            <Image src="/figma-assets/hero-feed.jpg" alt="" fill className="object-cover" />
            <div className="absolute left-8 right-8 top-8 h-[6px] rounded-full bg-white/75" />
            <div className="absolute bottom-8 left-8 right-8 h-[16px] rounded-full border border-white/90 bg-white/10" />
          </div>

          <div className="absolute left-[330px] top-[150px] h-[230px] w-[180px] overflow-hidden rounded-[34px] bg-[#f6f8fc] shadow-[0_24px_80px_rgba(16,21,34,0.1)]">
            <Image src="/figma-assets/avatar-post.png" alt="" fill className="object-cover" />
            <div className="absolute bottom-5 left-5 right-5 h-[8px] rounded-full bg-white/80" />
          </div>

          <div className="absolute left-[40px] top-[250px] h-[70px] w-[70px] overflow-hidden rounded-full border-[5px] border-white bg-white shadow-[0_20px_50px_rgba(16,21,34,0.12)]">
            <Image src="/figma-assets/avatar-story.png" alt="" fill className="object-cover" />
          </div>

          <div className="absolute left-[410px] top-[210px] h-[64px] w-[64px] overflow-hidden rounded-full border-[4px] border-white bg-white shadow-[0_18px_40px_rgba(16,21,34,0.12)]">
            <Image src="/figma-assets/avatar-story.png" alt="" fill className="object-cover" />
          </div>

          <div className="absolute left-[88px] top-[130px] rounded-full bg-white px-4 py-2 text-[28px] shadow-[0_18px_36px_rgba(16,21,34,0.08)]">
            ✨
          </div>

          <div className="absolute left-[455px] top-[112px] rounded-full bg-[#32d56d] px-4 py-2 text-[16px] font-semibold text-white shadow-[0_18px_36px_rgba(50,213,109,0.22)]">
            + live
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthPortalShowcaseHype() {
  return (
    <section className="hidden flex-1 border-r border-black/[0.06] lg:flex lg:items-center lg:justify-center lg:px-12 lg:py-12 xl:px-16">
      <div className="w-full max-w-[760px]">
        <Image
          src="/figma-assets/pictomag-logo.svg"
          alt="Pictomag"
          width={626}
          height={167}
          priority
          className="h-[56px] w-auto"
        />

        <div className="mt-14 max-w-[640px]">
          <h1 className="whitespace-pre-line text-[72px] font-semibold leading-[0.9] tracking-[-0.08em] text-[#101522]">
            {"Publie.\nVends.\nPasse en live."}
          </h1>
          <p className="mt-5 max-w-[460px] text-[19px] leading-8 text-[#667085]">
            Découvrez une nouvelle façon de vendre avec vos proches.
          </p>
        </div>

        <div className="portal-stage relative mt-14 h-[540px] max-w-[690px] overflow-visible">
          <div className="absolute inset-x-12 top-12 h-[320px] rounded-full bg-[radial-gradient(circle,_rgba(255,120,156,0.12),_rgba(255,120,156,0)_68%)] blur-3xl" />
          <div className="absolute left-[110px] top-[160px] h-[240px] w-[320px] rounded-full bg-[radial-gradient(circle,_rgba(41,214,111,0.12),_rgba(41,214,111,0)_72%)] blur-3xl" />

          <div className="portal-card portal-card-side absolute left-[18px] top-[136px] h-[320px] w-[224px] overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,#19222c_0%,#101620_100%)] shadow-[0_30px_90px_rgba(16,21,34,0.16)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(80,255,140,0.24),rgba(80,255,140,0)_22%),radial-gradient(circle_at_48%_54%,rgba(255,58,132,0.92),rgba(255,58,132,0)_20%),radial-gradient(circle_at_74%_26%,rgba(120,98,255,0.7),rgba(120,98,255,0)_24%),linear-gradient(180deg,#0f141b_0%,#1e2b35_100%)]" />
            <div className="absolute left-[-8px] top-[132px] h-[120px] w-[170px] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(255,80,182,1),rgba(255,80,182,0.88)_38%,rgba(119,84,255,0.84)_62%,rgba(33,255,160,0)_100%)] blur-[2px]" />
            <div className="absolute left-[44px] top-[88px] h-[164px] w-[124px] rounded-[30px] border border-white/16 bg-white/6 backdrop-blur-[10px]" />
            <div className="portal-line absolute left-7 right-7 top-8 h-[5px] rounded-full bg-white/90" />
            <div className="absolute bottom-10 left-7 h-[14px] w-[112px] rounded-full border border-white/80 bg-white/8 backdrop-blur-sm" />
            <div className="absolute bottom-11 right-7 h-[28px] w-[28px] rounded-full border-[3px] border-white/90" />
          </div>

          <div className="portal-card portal-card-main absolute left-[172px] top-[18px] h-[430px] w-[344px] overflow-hidden rounded-[44px] bg-[linear-gradient(180deg,#151a22_0%,#23221d_22%,#251815_44%,#1a1722_100%)] shadow-[0_40px_120px_rgba(16,21,34,0.2)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,201,92,0.9),rgba(255,201,92,0)_26%),radial-gradient(circle_at_72%_12%,rgba(136,255,120,0.42),rgba(136,255,120,0)_24%),radial-gradient(circle_at_62%_34%,rgba(255,122,84,0.6),rgba(255,122,84,0)_30%),radial-gradient(circle_at_26%_72%,rgba(255,170,92,0.42),rgba(255,170,92,0)_30%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
            <div className="absolute left-[138px] top-[90px] h-[210px] w-[88px] rounded-[999px] bg-[linear-gradient(180deg,rgba(255,214,120,0.08),rgba(255,214,120,0.8)_34%,rgba(255,96,129,0.9)_64%,rgba(255,96,129,0.08)_100%)] blur-[1px]" />
            <div className="absolute left-[114px] top-[120px] h-[234px] w-[136px] rounded-[999px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] backdrop-blur-[1px]" />
            <div className="absolute left-[92px] top-[146px] h-[188px] w-[170px] rounded-[44px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))]" />
            <div className="absolute left-[84px] top-[180px] h-[104px] w-[86px] rounded-[999px] bg-[radial-gradient(circle_at_35%_35%,rgba(255,224,182,0.95),rgba(255,166,120,0.82)_48%,rgba(255,166,120,0)_100%)]" />
            <div className="absolute right-[86px] top-[164px] h-[104px] w-[86px] rounded-[999px] bg-[radial-gradient(circle_at_35%_35%,rgba(255,197,173,0.92),rgba(255,128,104,0.78)_48%,rgba(255,128,104,0)_100%)]" />
            <div className="absolute left-[108px] top-[196px] h-[144px] w-[128px] rounded-[999px] bg-[radial-gradient(circle_at_35%_35%,rgba(255,225,208,0.45),rgba(255,225,208,0)_100%)]" />
            <div className="portal-line absolute left-9 right-9 top-8 h-[5px] rounded-full bg-white/92" />
            <div className="absolute bottom-10 left-8 h-[18px] w-[210px] rounded-full border-[3px] border-white/90 bg-white/8 backdrop-blur-sm" />
            <div className="absolute bottom-10 right-8 h-[36px] w-[36px] rounded-full border-[4px] border-white/92" />
          </div>

          <div className="portal-card portal-card-front absolute left-[446px] top-[144px] h-[316px] w-[200px] overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,#f8eef2_0%,#ffffff_100%)] shadow-[0_30px_100px_rgba(16,21,34,0.14)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,96,129,0.2),rgba(255,96,129,0)_28%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
            <div className="absolute left-[26px] top-[88px] h-[118px] w-[132px] rounded-[30px] bg-[linear-gradient(180deg,#ffd8c8_0%,#f3b7aa_38%,#9aa2b8_100%)]" />
            <div className="absolute right-[18px] top-[62px] h-[132px] w-[96px] rounded-[26px] bg-[radial-gradient(circle_at_45%_40%,#ffd3c5,#ff8e92_48%,#6b63ff_100%)] opacity-95" />
            <div className="absolute bottom-11 left-7 h-[14px] w-[108px] rounded-full border border-[#101522]/16 bg-[#101522]/5" />
            <div className="absolute bottom-10 right-7 h-[30px] w-[30px] rounded-full border-[3px] border-[#101522]/72" />
          </div>

          <div className="portal-avatar-left absolute left-[54px] top-[262px] flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-[radial-gradient(circle_at_35%_35%,#ffffff,#9ec6ff_48%,#3560ff_100%)] shadow-[0_20px_50px_rgba(16,21,34,0.15)]">
            <span className="h-[26px] w-[26px] rounded-full bg-white/88" />
          </div>

          <div className="portal-avatar-front absolute left-[456px] top-[240px] flex h-[66px] w-[66px] items-center justify-center overflow-hidden rounded-full border-[4px] border-white bg-[radial-gradient(circle_at_40%_38%,#ffffff,#ffd9e7_45%,#ff8db3_100%)] shadow-[0_18px_40px_rgba(16,21,34,0.15)]">
            <span className="h-[22px] w-[22px] rounded-full bg-white/88" />
          </div>

          <div className="portal-badge absolute left-[86px] top-[156px] flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white shadow-[0_24px_60px_rgba(16,21,34,0.1)]">
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff9f43]" />
              <span className="h-3.5 w-3.5 rounded-full bg-[#ff7a00]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff4f7b]" />
            </div>
          </div>

          <div className="portal-heart absolute left-[6px] top-[342px] h-[96px] w-[96px] rotate-[-14deg] bg-[radial-gradient(circle_at_30%_30%,#ff7a00,#ff2a78_58%,#ff0d9c_100%)] [clip-path:path('M48,86 C18,68 0,50 0,28 C0,12 12,0 28,0 C38,0 46,6 48,14 C50,6 58,0 68,0 C84,0 96,12 96,28 C96,50 78,68 48,86 Z')] shadow-[0_24px_54px_rgba(255,42,120,0.22)]" />

          <div className="portal-chip absolute left-[106px] top-[104px] flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-[0_16px_44px_rgba(16,21,34,0.1)]">
            <span className="h-6 w-6 rounded-full bg-[radial-gradient(circle_at_35%_35%,#c38dff,#7f47ff_70%,#5a31df_100%)]" />
            <span className="h-6 w-6 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffffff,#dce6ff_44%,#7aa9ff_100%)]" />
            <span className="h-6 w-6 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffcd86,#ff8e2b_70%,#ff5c00_100%)]" />
          </div>

          <div className="portal-live-pill absolute left-[494px] top-[126px] rounded-full bg-[#2fd76c] px-5 py-3 text-[16px] font-semibold text-white shadow-[0_20px_44px_rgba(47,215,108,0.26)]">
            <span className="inline-flex items-center gap-2">
              <span className="text-[18px] leading-none">★</span>
              <span>+ live</span>
            </span>
          </div>
        </div>

        <style jsx>{`
          .portal-card {
            will-change: transform;
          }

          .portal-card-main {
            animation: portalFloatMain 6.8s ease-in-out infinite;
          }

          .portal-card-side {
            animation: portalFloatSide 7.6s ease-in-out infinite;
          }

          .portal-card-front {
            animation: portalFloatFront 5.8s ease-in-out infinite;
          }

          .portal-avatar-left {
            animation: portalAvatarLeft 7.4s ease-in-out infinite;
          }

          .portal-avatar-front {
            animation: portalAvatarFront 5.6s ease-in-out infinite;
          }

          .portal-badge {
            animation: portalBadge 4.8s ease-in-out infinite;
          }

          .portal-chip {
            animation: portalChip 5.1s ease-in-out infinite;
          }

          .portal-live-pill {
            animation: portalLive 3.2s ease-in-out infinite;
          }

          .portal-heart {
            animation: portalHeart 4.9s ease-in-out infinite;
          }

          .portal-line {
            overflow: hidden;
          }

          .portal-line::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.68) 50%, rgba(255, 255, 255, 0.12) 100%);
            transform: translateX(-100%);
            animation: portalShimmer 4.4s ease-in-out infinite;
          }

          .portal-line-delayed::after {
            animation-delay: 0.7s;
          }

          .portal-line-soft::after {
            animation-delay: 1.1s;
          }

          @keyframes portalFloatMain {
            0%,
            100% {
              transform: translate3d(0, 0, 0) rotate(-1deg);
            }
            50% {
              transform: translate3d(0, -14px, 0) rotate(1deg);
            }
          }

          @keyframes portalFloatSide {
            0%,
            100% {
              transform: translate3d(0, 0, 0) rotate(-3deg);
            }
            50% {
              transform: translate3d(-10px, 12px, 0) rotate(-1deg);
            }
          }

          @keyframes portalFloatFront {
            0%,
            100% {
              transform: translate3d(0, 0, 0) rotate(4deg);
            }
            50% {
              transform: translate3d(8px, -16px, 0) rotate(2deg);
            }
          }

          @keyframes portalAvatarLeft {
            0%,
            100% {
              transform: translate3d(0, 0, 0);
            }
            50% {
              transform: translate3d(-2px, 10px, 0);
            }
          }

          @keyframes portalAvatarFront {
            0%,
            100% {
              transform: translate3d(0, 0, 0);
            }
            50% {
              transform: translate3d(2px, -8px, 0);
            }
          }

          @keyframes portalBadge {
            0%,
            100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(0, -8px, 0) scale(1.04);
            }
          }

          @keyframes portalChip {
            0%,
            100% {
              transform: translate3d(0, 0, 0) rotate(-2deg);
            }
            50% {
              transform: translate3d(6px, -7px, 0) rotate(2deg);
            }
          }

          @keyframes portalLive {
            0%,
            100% {
              transform: translate3d(0, 0, 0) scale(1);
              box-shadow: 0 20px 44px rgba(47, 215, 108, 0.2);
            }
            50% {
              transform: translate3d(0, -6px, 0) scale(1.04);
              box-shadow: 0 28px 52px rgba(47, 215, 108, 0.32);
            }
          }

          @keyframes portalHeart {
            0%,
            100% {
              transform: translate3d(0, 0, 0) rotate(-14deg) scale(1);
            }
            50% {
              transform: translate3d(-4px, -12px, 0) rotate(-10deg) scale(1.04);
            }
          }

          @keyframes portalShimmer {
            0% {
              transform: translateX(-100%);
            }
            55%,
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    </section>
  );
}

export function AuthEntryPage({ mode }: AuthEntryPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = copyByMode[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nextPath = useMemo(() => resolveSafeNextPath(searchParams.get("next")), [searchParams]);
  const signupHref = nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup";
  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgotPassword = mode === "forgot-password";

  useEffect(() => {
    if (mode === "forgot-password") {
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/profile/me", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as AuthPayload;
        if (cancelled || payload.authenticated !== true || !payload.user?.id) {
          return;
        }

        router.replace(payload.profile?.onboardingCompletedAt ? nextPath ?? "/profile" : "/onboarding");
      } catch {
        // Ignore session preload errors and let the user use the form normally.
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [mode, nextPath, router]);

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

  const validationMessage = useMemo(() => {
    if (mode === "forgot-password") {
      return "Ajoute une adresse email valide pour continuer.";
    }

    if (mode === "login") {
      return "Ajoute ton email et un mot de passe de 8 caracteres minimum.";
    }

    return "Complete ton email, ton mot de passe, sa confirmation, ton nom visible et ton identifiant.";
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setErrorMessage(validationMessage);
      setMessage(null);
      return;
    }

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

      router.push(
        mode === "signup"
          ? "/onboarding"
          : responsePayload?.profile?.onboardingCompletedAt
            ? nextPath ?? "/profile"
            : "/onboarding",
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Action impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  if (isLogin || isSignup) {
    return (
      <main className="min-h-screen bg-white text-[#101522]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1540px] flex-col lg:flex-row">
          <AuthPortalShowcaseHype />

          <section className="flex w-full items-center justify-center px-6 py-10 sm:px-10 lg:w-[560px] lg:px-14 xl:w-[600px]">
            <div className="w-full max-w-[560px]">
              <div className="flex justify-center lg:hidden">
                <Image
                  src="/figma-assets/pictomag-logo.svg"
                  alt="Pictomag"
                  width={626}
                  height={167}
                  priority
                  className="h-[52px] w-auto"
                />
              </div>

              <section className="mx-auto mt-12 w-full max-w-[560px] lg:mt-0">
                <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101522] sm:text-[31px]">
                  {isLogin ? "Se connecter a Pictomag" : "Creer ton compte"}
                </h1>
                {nextPath ? (
                  <p className="mt-3 text-[13px] font-medium text-[#2563eb]">Connexion requise pour continuer.</p>
                ) : null}

                <form className="mt-10 space-y-4" onSubmit={handleSubmit}>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="toi@pictomag.com"
                    className="h-14 w-full rounded-[18px] border border-black/[0.14] bg-white px-5 text-[17px] text-[#101522] outline-none transition placeholder:text-[#8b97aa] focus:border-[#101522]"
                  />

                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    placeholder="8 caracteres minimum"
                    className="h-14 w-full rounded-[18px] border border-black/[0.08] bg-white px-5 text-[17px] text-[#101522] outline-none transition placeholder:text-[#8b97aa] focus:border-[#101522]"
                  />

                  {isSignup ? (
                    <>
                      <input
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        type="password"
                        placeholder="Repete le mot de passe"
                        className="h-14 w-full rounded-[18px] border border-black/[0.08] bg-white px-5 text-[17px] text-[#101522] outline-none transition placeholder:text-[#8b97aa] focus:border-[#101522]"
                      />

                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        type="text"
                        placeholder="Axel Belujon"
                        className="h-14 w-full rounded-[18px] border border-black/[0.08] bg-white px-5 text-[17px] text-[#101522] outline-none transition placeholder:text-[#8b97aa] focus:border-[#101522]"
                      />

                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        type="text"
                        placeholder="axelbelujon"
                        className="h-14 w-full rounded-[18px] border border-black/[0.08] bg-white px-5 text-[17px] text-[#101522] outline-none transition placeholder:text-[#8b97aa] focus:border-[#101522]"
                      />
                    </>
                  ) : null}

                  {errorMessage ? (
                    <p className="rounded-[18px] bg-[#fff2f5] px-4 py-3 text-[13px] font-medium text-[#d21d49]">{errorMessage}</p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={busy}
                    aria-disabled={!canSubmit || busy}
                    className="h-14 w-full rounded-full text-[16px] font-semibold text-white transition disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: canSubmit && !busy ? "#8fc2ff" : "#b8d7ff",
                      color: "#ffffff",
                    }}
                  >
                    {busy ? "Chargement..." : copy.submit}
                  </button>

                  {!canSubmit ? (
                    <p className="text-[13px] leading-6 text-[#8b97aa]">{validationMessage}</p>
                  ) : null}
                </form>

                {isLogin ? (
                  <div className="mt-6 text-center">
                    <Link href="/forgot-password" className="text-[16px] font-medium text-[#101522] transition hover:text-[#2563eb]">
                      Mot de passe oublie ?
                    </Link>
                  </div>
                ) : null}

                <div className="mt-10">
                  {isSignup ? (
                    <>
                      <p className="mb-4 text-center text-[16px] font-semibold text-[#101522]">Tu as deja un compte ?</p>
                      <Link
                        href={loginHref}
                        className="inline-flex h-14 w-full items-center justify-center rounded-full border border-black/[0.1] bg-white px-6 text-[17px] font-semibold text-[#101522] transition hover:bg-[#f7f9fc]"
                        style={{ borderColor: "rgba(16,21,34,0.1)", color: "#101522", backgroundColor: "#ffffff" }}
                      >
                        Se connecter
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={signupHref}
                      className="inline-flex h-14 w-full items-center justify-center rounded-full border border-[#2563eb] bg-white px-6 text-[17px] font-semibold text-[#2563eb] transition hover:bg-[#f5f9ff]"
                      style={{ borderColor: "#2563eb", color: "#2563eb", backgroundColor: "#ffffff" }}
                    >
                      Creer un nouveau compte
                    </Link>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#101522]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1540px] flex-col lg:flex-row">
        <AuthPortalShowcaseHype />

        <section className="relative flex w-full shrink-0 items-center px-6 py-10 sm:px-10 lg:w-[520px] lg:px-14">
          <div className="w-full max-w-[390px]">
            <div className="lg:hidden">
              <Image
                src="/figma-assets/pictomag-logo.svg"
                alt="Pictomag"
                width={626}
                height={167}
                priority
                className="h-[34px] w-auto"
              />
            </div>

            <h1 className="mt-10 whitespace-pre-line text-[56px] font-semibold leading-[0.9] tracking-[-0.08em] text-[#101522] sm:text-[80px]">
              {copy.heroTitle}
            </h1>
            {copy.heroBody ? <p className="mt-4 max-w-[320px] text-[15px] leading-7 text-[#637488]">{copy.heroBody}</p> : null}

            {nextPath ? (
              <p className="mt-5 text-[13px] font-semibold text-[#2563eb]">
                Connexion requise pour ouvrir ce contenu. On te renvoie juste apres.
              </p>
            ) : null}

            {isLogin ? (
              <div className="mt-16">
                <h2 className="text-[34px] font-semibold tracking-[-0.06em] text-[#101522]">{copy.primaryTitle}</h2>
                <Link
                  href={signupHref}
                  className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-full bg-[#101522] text-[17px] font-semibold text-white transition hover:bg-[#1b2433]"
                  style={{ backgroundColor: "#101522", color: "#ffffff" }}
                >
                  Creer un compte
                </Link>
                <p className="mt-4 max-w-[320px] text-[12px] leading-6 text-[#97a3b6]">
                  En creant un compte, tu acceptes nos conditions d&apos;utilisation et notre politique de confidentialite.
                </p>
              </div>
            ) : null}

            <div className={isLogin ? "mt-16" : "mt-16"}>
              {isLogin ? (
                <div className="flex items-center gap-4 text-[14px] text-[#8d99ab]">
                  <div className="h-px flex-1 bg-black/[0.08]" />
                  <span>ou</span>
                  <div className="h-px flex-1 bg-black/[0.08]" />
                </div>
              ) : null}

              <h2 className={`font-semibold tracking-[-0.05em] text-[#101522] ${isLogin ? "mt-10 text-[32px]" : "text-[36px]"}`}>
                {isLogin ? copy.secondaryTitle : copy.primaryTitle}
              </h2>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-[#101522]">Email</label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="toi@pictomag.com"
                    className="h-14 w-full rounded-[18px] border border-black/[0.06] bg-white px-5 text-[15px] text-[#101522] outline-none transition placeholder:text-[#9ba8ba] focus:border-[#a9c5ff] focus:ring-4 focus:ring-[#2563eb]/[0.08]"
                  />
                </div>

                {!isForgotPassword ? (
                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-[#101522]">Mot de passe</label>
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      placeholder="8 caracteres minimum"
                      className="h-14 w-full rounded-[18px] border border-black/[0.06] bg-white px-5 text-[15px] text-[#101522] outline-none transition placeholder:text-[#9ba8ba] focus:border-[#a9c5ff] focus:ring-4 focus:ring-[#2563eb]/[0.08]"
                    />
                  </div>
                ) : null}

                {isSignup ? (
                  <>
                    <div className="space-y-2">
                      <label className="block text-[13px] font-medium text-[#101522]">Confirmer le mot de passe</label>
                      <input
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        type="password"
                        placeholder="Repete le mot de passe"
                        className="h-14 w-full rounded-[18px] border border-black/[0.06] bg-white px-5 text-[15px] text-[#101522] outline-none transition placeholder:text-[#9ba8ba] focus:border-[#a9c5ff] focus:ring-4 focus:ring-[#2563eb]/[0.08]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] font-medium text-[#101522]">Nom affiche</label>
                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        type="text"
                        placeholder="Axel Belujon"
                        className="h-14 w-full rounded-[18px] border border-black/[0.06] bg-white px-5 text-[15px] text-[#101522] outline-none transition placeholder:text-[#9ba8ba] focus:border-[#a9c5ff] focus:ring-4 focus:ring-[#2563eb]/[0.08]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] font-medium text-[#101522]">Nom utilisateur</label>
                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        type="text"
                        placeholder="axelbelujon"
                        className="h-14 w-full rounded-[18px] border border-black/[0.06] bg-white px-5 text-[15px] text-[#101522] outline-none transition placeholder:text-[#9ba8ba] focus:border-[#a9c5ff] focus:ring-4 focus:ring-[#2563eb]/[0.08]"
                      />
                    </div>
                  </>
                ) : null}

                {isLogin ? (
                  <div className="flex justify-end pt-1">
                    <Link href="/forgot-password" className="text-[13px] font-medium text-[#2563eb] transition hover:text-[#1d4fd8]">
                      Mot de passe oublie ?
                    </Link>
                  </div>
                ) : null}

                {errorMessage ? (
                  <p className="rounded-[18px] bg-[#fff2f5] px-4 py-3 text-[13px] font-medium text-[#d21d49]">{errorMessage}</p>
                ) : null}
                {message ? (
                  <p className="rounded-[18px] bg-[#eef4ff] px-4 py-3 text-[13px] font-medium text-[#305dff]">{message}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit || busy}
                  className={`h-14 w-full rounded-full text-[16px] font-semibold transition ${
                    isLogin
                      ? "border border-black/[0.08] bg-white text-[#101522] hover:bg-[#f7f9fc] disabled:bg-[#f4f6f9] disabled:text-[#98a5b7]"
                      : "bg-[#101522] hover:bg-[#1b2433] disabled:bg-[#7e8896]"
                  } disabled:cursor-not-allowed`}
                  style={
                    isLogin
                      ? {
                          backgroundColor: "#ffffff",
                          color: canSubmit && !busy ? "#101522" : "#98a5b7",
                          borderColor: "rgba(16,21,34,0.08)",
                        }
                      : {
                          backgroundColor: canSubmit && !busy ? "#101522" : "#7e8896",
                          color: "#ffffff",
                        }
                  }
                >
                  {busy ? "Chargement..." : copy.submit}
                </button>
              </form>

              {!isLogin ? (
                <div className="mt-8">
                  <p className="text-[15px] font-medium text-[#101522]">{copy.secondaryTitle}</p>
                  <Link
                    href={loginHref}
                    className="mt-4 inline-flex h-14 w-full items-center justify-center rounded-full border border-black/[0.08] bg-white text-[16px] font-semibold text-[#101522] transition hover:bg-[#f7f9fc]"
                    style={{ backgroundColor: "#ffffff", color: "#101522", borderColor: "rgba(16,21,34,0.08)" }}
                  >
                    Se connecter
                  </Link>
                </div>
              ) : null}

              {!isLogin ? (
                <p className="mt-8 text-[12px] leading-6 text-[#97a3b6]">
                  En continuant, tu acceptes nos conditions d&apos;utilisation et notre politique de confidentialite.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
