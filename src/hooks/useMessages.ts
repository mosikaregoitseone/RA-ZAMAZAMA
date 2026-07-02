// src/hooks/useMessages.ts

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchConversations,
  fetchMessages,
  sendMessage as sendMessageService,
  createConversation,
  getOrCreateConversation,
} from '../services/messageService';
import type { Conversation, Message } from '../types';

export interface UseMessagesReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  messageLoading: boolean;
  error: Error | null;
  selectConversation: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
  createNewConversation: (
    buyerId: string,
    sellerId: string,
    listingId: string
  ) => Promise<Conversation>;
  getOrCreateConversation: (
    buyerId: string,
    sellerId: string,
    listingId: string
  ) => Promise<Conversation>;
  refetch: () => Promise<void>;
}

const useMessages = (userId: string): UseMessagesReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch conversations
      const convos = await fetchConversations(userId);
      setConversations(convos);

      // If we have an active conversation, fetch messages
      if (activeConversation) {
        setMessageLoading(true);
        try {
          const msgs = await fetchMessages(activeConversation.id);
          setMessages(msgs);
        } finally {
          setMessageLoading(false);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, activeConversation?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectConversation = useCallback((id: string) => {
    const conversation = conversations.find((c) => c.id === id);
    if (conversation) {
      setActiveConversation(conversation);
    }
  }, [conversations]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeConversation) {
        throw new Error('No active conversation');
      }

      if (!text.trim()) {
        throw new Error('Message cannot be empty');
      }

      try {
        const newMessage = await sendMessageService(
          activeConversation.id,
          userId,
          text
        );
        setMessages((prev) => [...prev, newMessage]);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send');
        setError(error);
        throw error;
      }
    },
    [activeConversation?.id, userId]
  );

  const createNewConversation = useCallback(
    async (buyerId: string, sellerId: string, listingId: string) => {
      try {
        const newConversation = await createConversation(
          buyerId,
          sellerId,
          listingId
        );
        setConversations((prev) => [newConversation, ...prev]);
        return newConversation;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create');
        setError(error);
        throw error;
      }
    },
    []
  );

  const getOrCreateConversationHandler = useCallback(
    async (buyerId: string, sellerId: string, listingId: string) => {
      try {
        const conversation = await getOrCreateConversation(
          buyerId,
          sellerId,
          listingId
        );
        // Update conversations list if new
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversation.id);
          return exists ? prev : [conversation, ...prev];
        });
        return conversation;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get or create');
        setError(error);
        throw error;
      }
    },
    []
  );

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    messageLoading,
    error,
    selectConversation,
    sendMessage,
    createNewConversation,
    getOrCreateConversation: getOrCreateConversationHandler,
    refetch: fetchData,
  };
};

export default useMessages;