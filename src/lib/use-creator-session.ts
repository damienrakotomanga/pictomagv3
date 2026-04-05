"use client";

import { useEffect, useState } from "react";

export type CreatorSessionPayload = {
  authenticated?: boolean;
  message?: string;
  user?: {
    id?: string;
    email?: string | null;
    role?: string;
    authMode?: string;
    createdAt?: number;
    updatedAt?: number;
    lastLoginAt?: number | null;
  };
  profile?: {
    userId: string;
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    websiteUrl: string | null;
    onboardingCompletedAt?: number | null;
  };
};

export type CreatorSessionStatus =
  | "loading"
  | "anonymous"
  | "authenticated_not_onboarded"
  | "authenticated_ready"
  | "error";

export type CreatorSessionState = {
  status: CreatorSessionStatus;
  payload: CreatorSessionPayload | null;
  errorMessage: string | null;
};

const anonymousSessionState: CreatorSessionState = {
  status: "anonymous",
  payload: null,
  errorMessage: null,
};

function getSessionStatus(payload: CreatorSessionPayload | null): CreatorSessionStatus {
  if (!payload?.authenticated || !payload.user?.id || !payload.profile) {
    return "anonymous";
  }

  return payload.profile.onboardingCompletedAt ? "authenticated_ready" : "authenticated_not_onboarded";
}

export function useCreatorSession(options: { enabled?: boolean } = {}): CreatorSessionState {
  const { enabled = true } = options;
  const [state, setState] = useState<CreatorSessionState>({
    status: enabled ? "loading" : "anonymous",
    payload: null,
    errorMessage: null,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/profile/me", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          setState({
            status: "anonymous",
            payload: null,
            errorMessage: null,
          });
          return;
        }

        if (!response.ok) {
          setState({
            status: "error",
            payload: null,
            errorMessage: "Impossible de verifier votre session pour le moment.",
          });
          return;
        }

        const payload = (await response.json()) as CreatorSessionPayload;
        if (cancelled) {
          return;
        }

        setState({
          status: getSessionStatus(payload),
          payload,
          errorMessage: null,
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            payload: null,
            errorMessage: "Impossible de verifier votre session pour le moment.",
          });
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? state : anonymousSessionState;
}
