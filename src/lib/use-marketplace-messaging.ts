"use client";

import { useCallback, useState } from "react";
import {
  type MarketplaceConversationRecord,
  type MarketplaceMessageRecord,
  openMarketplaceConversation,
  readMarketplaceConversations,
  readMarketplaceMessages,
  sendMarketplaceMessage,
} from "@/lib/marketplace-api";

type ConversationActionResult = {
  ok: boolean;
  message?: string;
};

function sortConversations(conversations: MarketplaceConversationRecord[]) {
  return [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function useMarketplaceMessaging() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<MarketplaceConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MarketplaceMessageRecord[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const loadMessages = useCallback(async (conversationId: number) => {
    setLoadingMessages(true);
    setErrorMessage(null);

    const result = await readMarketplaceMessages(conversationId);
    if (!result.ok) {
      setRequiresAuth(result.status === 401);
      setMessages([]);
      setLoadingMessages(false);
      setErrorMessage(result.message);
      return false;
    }

    setMessages(result.data.messages);
    setLoadingMessages(false);
    return true;
  }, []);

  const loadConversations = useCallback(
    async ({
      preferredConversationId = null,
      openModal = false,
    }: {
      preferredConversationId?: number | null;
      openModal?: boolean;
    } = {}) => {
      if (openModal) {
        setIsOpen(true);
      }

      setLoadingConversations(true);
      setErrorMessage(null);

      const result = await readMarketplaceConversations();
      if (!result.ok) {
        setRequiresAuth(result.status === 401);
        setConversations([]);
        setMessages([]);
        setActiveConversationId(null);
        setLoadingConversations(false);
        setErrorMessage(result.message);
        return false;
      }

      const nextConversations = sortConversations(result.data.conversations);
      const nextConversationId =
        preferredConversationId && nextConversations.some((item) => item.id === preferredConversationId)
          ? preferredConversationId
          : nextConversations[0]?.id ?? null;

      setRequiresAuth(false);
      setConversations(nextConversations);
      setActiveConversationId(nextConversationId);
      setLoadingConversations(false);

      if (nextConversationId !== null) {
        await loadMessages(nextConversationId);
      } else {
        setMessages([]);
      }

      return true;
    },
    [loadMessages],
  );

  const openConversation = useCallback(
    async (conversationId: number) => {
      setIsOpen(true);
      setActiveConversationId(conversationId);
      return loadMessages(conversationId);
    },
    [loadMessages],
  );

  const openConversationWithParticipant = useCallback(
    async (participantIdentifier: string): Promise<ConversationActionResult> => {
      setIsOpen(true);
      setErrorMessage(null);

      const result = await openMarketplaceConversation(participantIdentifier);
      if (!result.ok) {
        setRequiresAuth(result.status === 401);
        setErrorMessage(result.message);
        return {
          ok: false,
          message: result.message,
        };
      }

      const nextConversation = result.data.conversation;
      setRequiresAuth(false);
      setConversations((current) => {
        const remaining = current.filter((conversation) => conversation.id !== nextConversation.id);
        return sortConversations([nextConversation, ...remaining]);
      });
      setActiveConversationId(nextConversation.id);
      await loadMessages(nextConversation.id);

      return { ok: true };
    },
    [loadMessages],
  );

  const sendMessage = useCallback(async (): Promise<ConversationActionResult> => {
    if (!activeConversationId) {
      return {
        ok: false,
        message: "Conversation introuvable.",
      };
    }

    const body = composerValue.trim();
    if (!body) {
      return {
        ok: false,
        message: "Message vide.",
      };
    }

    setSending(true);
    setErrorMessage(null);

    const result = await sendMarketplaceMessage({
      conversationId: activeConversationId,
      body,
    });

    if (!result.ok) {
      setRequiresAuth(result.status === 401);
      setSending(false);
      setErrorMessage(result.message);
      return {
        ok: false,
        message: result.message,
      };
    }

    const nextMessage = result.data.message;
    setRequiresAuth(false);
    setMessages((current) => [...current, nextMessage]);
    setComposerValue("");
    setSending(false);

    setConversations((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                updatedAt: nextMessage.createdAt,
                lastMessage: {
                  id: nextMessage.id,
                  body: nextMessage.body,
                  createdAt: nextMessage.createdAt,
                  senderUserId: nextMessage.sender.userId,
                },
              }
            : conversation,
        ),
      ),
    );

    return { ok: true };
  }, [activeConversationId, composerValue]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    conversations,
    activeConversationId,
    messages,
    composerValue,
    loadingConversations,
    loadingMessages,
    sending,
    errorMessage,
    requiresAuth,
    setComposerValue,
    loadConversations,
    openConversation,
    openConversationWithParticipant,
    sendMessage,
    close,
  };
}
