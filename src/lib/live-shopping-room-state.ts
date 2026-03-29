import {
  liveShoppingEvents,
  type LiveShoppingChatMessage,
  type LiveShoppingLot,
} from "@/lib/live-shopping-data";

export type LiveShoppingRoomLotState = {
  lotId: string;
  currentBid: number;
  bidCount: number;
  leadingBidder: string | null;
  updatedAt: number;
};

export type LiveShoppingRoomState = {
  eventId: number;
  chat: LiveShoppingChatMessage[];
  lotStates: Record<string, LiveShoppingRoomLotState>;
  updatedAt: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizeChatMessage(value: unknown, fallbackId: number): LiveShoppingChatMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  const idCandidate = asNumber(value.id);
  const id = idCandidate === null ? fallbackId : Math.max(1, Math.trunc(idCandidate));
  const author = asString(value.author)?.trim() ?? "";
  const body = asString(value.body)?.trim() ?? "";

  if (!author || !body) {
    return null;
  }

  const mod = value.mod === true;
  const accent = asString(value.accent)?.trim() ?? undefined;

  return {
    id,
    author,
    body,
    mod,
    accent,
  };
}

function normalizeRoomLotState(value: unknown): LiveShoppingRoomLotState | null {
  if (!isRecord(value)) {
    return null;
  }

  const lotId = asString(value.lotId)?.trim() ?? "";
  const currentBid = asNumber(value.currentBid);
  const bidCount = asNumber(value.bidCount);

  if (!lotId || currentBid === null || bidCount === null) {
    return null;
  }

  return {
    lotId,
    currentBid: Math.max(0, currentBid),
    bidCount: Math.max(0, Math.trunc(bidCount)),
    leadingBidder: asString(value.leadingBidder)?.trim() ?? null,
    updatedAt: Math.max(0, asNumber(value.updatedAt) ?? Date.now()),
  };
}

function buildLotStateFromLots(lots: LiveShoppingLot[]) {
  const next: Record<string, LiveShoppingRoomLotState> = {};
  const now = Date.now();

  for (const lot of lots) {
    if (lot.mode !== "auction") {
      continue;
    }

    const increment = Math.max(1, lot.bidIncrement ?? 1);
    const currentBid = Math.max(0, lot.currentBid ?? lot.price);
    const bidCount = Math.max(0, Math.floor((currentBid - lot.price) / increment));

    next[lot.id] = {
      lotId: lot.id,
      currentBid,
      bidCount,
      leadingBidder: null,
      updatedAt: now,
    };
  }

  return next;
}

export function createLiveShoppingRoomStateSeed(eventId: number): LiveShoppingRoomState {
  const event = liveShoppingEvents.find((entry) => entry.id === eventId) ?? null;
  const now = Date.now();

  if (!event) {
    return {
      eventId,
      chat: [],
      lotStates: {},
      updatedAt: now,
    };
  }

  const chat = event.chat
    .map((message, index) => normalizeChatMessage(message, index + 1))
    .filter((message): message is LiveShoppingChatMessage => message !== null)
    .slice(-160);

  return {
    eventId,
    chat,
    lotStates: buildLotStateFromLots(event.items),
    updatedAt: now,
  };
}

export function normalizeLiveShoppingRoomState(
  value: unknown,
  fallback: LiveShoppingRoomState,
): LiveShoppingRoomState {
  if (!isRecord(value)) {
    return fallback;
  }

  const eventIdCandidate = asNumber(value.eventId);
  const eventId = eventIdCandidate === null ? fallback.eventId : Math.max(1, Math.trunc(eventIdCandidate));
  const chatInput = Array.isArray(value.chat) ? value.chat : fallback.chat;
  const lotStatesInput = isRecord(value.lotStates) ? value.lotStates : fallback.lotStates;

  const chat = chatInput
    .map((message, index) => normalizeChatMessage(message, index + 1))
    .filter((message): message is LiveShoppingChatMessage => message !== null)
    .slice(-200);

  const lotStates: Record<string, LiveShoppingRoomLotState> = {};
  for (const [lotId, stateValue] of Object.entries(lotStatesInput)) {
    const normalized = normalizeRoomLotState(stateValue);
    if (!normalized) {
      continue;
    }

    lotStates[lotId] = normalized;
  }

  return {
    eventId,
    chat,
    lotStates,
    updatedAt: Math.max(0, asNumber(value.updatedAt) ?? fallback.updatedAt),
  };
}

export function appendChatMessageToRoomState({
  state,
  author,
  body,
  mod = false,
  accent,
}: {
  state: LiveShoppingRoomState;
  author: string;
  body: string;
  mod?: boolean;
  accent?: string;
}) {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return state;
  }

  const safeAuthor = author.trim() || "viewer";
  const nextId =
    state.chat.reduce((currentMax, message) => Math.max(currentMax, message.id), 0) + 1;
  const nextMessage: LiveShoppingChatMessage = {
    id: nextId,
    author: safeAuthor,
    body: trimmedBody.slice(0, 320),
    mod,
    accent,
  };

  return {
    ...state,
    chat: [...state.chat, nextMessage].slice(-200),
    updatedAt: Date.now(),
  };
}

export function applyBidToRoomState({
  state,
  lotId,
  amount,
  bidder,
}: {
  state: LiveShoppingRoomState;
  lotId: string;
  amount: number;
  bidder: string;
}) {
  const normalizedLotId = lotId.trim();
  if (!normalizedLotId) {
    return state;
  }

  const now = Date.now();
  const previous = state.lotStates[normalizedLotId];
  const previousBid = previous?.currentBid ?? 0;
  const nextBid = Math.max(previousBid, Math.max(0, amount));
  const didAdvance = nextBid > previousBid;

  const nextLotState: LiveShoppingRoomLotState = {
    lotId: normalizedLotId,
    currentBid: nextBid,
    bidCount: Math.max(0, previous?.bidCount ?? 0) + (didAdvance ? 1 : 0),
    leadingBidder: didAdvance ? bidder : previous?.leadingBidder ?? bidder,
    updatedAt: now,
  };

  return {
    ...state,
    lotStates: {
      ...state.lotStates,
      [normalizedLotId]: nextLotState,
    },
    updatedAt: now,
  };
}
