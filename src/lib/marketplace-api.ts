"use client";

import type { GigCreationDraft } from "@/components/marketplace-gig-creator";
import type { ProjectOrder, ServiceGig } from "@/lib/marketplace-data";

export type MarketplaceConversationRecord = {
  id: number;
  participant: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    id: number;
    body: string;
    createdAt: number;
    senderUserId: string;
  } | null;
  updatedAt: number;
};

export type MarketplaceMessageRecord = {
  id: number;
  conversationId: number;
  body: string;
  createdAt: number;
  sender: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

type MarketplaceApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

async function requestMarketplaceApi<T>(
  input: string,
  init?: RequestInit,
): Promise<MarketplaceApiResult<T>> {
  try {
    const response = await fetch(input, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload =
      contentType.includes("application/json")
        ? ((await response.json()) as Record<string, unknown>)
        : null;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          (payload?.message as string | undefined) ??
          `Erreur API (${response.status}).`,
      };
    }

    return {
      ok: true,
      data: payload as T,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Erreur reseau. Reessaie dans quelques secondes.",
    };
  }
}

export function readMarketplaceGigs({
  seller,
  limit,
}: {
  seller?: string;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (seller) {
    params.set("seller", seller);
  }
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  const query = params.toString();
  return requestMarketplaceApi<{ gigs: ServiceGig[] }>(`/api/gigs${query ? `?${query}` : ""}`);
}

export function readMarketplaceGig(gigId: number) {
  return requestMarketplaceApi<{ gig: ServiceGig }>(`/api/gigs/${gigId}`);
}

export function createMarketplaceGig(draft: GigCreationDraft) {
  return requestMarketplaceApi<{ gig: ServiceGig }>("/api/gigs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ draft }),
  });
}

export function readMarketplaceOrders() {
  return requestMarketplaceApi<{ orders: ProjectOrder[] }>("/api/orders");
}

export function createMarketplaceOrder({
  gigId,
  packageId,
  brief,
  totalBudget,
}: {
  gigId: number;
  packageId: string;
  brief: string;
  totalBudget?: number;
}) {
  return requestMarketplaceApi<{ order: ProjectOrder }>("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      gigId,
      packageId,
      brief,
      totalBudget,
    }),
  });
}

export function patchMarketplaceOrder({
  orderId,
  action,
}: {
  orderId: number;
  action: "advanceStage" | "releasePayment";
}) {
  return requestMarketplaceApi<{ order: ProjectOrder }>("/api/orders", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId,
      action,
    }),
  });
}

export function readMarketplaceConversations() {
  return requestMarketplaceApi<{ conversations: MarketplaceConversationRecord[] }>(
    "/api/conversations",
  );
}

export function openMarketplaceConversation(participantIdentifier: string) {
  return requestMarketplaceApi<{ conversation: MarketplaceConversationRecord }>(
    "/api/conversations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ participantIdentifier }),
    },
  );
}

export function readMarketplaceMessages(conversationId: number) {
  return requestMarketplaceApi<{ messages: MarketplaceMessageRecord[] }>(
    `/api/messages?conversationId=${conversationId}`,
  );
}

export function sendMarketplaceMessage({
  conversationId,
  body,
}: {
  conversationId: number;
  body: string;
}) {
  return requestMarketplaceApi<{ message: MarketplaceMessageRecord }>("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      body,
    }),
  });
}
