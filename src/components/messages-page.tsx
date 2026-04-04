"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Link2,
  Loader2,
  MessageSquareText,
  Mic,
  MoreVertical,
  PanelRightOpen,
  PencilLine,
  Phone,
  Search,
  SendHorizontal,
  Smile,
  Video,
} from "lucide-react";
import type { MarketplaceMessageRecord } from "@/lib/marketplace-api";
import { resolveProfileAvatarSrc } from "@/lib/profile-avatar";
import { useMarketplaceMessaging } from "@/lib/use-marketplace-messaging";
import type { PublicProfileBundle } from "@/lib/posts";

function formatConversationTime(timestamp: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatPanelDate(timestamp: number | null) {
  if (!timestamp) {
    return "Aucune activite";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(timestamp);
}

function isSameCalendarDay(left: number, right: number) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function getMessageDayLabel(timestamp: number) {
  const now = Date.now();
  if (isSameCalendarDay(timestamp, now)) {
    return "Aujourd'hui";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(timestamp, yesterday.getTime())) {
    return "Hier";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(timestamp);
}

function groupMessagesByDay(messages: MarketplaceMessageRecord[]) {
  const groups: Array<{ label: string; items: MarketplaceMessageRecord[] }> = [];

  for (const message of messages) {
    const label = getMessageDayLabel(message.createdAt);
    const previousGroup = groups[groups.length - 1];

    if (previousGroup?.label === label) {
      previousGroup.items.push(message);
      continue;
    }

    groups.push({ label, items: [message] });
  }

  return groups;
}

function deriveMediaStrip(bundle: PublicProfileBundle | null) {
  if (!bundle) {
    return [];
  }

  const seen = new Set<string>();
  const items: Array<{ id: string; src: string; alt: string }> = [];

  for (const post of bundle.posts) {
    for (const media of post.media) {
      const previewSrc = media.posterSrc ?? media.src;
      if (!previewSrc || seen.has(previewSrc)) {
        continue;
      }

      seen.add(previewSrc);
      items.push({
        id: `${post.id}-${media.id}`,
        src: previewSrc,
        alt: media.altText || post.title || bundle.profile.displayName,
      });

      if (items.length === 6) {
        return items;
      }
    }
  }

  return items;
}

function getInitial(value: string) {
  return value.slice(0, 1).toUpperCase();
}

export function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionAuthenticated, setSessionAuthenticated] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "recent" | "active">("all");
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [infoPanelOpen] = useState(true);
  const [profileBundle, setProfileBundle] = useState<PublicProfileBundle | null>(null);
  const [loadingProfileBundle, setLoadingProfileBundle] = useState(false);
  const [surfaceNotice, setSurfaceNotice] = useState<string | null>(null);
  const messaging = useMarketplaceMessaging();
  const {
    activeConversationId,
    composerValue,
    conversations,
    errorMessage,
    loadingConversations,
    loadingMessages,
    messages,
    openConversation,
    openConversationWithParticipant,
    loadConversations,
    requiresAuth,
    sending,
    setComposerValue,
    sendMessage,
  } = messaging;

  const conversationId = useMemo(() => {
    const raw = searchParams.get("conversationId");
    if (!raw) {
      return null;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const participantIdentifier = useMemo(() => {
    const raw = searchParams.get("with")?.trim();
    return raw && raw.length > 0 ? raw : null;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setSessionAuthenticated(false);
          }
          return;
        }

        const payload = (await response.json()) as { authenticated?: boolean };
        if (!cancelled) {
          setSessionAuthenticated(payload.authenticated === true);
        }
      } catch {
        if (!cancelled) {
          setSessionAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setSessionChecked(true);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionChecked || !sessionAuthenticated) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      if (participantIdentifier) {
        const result = await openConversationWithParticipant(participantIdentifier);

        if (cancelled) {
          return;
        }

        if (result.ok && result.conversationId) {
          router.replace(`/messages?conversationId=${result.conversationId}`);
          return;
        }
      }

      await loadConversations({
        preferredConversationId: conversationId,
      });
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    conversationId,
    loadConversations,
    openConversationWithParticipant,
    participantIdentifier,
    router,
    sessionAuthenticated,
    sessionChecked,
  ]);

  const showRequiresAuth = sessionChecked && (!sessionAuthenticated || requiresAuth);

  const activeConversation =
    activeConversationId !== null
      ? conversations.find((conversation) => conversation.id === activeConversationId) ?? null
      : null;

  const activeConversationProfileHref = activeConversation
    ? `/u/${activeConversation.participant.username}`
    : null;

  const filteredConversations = useMemo(() => {
    const now = Date.now();
    const needle = searchValue.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const passesFilter =
        listFilter === "all"
          ? true
          : listFilter === "recent"
            ? now - conversation.updatedAt < 1000 * 60 * 60 * 24 * 7
            : conversation.lastMessage !== null;

      if (!passesFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const haystack = [
        conversation.participant.displayName,
        conversation.participant.username,
        conversation.lastMessage?.body ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [conversations, listFilter, searchValue]);

  const groupedMessages = useMemo(() => groupMessagesByDay(messages), [messages]);
  const conversationCreatedAt = messages[0]?.createdAt ?? activeConversation?.updatedAt ?? null;
  const conversationLastActivityAt =
    messages[messages.length - 1]?.createdAt ?? activeConversation?.updatedAt ?? null;
  const participantMedia = useMemo(() => deriveMediaStrip(profileBundle), [profileBundle]);
  const pinnedConversationIds = useMemo(
    () => (activeConversation ? new Set([activeConversation.id]) : new Set<number>()),
    [activeConversation],
  );
  const pinnedConversations = useMemo(
    () => filteredConversations.filter((conversation) => pinnedConversationIds.has(conversation.id)),
    [filteredConversations, pinnedConversationIds],
  );
  const regularConversations = useMemo(
    () => filteredConversations.filter((conversation) => !pinnedConversationIds.has(conversation.id)),
    [filteredConversations, pinnedConversationIds],
  );
  const participantStatusLabel = useMemo(() => {
    if (!conversationLastActivityAt) {
      return "Historique disponible";
    }

    const delta = Date.now() - conversationLastActivityAt;
    if (delta < 1000 * 60 * 60 * 24) {
      return "Actif recemment";
    }

    return "Reprise possible a tout moment";
  }, [conversationLastActivityAt]);

  useEffect(() => {
    if (!activeConversation) {
      setProfileBundle(null);
      return;
    }

    let cancelled = false;

    const loadProfileBundle = async () => {
      setLoadingProfileBundle(true);

      try {
        const response = await fetch(
          `/api/profile/${encodeURIComponent(activeConversation.participant.userId)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );

        if (!response.ok) {
          throw new Error("Impossible de charger ce profil.");
        }

        const payload = (await response.json()) as PublicProfileBundle;
        if (!cancelled) {
          setProfileBundle(payload);
        }
      } catch {
        if (!cancelled) {
          setProfileBundle(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingProfileBundle(false);
        }
      }
    };

    void loadProfileBundle();

    return () => {
      cancelled = true;
    };
  }, [activeConversation]);

  useEffect(() => {
    if (!surfaceNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSurfaceNotice(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [surfaceNotice]);

  const handleOpenActiveProfile = useCallback(() => {
    if (!activeConversationProfileHref) {
      return;
    }

    router.push(activeConversationProfileHref);
  }, [activeConversationProfileHref, router]);

  const handleCopyActiveProfile = useCallback(async () => {
    if (!activeConversationProfileHref || typeof window === "undefined") {
      return;
    }

    const absoluteUrl = `${window.location.origin}${activeConversationProfileHref}`;

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setSurfaceNotice("Lien du profil copie.");
    } catch {
      setSurfaceNotice("Copie impossible pour le moment.");
    }
  }, [activeConversationProfileHref]);

  const handleConversationSelect = (nextConversationId: number) => {
    router.replace(`/messages?conversationId=${nextConversationId}`);
    void openConversation(nextConversationId);
  };

  const renderConversationList = (
    items: typeof conversations,
    sectionLabel: string,
    count: number,
    options?: {
      emptyMessage?: string;
      emptyActionLabel?: string;
      onEmptyAction?: () => void;
    },
  ) => {
    return (
      <div>
        <div className="type-kicker-tight mb-3 flex items-center justify-between px-1 text-[#71717a]">
          <span>{sectionLabel}</span>
          <span>{count}</span>
        </div>

        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((conversation) => {
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleConversationSelect(conversation.id)}
                  className="w-full rounded-[14px] px-3 py-3 text-left transition hover:bg-[#f5f5f7]"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#f1f1f3]">
                      {conversation.participant.avatarUrl ? (
                        <Image
                          src={resolveProfileAvatarSrc(conversation.participant.avatarUrl)}
                          alt={conversation.participant.displayName}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[14px] font-semibold text-[#111827]">
                          {getInitial(conversation.participant.displayName)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium leading-[1.2] tracking-[-0.01em] text-[#0f172a]">
                            {conversation.participant.displayName}
                          </p>
                          <p className="mt-1 truncate text-[11px] leading-none text-[#71717a]">
                            {conversation.lastMessage
                              ? formatConversationTime(conversation.lastMessage.createdAt)
                              : "Historique disponible"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-1 text-[13px] leading-5 text-[#334155]">
                        {conversation.lastMessage?.body ?? "Conversation ouverte."}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#e4e4e7] bg-[#fafafa] px-4 py-4">
            <p className="text-[12px] leading-6 text-[#52525b]">
              {options?.emptyMessage ?? "Aucune conversation dans cette section pour le moment."}
            </p>
            {options?.emptyActionLabel && options.onEmptyAction ? (
              <button
                type="button"
                onClick={options.onEmptyAction}
                className="mt-3 rounded-full border border-[#e4e4e7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3f3f46] transition hover:bg-[#f4f4f5]"
              >
                {options.emptyActionLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-hidden overflow-y-hidden bg-white text-[#101522]">
      <main className="h-screen w-full overflow-hidden px-0 pb-3 pt-[84px]">

        {surfaceNotice ? (
          <div className="fixed left-1/2 top-5 z-[160] -translate-x-1/2 rounded-full border border-[#e4e4e7] bg-white px-4 py-2 text-[12px] font-medium text-[#111827] shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
            {surfaceNotice}
          </div>
        ) : null}

        {showRequiresAuth ? (
          <section className="h-[calc(100vh-96px)] overflow-hidden border border-[#ece3e3] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)]">
            <div className="grid h-full grid-cols-[290px,minmax(0,1fr)]">
              <aside className="border-r border-[#e4e4e7] bg-[#ffffff] px-6 py-6">
                <div className="flex items-center justify-between text-[13px] text-[#52525b]">
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4" />
                    <span>Chats / All</span>
                  </div>
                  <span>{conversations.length}</span>
                </div>
                <h1 className="type-title-page mt-8 text-[#17171b]">
                  Chats
                </h1>
                <p className="mt-3 max-w-[240px] text-[14px] leading-7 text-[#52525b]">
                  Connecte-toi pour retrouver tes conversations dans une vraie page de messagerie.
                </p>
              </aside>

              <div className="flex flex-col items-start justify-center px-14 py-14">
                <p className="type-kicker text-[#71717a]">
                  Connexion requise
                </p>
                <h2 className="type-title-hero mt-4 max-w-[620px] text-[#17171b]">
                  Entre dans tes conversations privees.
                </h2>
                <p className="type-body-md mt-5 max-w-[620px] text-[#52525b]">
                  La messagerie garde l&apos;historique, ouvre les profils publics et permet de reprendre un
                  echange sans quitter le coeur du produit.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="type-button rounded-full bg-[#17171b] px-6 py-3 text-white transition hover:bg-[#24242c]"
                  >
                    Se connecter
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/signup")}
                    className="type-button rounded-full border border-[#e4e4e7] px-6 py-3 text-[#17171b] transition hover:bg-[#f4f4f5]"
                  >
                    Creer un compte
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section
            className={`relative h-[calc(100vh-96px)] overflow-hidden rounded-[14px] bg-white ${
              infoPanelOpen
                ? "grid h-full grid-cols-[320px_minmax(780px,1fr)_300px]"
                : "grid h-full grid-cols-[320px_minmax(780px,1fr)]"
            }`}
          >
            <aside className="flex min-h-0 flex-col bg-white">
              <div className="flex h-[74px] items-center justify-between px-6 text-[13px] text-[#52525b]">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4" />
                  <span>Chats / All</span>
                </div>
                <span>{conversations.length}</span>
              </div>

              <div className="mx-3 mb-4 flex-1 overflow-y-auto rounded-[14px] border border-[#e4e4e7] px-6 pb-6">
                <div className="flex items-center justify-between gap-3 pb-5 pt-3">
                  <h1 className="type-title-page text-[#17171b]">
                    Chats
                  </h1>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/compose")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e4e7] bg-white text-[#3f3f46] transition hover:bg-[#fafafa]"
                      aria-label="Nouveau post"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchOpen((current) => !current)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e4e7] bg-white text-[#3f3f46] transition hover:bg-[#fafafa]"
                      aria-label="Recherche"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-5 border-b border-[#e4e4e7] pb-3 text-[13px] font-medium text-[#71717a]">
                  {[
                    { id: "all", label: "All Chats" },
                    { id: "recent", label: "Personal" },
                    { id: "active", label: "Groups" },
                  ].map((item) => {
                    const active = listFilter === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setListFilter(item.id as "all" | "recent" | "active")}
                        className={`border-b-2 px-0.5 pb-1 pt-1 transition ${
                          active
                            ? "border-[#17171b] text-[#17171b]"
                            : "border-transparent hover:text-[#17171b]"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {searchOpen ? (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 rounded-full border border-[#e4e4e7] bg-[#fafafa] px-4 py-2.5">
                      <Search className="h-4 w-4 text-[#71717a]" />
                      <input
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search chats"
                        className="w-full bg-transparent text-[13px] text-[#17171b] outline-none placeholder:text-[#a1a1aa]"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-7">
                  {loadingConversations ? (
                    <div className="flex items-center gap-2 rounded-[18px] bg-[#fafafa] px-4 py-3 text-[14px] text-[#52525b]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des conversations...
                    </div>
                  ) : null}

                  {!loadingConversations && filteredConversations.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[#e4e4e7] bg-[#fafafa] px-4 py-4 text-[14px] leading-6 text-[#52525b]">
                      Aucune conversation pour ce filtre. Ouvre un profil public pour commencer.
                    </div>
                  ) : null}

                  {!loadingConversations && filteredConversations.length > 0 ? (
                    <div className="space-y-6">
                      {renderConversationList(pinnedConversations, "Pinned Chats", pinnedConversations.length)}
                      {renderConversationList(regularConversations, "General Chats", regularConversations.length, {
                        emptyMessage: "Pas encore de conversation generale. Ouvre un profil public pour lancer un nouvel echange.",
                        emptyActionLabel: "Explorer les profils",
                        onEmptyAction: () => router.push("/"),
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>
            <section className="flex min-w-0 flex-col bg-white">
                <div className="flex h-[74px] items-center justify-between gap-4 px-8">
                    {activeConversation ? (
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[#e4e4e7] bg-[#f4f4f5]">
                          {activeConversation.participant.avatarUrl ? (
                            <Image
                              src={resolveProfileAvatarSrc(activeConversation.participant.avatarUrl)}
                              alt={activeConversation.participant.displayName}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
              <div className="flex h-full w-full items-center justify-center text-[16px] font-medium tracking-[-0.01em] text-[#111827]">
                              {getInitial(activeConversation.participant.displayName)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] font-medium tracking-[-0.01em] text-[#17171b]">
                              {activeConversation.participant.displayName}
                            </p>
                            <span className="inline-flex h-2 w-2 rounded-full bg-[#17171b]" />
                          </div>
                          <p className="mt-1 text-[11px] text-[#71717a]">{participantStatusLabel}</p>
                          <p className="sr-only">
                            @{activeConversation.participant.username} · {participantStatusLabel}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[18px] font-medium tracking-[-0.01em] text-[#17171b]">
                          Selectionne une conversation
                        </p>
                        <p className="mt-1 text-[12px] text-[#71717a]">
                          Le thread apparaitra ici.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSurfaceNotice("Appels vocaux bientot disponibles.")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e4e7] bg-white text-[#3f3f46] transition hover:bg-[#fafafa]"
                        aria-label="Appel"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSurfaceNotice("Visio bientot disponible.")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e4e7] bg-white text-[#3f3f46] transition hover:bg-[#fafafa]"
                        aria-label="Video"
                      >
                        <Video className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSurfaceNotice("Plus d'actions conversation arrivent bientot.")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e4e7] bg-white text-[#3f3f46] transition hover:bg-[#fafafa]"
                        aria-label="Plus d'actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                </div>

                <div className="mx-2 mb-2 flex min-h-0 flex-1 flex-col rounded-[14px] border border-[#e4e4e7]">
                <div className="flex-1 overflow-y-auto px-9 py-7">
                  <div className="mx-auto flex w-full max-w-[900px] flex-col">
                    {loadingMessages ? (
                      <div className="flex items-center gap-2 rounded-[18px] bg-[#fafafa] px-4 py-3 text-[14px] text-[#52525b]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement des messages...
                      </div>
                    ) : null}

                    {!loadingMessages && !activeConversation ? (
                      <div className="flex min-h-[480px] items-center justify-center px-8 text-center">
                        <div className="max-w-[420px]">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f4f5] text-[#111827]">
                            <MessageSquareText className="h-6 w-6" />
                          </div>
                          <p className="mt-5 text-[22px] font-medium tracking-[-0.035em] text-[#17171b]">
                            Choisis une conversation
                          </p>
                          <p className="mt-2 text-[14px] leading-7 text-[#52525b]">
                            Ta zone centrale devient le vrai thread prive des que tu selectionnes un contact.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {!loadingMessages && activeConversation && groupedMessages.length === 0 ? (
                      <div className="rounded-[22px] bg-[#fafafa] px-6 py-6 text-[14px] leading-7 text-[#52525b] shadow-[0_12px_32px_rgba(15,23,42,0.03)]">
                        Conversation ouverte. Tu peux envoyer le premier message.
                      </div>
                    ) : null}

                    {!loadingMessages && activeConversation && groupedMessages.length > 0 ? (
                      <div className="space-y-8">
                        {groupedMessages.map((group) => (
                          <div key={group.label}>
                            <div className="mb-6 flex items-center justify-center">
                              <p className="px-2 py-0.5 text-[11px] font-medium tracking-[0.01em] text-[#71717a]">
                                {group.label}
                              </p>
                            </div>

                            <div className="space-y-6">
                              {group.items.map((message) => {
                                const isParticipant =
                                  message.sender.userId === activeConversation.participant.userId;

                                return (
                                  <div
                                    key={message.id}
                                    className={`flex ${isParticipant ? "justify-start" : "justify-end"}`}
                                  >
                                    <div className={`flex max-w-[72%] gap-3 ${isParticipant ? "items-start" : "items-end"}`}>
                                      {isParticipant ? (
                                        <div className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#e4e4e7] bg-[#f4f4f5]">
                                          {activeConversation.participant.avatarUrl ? (
                                            <Image
                                              src={resolveProfileAvatarSrc(activeConversation.participant.avatarUrl)}
                                              alt={activeConversation.participant.displayName}
                                              fill
                                              sizes="36px"
                                              className="object-cover"
                                            />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-[#111827]">
                                              {getInitial(activeConversation.participant.displayName)}
                                            </div>
                                          )}
                                        </div>
                                      ) : null}

                                      <div className={`${isParticipant ? "" : "items-end"} flex flex-col`}>
                                        {isParticipant ? (
                                          <>
                                            <div className="flex items-center gap-2">
                                              <p className="text-[13px] font-medium tracking-[-0.01em] text-[#17171b]">
                                                {message.sender.displayName}
                                              </p>
                                              <span className="text-[10px] text-[#71717a]">
                                                {formatMessageTime(message.createdAt)}
                                              </span>
                                            </div>
                                            <div className="mt-2 max-w-[540px] rounded-[16px] border border-[#e4e4e7] bg-[#fafafa] px-4 py-3">
                                              <p className="text-[13px] leading-6 text-[#18181b]">{message.body}</p>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="mb-2 flex items-center gap-2 text-[11px] text-[#71717a]">
                                              <span className="font-medium text-[#3f3f46]">You</span>
                                              <span>{formatMessageTime(message.createdAt)}</span>
                                            </div>
                                            <div className="rounded-[16px] bg-[#17171b] px-4 py-3 text-white">
                                              <p className="text-[13px] font-medium leading-6">{message.body}</p>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="bg-white px-9 py-4">
                  {errorMessage ? (
                    <div className="mx-auto mb-4 w-full max-w-[780px] rounded-[16px] border border-[#ffd7d7] bg-[#fff7f7] px-4 py-3 text-[13px] text-[#9a4242]">
                      {errorMessage}
                    </div>
                  ) : null}

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendMessage();
                    }}
                    className="mx-auto w-full max-w-[900px]"
                  >
                    <div className="flex items-center gap-2.5 rounded-full border border-[#e4e4e7] bg-[#fafafa] px-3 py-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#52525b]">
                        <Smile className="h-4 w-4" />
                      </div>
                      <input
                        value={composerValue}
                        onChange={(event) => setComposerValue(event.target.value)}
                        placeholder={
                          activeConversation
                            ? "Ecris un message..."
                            : "Choisis d'abord une conversation"
                        }
                        disabled={!activeConversation || sending || requiresAuth}
                        className="h-11 flex-1 bg-transparent text-[14px] text-[#17171b] outline-none placeholder:text-[#a1a1aa] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setSurfaceNotice("Messages vocaux bientot disponibles.")}
                        disabled={!activeConversation}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#52525b] transition hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Microphone"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyActiveProfile()}
                        disabled={!activeConversation}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#52525b] transition hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Copier le profil"
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                      <button
                        type="submit"
                        disabled={
                          !activeConversation ||
                          sending ||
                          composerValue.trim().length === 0 ||
                          requiresAuth
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#17171b] text-white transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Envoyer"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SendHorizontal className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </form>
                </div>
                </div>
              </section>
              {infoPanelOpen ? (
                <aside className="flex min-h-0 flex-col bg-white">
                  <div className="flex h-[74px] items-center justify-start gap-3 px-6">
                    <p className="text-[15px] font-medium tracking-[-0.01em] text-[#17171b]">Details</p>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    {activeConversation ? (
                      <>
                        <div className="flex flex-col items-center text-center">
                          <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[#e4e4e7] bg-[#f4f4f5]">
                            {activeConversation.participant.avatarUrl ? (
                              <Image
                                src={resolveProfileAvatarSrc(activeConversation.participant.avatarUrl)}
                                alt={activeConversation.participant.displayName}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            ) : (
              <div className="flex h-full w-full items-center justify-center text-[20px] font-medium tracking-[-0.02em] text-[#111827]">
                                {getInitial(activeConversation.participant.displayName)}
                              </div>
                            )}
                          </div>
                          <p className="mt-5 text-[30px] font-medium tracking-[-0.045em] text-[#17171b]">
                            {activeConversation.participant.displayName}
                          </p>
                          <p className="mt-2 text-[11px] text-[#71717a]">{participantStatusLabel}</p>
                        </div>

                        <div className="mt-8">
                          <div className="border-b border-[#e4e4e7] px-1 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[13px] font-medium tracking-[-0.01em] text-[#17171b]">Created</p>
                              <span className="text-[11px] text-[#71717a]">
                                {formatPanelDate(conversationCreatedAt)}
                              </span>
                            </div>
                          </div>

                          <div className="border-b border-[#e4e4e7] px-1 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[13px] font-medium tracking-[-0.01em] text-[#17171b]">Description</p>
                                <p className="mt-3 text-[13px] leading-6 text-[#52525b]">
                                  {profileBundle?.profile.bio?.trim() ||
                                    "Conversation privee autour du profil public et des publications visibles."}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleOpenActiveProfile}
                                className="shrink-0 text-[12px] font-medium text-[#52525b] transition hover:text-[#17171b]"
                              >
                                Edit
                              </button>
                            </div>
                          </div>

                          <div className="border-b border-[#e4e4e7] px-1 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[13px] font-medium tracking-[-0.01em] text-[#17171b]">Advanced Chat Privacy</p>
                                <span className="inline-flex h-4 w-8 rounded-full bg-[#e4e4e7] p-[2px]">
                                  <span className="ml-auto h-full w-3 rounded-full bg-[#17171b]" />
                                </span>
                              </div>
                            <p className="mt-3 text-[12px] leading-6 text-[#52525b]">
                              {messages.length} message{messages.length > 1 ? "s" : ""} echange
                              {messages.length > 1 ? "s" : ""}. Derniere activite le{" "}
                              {formatPanelDate(conversationLastActivityAt)}.
                            </p>
                          </div>

                          <div className="border-b border-[#e4e4e7] px-1 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[13px] font-medium tracking-[-0.01em] text-[#17171b]">Notification</p>
                                <span className="inline-flex h-4 w-8 rounded-full bg-[#e4e4e7] p-[2px]">
                                  <span className="ml-auto h-full w-3 rounded-full bg-[#17171b]" />
                                </span>
                              </div>
                          </div>

                          <div className="px-1 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[13px] font-medium tracking-[-0.01em] text-[#17171b]">Media</p>
                              {participantMedia.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={handleOpenActiveProfile}
                                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#52525b] transition hover:text-[#17171b]"
                                >
                                  View all
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>

                            {loadingProfileBundle ? (
                              <p className="mt-3 text-[13px] text-[#71717a]">Chargement...</p>
                            ) : participantMedia.length > 0 ? (
                              <div className="mt-4 grid grid-cols-6 gap-1.5 overflow-hidden">
                                {participantMedia.slice(0, 6).map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={handleOpenActiveProfile}
                                    className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[8px] border border-[#e4e4e7] bg-[#f4f4f5]"
                                  >
                                    <Image
                                      src={item.src}
                                      alt={item.alt}
                                      fill
                                      sizes="40px"
                                      className="object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-[13px] leading-6 text-[#52525b]">
                                Aucun media public a montrer pour le moment.
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full min-h-[420px] items-center justify-center text-center">
                        <div className="max-w-[220px]">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f4f5] text-[#111827]">
                            <PanelRightOpen className="h-5 w-5" />
                          </div>
                          <p className="mt-4 text-[18px] font-medium tracking-[-0.01em] text-[#17171b]">
                            Community Info
                          </p>
                          <p className="mt-2 text-[14px] leading-6 text-[#52525b]">
                            Le profil, la bio et les medias du contact suivent la conversation active.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </aside>
              ) : null}
          </section>
        )}
      </main>
    </div>
  );
}


