"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SessionPayload = {
  authenticated?: boolean;
  compatibilityMode?: boolean;
  role?: string;
  userId?: string;
  sessionId?: string;
  user?: {
    id: string;
    email: string | null;
    role: string;
    authMode: string;
    createdAt: number;
    updatedAt: number;
    lastLoginAt: number | null;
  };
  profile?: {
    userId: string;
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    websiteUrl: string | null;
    createdAt: number;
    updatedAt: number;
  };
  message?: string;
};

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as SessionPayload;
  } catch {
    return { message: text } satisfies SessionPayload;
  }
}

export function AuthControlPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [profileMe, setProfileMe] = useState<SessionPayload | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    displayName: "",
    username: "",
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const loadSession = async () => {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = await readJson(response);
    setSession(payload);
    return payload;
  };

  const loadProfileMe = async () => {
    const response = await fetch("/api/profile/me", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = await readJson(response);
    setProfileMe(payload);
    return { ok: response.ok, payload };
  };

  useEffect(() => {
    void loadSession();
  }, []);

  const runAction = async (action: string, runner: () => Promise<void>) => {
    setBusyAction(action);
    setFeedback(null);

    try {
      await runner();
    } catch {
      setFeedback("Une erreur reseau est survenue.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-[#101522]">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6">
        <header className="rounded-[10px] border border-[#edf1f7] bg-white p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8aa0bd]">Phase 1 auth control</p>
          <h1 className="mt-2 text-[36px] font-semibold tracking-[-0.05em]">Controle de l’authentification</h1>
          <p className="mt-3 max-w-[820px] text-[15px] leading-7 text-[#66768c]">
            Cette page est uniquement la pour tester le nouveau flux minimal sans toucher au design des autres surfaces.
            Tu peux creer un compte, te connecter, te deconnecter, verifier <code>/api/profile/me</code> et activer le mode admin demo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-[14px] font-medium">
            <Link className="rounded-[10px] border border-[#d8e2f1] px-4 py-2 hover:bg-[#f7fbff]" href="/">Retour accueil</Link>
            <Link className="rounded-[10px] border border-[#d8e2f1] px-4 py-2 hover:bg-[#f7fbff]" href="/profile">Ouvrir profil</Link>
            <Link className="rounded-[10px] border border-[#d8e2f1] px-4 py-2 hover:bg-[#f7fbff]" href="/admin/audit">Ouvrir audit admin</Link>
          </div>
        </header>

        {feedback ? (
          <section className="rounded-[10px] border border-[#ffd9d9] bg-[#fff8f8] px-4 py-3 text-[14px] text-[#9c3434]">
            {feedback}
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[10px] border border-[#edf1f7] bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">Session courante</p>
                <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">Etat navigateur</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  void runAction("refresh-session", async () => {
                    await loadSession();
                    setFeedback("Session rechargee.");
                  })
                }
                className="rounded-[10px] border border-[#d8e2f1] px-4 py-2 text-[14px] font-semibold hover:bg-[#f7fbff]"
              >
                {busyAction === "refresh-session" ? "Chargement..." : "Rafraichir"}
              </button>
            </div>

            <pre className="mt-5 overflow-x-auto rounded-[10px] bg-[#f8fafc] p-4 text-[12px] leading-6 text-[#334155]">
              {prettyJson(session)}
            </pre>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void runAction("profile-me", async () => {
                    const result = await loadProfileMe();
                    setFeedback(result.ok ? "Profil /me charge." : (result.payload.message ?? "Acces refuse a /me."));
                  })
                }
                className="rounded-[10px] border border-[#d8e2f1] px-4 py-2 text-[14px] font-semibold hover:bg-[#f7fbff]"
              >
                {busyAction === "profile-me" ? "Chargement..." : "Tester /api/profile/me"}
              </button>
              <button
                type="button"
                onClick={() =>
                  void runAction("admin-demo", async () => {
                    const response = await fetch("/api/auth/session", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ role: "admin" }),
                    });
                    const payload = await readJson(response);
                    setSession(payload);
                    setFeedback(response.ok ? "Mode admin demo active." : (payload.message ?? "Activation admin impossible."));
                  })
                }
                className="rounded-[10px] bg-[#101522] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-95"
              >
                {busyAction === "admin-demo" ? "Activation..." : "Activer mode admin demo"}
              </button>
              <button
                type="button"
                onClick={() =>
                  void runAction("logout", async () => {
                    const response = await fetch("/api/auth/logout", {
                      method: "POST",
                      credentials: "same-origin",
                    });
                    const payload = await readJson(response);
                    setSession(payload);
                    setProfileMe(null);
                    setFeedback(response.ok ? "Deconnexion effectuee." : (payload.message ?? "Deconnexion impossible."));
                  })
                }
                className="rounded-[10px] border border-[#f0d6d6] px-4 py-2 text-[14px] font-semibold text-[#9c3434] hover:bg-[#fff7f7]"
              >
                {busyAction === "logout" ? "Deconnexion..." : "Logout"}
              </button>
            </div>

            <div className="mt-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">Derniere lecture /me</p>
              <pre className="mt-3 overflow-x-auto rounded-[10px] bg-[#f8fafc] p-4 text-[12px] leading-6 text-[#334155]">
                {prettyJson(profileMe)}
              </pre>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <section className="rounded-[10px] border border-[#edf1f7] bg-white p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">Register</p>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em]">Creer un compte local</h2>
              <div className="mt-5 grid gap-3">
                <input
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="email"
                  className="h-12 rounded-[10px] border border-[#dce5f2] px-4 text-[14px] outline-none focus:border-[#2b6fff]"
                />
                <input
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="mot de passe"
                  type="password"
                  className="h-12 rounded-[10px] border border-[#dce5f2] px-4 text-[14px] outline-none focus:border-[#2b6fff]"
                />
                <input
                  value={registerForm.displayName}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="display name"
                  className="h-12 rounded-[10px] border border-[#dce5f2] px-4 text-[14px] outline-none focus:border-[#2b6fff]"
                />
                <input
                  value={registerForm.username}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="username"
                  className="h-12 rounded-[10px] border border-[#dce5f2] px-4 text-[14px] outline-none focus:border-[#2b6fff]"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  void runAction("register", async () => {
                    const response = await fetch("/api/auth/register", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(registerForm),
                    });
                    const payload = await readJson(response);
                    setSession(payload);
                    setLoginForm((current) => ({
                      ...current,
                      email: registerForm.email,
                      password: registerForm.password,
                    }));
                    setFeedback(response.ok ? "Compte cree et session ouverte." : (payload.message ?? "Register impossible."));
                  })
                }
                className="mt-5 h-12 rounded-[10px] bg-[#2b6fff] px-4 text-[14px] font-semibold text-white hover:opacity-95"
              >
                {busyAction === "register" ? "Creation..." : "Register"}
              </button>
            </section>

            <section className="rounded-[10px] border border-[#edf1f7] bg-white p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">Login</p>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em]">Connexion locale</h2>
              <div className="mt-5 grid gap-3">
                <input
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="email"
                  className="h-12 rounded-[10px] border border-[#dce5f2] px-4 text-[14px] outline-none focus:border-[#2b6fff]"
                />
                <input
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="mot de passe"
                  type="password"
                  className="h-12 rounded-[10px] border border-[#dce5f2] px-4 text-[14px] outline-none focus:border-[#2b6fff]"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  void runAction("login", async () => {
                    const response = await fetch("/api/auth/login", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(loginForm),
                    });
                    const payload = await readJson(response);
                    setSession(payload);
                    setFeedback(response.ok ? "Connexion reussie." : (payload.message ?? "Login impossible."));
                  })
                }
                className="mt-5 h-12 rounded-[10px] bg-[#101522] px-4 text-[14px] font-semibold text-white hover:opacity-95"
              >
                {busyAction === "login" ? "Connexion..." : "Login"}
              </button>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
