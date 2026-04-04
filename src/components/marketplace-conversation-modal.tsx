"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { ArrowRight, Loader2, MessageSquareText, X } from "lucide-react";
import type {
  MarketplaceConversationRecord,
  MarketplaceMessageRecord,
} from "@/lib/marketplace-api";
import { resolveProfileAvatarSrc } from "@/lib/profile-avatar";

function formatConversationTime(timestamp: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function MarketplaceConversationModal({
  open,
  conversations,
  activeConversationId,
  messages,
  composerValue,
  loadingConversations,
  loadingMessages,
  sending,
  requiresAuth,
  errorMessage,
  onClose,
  onComposerChange,
  onConversationSelect,
  onSend,
}: {
  open: boolean;
  conversations: MarketplaceConversationRecord[];
  activeConversationId: number | null;
  messages: MarketplaceMessageRecord[];
  composerValue: string;
  loadingConversations: boolean;
  loadingMessages: boolean;
  sending: boolean;
  requiresAuth: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onComposerChange: (value: string) => void;
  onConversationSelect: (conversationId: number) => void;
  onSend: () => void;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  const activeConversation =
    activeConversationId !== null
      ? conversations.find((conversation) => conversation.id === activeConversationId) ?? null
      : null;

  return createPortal(
    <div className="fixed inset-0 z-[280]">
      <button
        type="button"
        aria-label="Fermer la messagerie"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,23,42,0.42)]"
      />

      <div className="absolute left-1/2 top-1/2 flex h-[680px] w-[1080px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
        <aside className="flex w-[320px] flex-col border-r border-black/6 bg-[#fbfcfe]">
          <div className="flex items-center justify-between border-b border-black/6 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Messagerie</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.03em] text-[#101522]">Conversations</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-[#101522]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loadingConversations ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-black/7 bg-white px-4 py-3 text-[14px] text-[#5c6b7d]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des conversations...
              </div>
            ) : null}

            {!loadingConversations && requiresAuth ? (
              <div className="rounded-[10px] border border-[#d7e5ff] bg-[#f7fbff] px-4 py-4 text-[14px] leading-6 text-[#4d5d73]">
                Connecte-toi pour retrouver tes conversations privees.
              </div>
            ) : null}

            {!loadingConversations && !requiresAuth && conversations.length === 0 ? (
              <div className="rounded-[10px] border border-black/7 bg-white px-4 py-4 text-[14px] leading-6 text-[#4d5d73]">
                Aucune conversation pour le moment.
              </div>
            ) : null}

            {!loadingConversations && conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => onConversationSelect(conversation.id)}
                      className={`w-full rounded-[10px] border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-[#cde3ff] bg-[#eef5ff]"
                          : "border-black/7 bg-white hover:border-black/12 hover:bg-[#fbfcfe]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 overflow-hidden rounded-full bg-[#eef4ff] ring-1 ring-black/8">
                          {conversation.participant.avatarUrl ? (
                            <Image
                          src={resolveProfileAvatarSrc(conversation.participant.avatarUrl)}
                              alt={conversation.participant.displayName}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[14px] font-semibold text-[#2b6fff]">
                              {conversation.participant.displayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-[#101522]">
                              {conversation.participant.displayName}
                            </p>
                            <span className="shrink-0 text-[11px] text-[#8ea2bc]">
                              {conversation.lastMessage ? formatConversationTime(conversation.lastMessage.createdAt) : ""}
                            </span>
                          </div>
                          <p className="truncate text-[12px] text-[#6f7d90]">@{conversation.participant.username}</p>
                          <p className="mt-1 truncate text-[13px] text-[#425164]">
                            {conversation.lastMessage?.body ?? "Conversation ouverte."}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-black/6 px-6 py-5">
            {activeConversation ? (
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[#eef4ff] ring-1 ring-black/8">
                  {activeConversation.participant.avatarUrl ? (
                    <Image
                          src={resolveProfileAvatarSrc(activeConversation.participant.avatarUrl)}
                      alt={activeConversation.participant.displayName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[15px] font-semibold text-[#2b6fff]">
                      {activeConversation.participant.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[18px] font-medium tracking-[-0.03em] text-[#101522]">
                    {activeConversation.participant.displayName}
                  </p>
                  <p className="text-[13px] text-[#7f8a9a]">@{activeConversation.participant.username}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[18px] font-medium tracking-[-0.03em] text-[#101522]">Discussion privee</p>
                <p className="text-[13px] text-[#7f8a9a]">Choisis une conversation pour lire et repondre.</p>
              </div>
            )}

            <div className="rounded-full border border-black/8 bg-[#f8fafc] px-4 py-2 text-[12px] font-medium text-[#536173]">
              Persistant via SQLite
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loadingMessages ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3 text-[14px] text-[#5c6b7d]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des messages...
              </div>
            ) : null}

            {!loadingMessages && activeConversation && messages.length === 0 ? (
              <div className="rounded-[10px] border border-black/7 bg-[#f8fafc] px-5 py-5 text-[14px] leading-6 text-[#536173]">
                Conversation ouverte. Tu peux envoyer le premier message.
              </div>
            ) : null}

            {!loadingMessages && !activeConversation ? (
              <div className="flex h-full min-h-[360px] items-center justify-center rounded-[10px] border border-dashed border-black/10 bg-[#fbfcfe] px-8 text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff] text-[#2b6fff]">
                    <MessageSquareText className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-[17px] font-medium tracking-[-0.02em] text-[#101522]">Choisis une conversation</p>
                  <p className="mt-2 text-[14px] leading-6 text-[#607085]">
                    Les messages marketplace sont maintenant persistés et relisibles entre deux utilisateurs.
                  </p>
                </div>
              </div>
            ) : null}

            {!loadingMessages && activeConversation && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isParticipant = message.sender.userId === activeConversation.participant.userId;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isParticipant ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[72%] rounded-[10px] px-4 py-3 ${
                          isParticipant
                            ? "border border-black/7 bg-[#f8fafc] text-[#101522]"
                            : "bg-[#2b6fff] text-white"
                        }`}
                      >
                        <p className="text-[12px] font-semibold">
                          {message.sender.displayName}
                        </p>
                        <p className="mt-1 text-[14px] leading-6">{message.body}</p>
                        <p className={`mt-2 text-[11px] ${isParticipant ? "text-[#7e8999]" : "text-white/74"}`}>
                          {formatConversationTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="border-t border-black/6 px-6 py-5">
            {errorMessage ? (
              <div className="mb-4 rounded-[10px] border border-[#ffd7d7] bg-[#fff7f7] px-4 py-3 text-[13px] text-[#9a4242]">
                {errorMessage}
              </div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void onSend();
              }}
              className="flex items-center gap-3"
            >
              <input
                value={composerValue}
                onChange={(event) => onComposerChange(event.target.value)}
                placeholder={
                  activeConversation
                    ? "Ecris un message prive..."
                    : "Choisis d abord une conversation"
                }
                disabled={!activeConversation || sending || requiresAuth}
                className="h-12 flex-1 rounded-full border border-black/8 bg-[#f8fafc] px-5 text-[14px] text-[#101522] outline-none placeholder:text-[#9aa6b7] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!activeConversation || sending || composerValue.trim().length === 0 || requiresAuth}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#101522] px-5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Envoyer
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
