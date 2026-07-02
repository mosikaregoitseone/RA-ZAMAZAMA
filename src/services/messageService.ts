// src/services/messageService.ts

import { supabase } from '../lib/supabase';
import type { Message, Conversation, ConversationWithDetails } from '../types';

/**
 * Fetch all conversations for a user
 */
export async function fetchConversations(
  userId: string
): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Conversation[]) || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Fetch single conversation
 */
export async function fetchConversation(
  conversationId: string
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (error) throw error;
    return (data as Conversation) || null;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Fetch messages for a conversation
 */
export async function fetchMessages(
  conversationId: string,
  limit?: number
): Promise<Message[]> {
  try {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as Message[]) || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Fetch messages with pagination
 */
export async function fetchMessagesPaginated(
  conversationId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{
  messages: Message[];
  total: number;
  page: number;
  pageSize: number;
}> {
  try {
    const offset = (page - 1) * pageSize;

    // Get total count
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    // Get paginated data
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    return {
      messages: ((data as Message[]) || []).reverse(),
      total: count || 0,
      page,
      pageSize,
    };
  } catch (error) {
    console.error('Error fetching paginated messages:', error);
    throw error;
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  messageText: string
): Promise<Message> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message: messageText,
        topic: '', // From database schema
        extension: '', // From database schema
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        inserted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Create conversation
 */
export async function createConversation(
  buyerId: string,
  sellerId: string,
  listingId: string
): Promise<Conversation> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        listing_id: listingId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Get or create conversation
 */
export async function getOrCreateConversation(
  buyerId: string,
  sellerId: string,
  listingId: string
): Promise<Conversation> {
  try {
    // Check if conversation already exists
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', buyerId)
      .eq('seller_id', sellerId)
      .eq('listing_id', listingId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found", which is fine
      throw fetchError;
    }

    if (existing) {
      return existing as Conversation;
    }

    // Create new conversation
    return createConversation(buyerId, sellerId, listingId);
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
}

/**
 * Fetch last message in conversation
 */
export async function fetchLastMessage(
  conversationId: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return (data as Message) || null;
  } catch (error) {
    console.error('Error fetching last message:', error);
    throw error;
  }
}

/**
 * Get message count for conversation
 */
export async function getMessageCount(
  conversationId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
}

/**
 * Delete message (soft delete via update)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    // Depending on your schema, you might soft delete
    // For now, we'll do a hard delete
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

/**
 * Update message
 */
export async function updateMessage(
  messageId: string,
  content: string
): Promise<Message> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        message: content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

/**
 * Mark messages as read (if schema supports it)
 */
export async function markMessagesAsRead(
  conversationId: string
): Promise<void> {
  try {
    // This depends on your schema having a read/is_read field
    const { error } = await supabase
      .from('messages')
      .update({ updated_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .is('private', false); // Mark as not private/read

    if (error) {
      // If the operation fails, it might mean the field doesn't exist
      // Log but don't throw
      console.warn('Could not mark messages as read:', error);
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Search messages in conversation
 */
export async function searchMessages(
  conversationId: string,
  query: string
): Promise<Message[]> {
  if (!query || query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .ilike('message', `%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Message[]) || [];
  } catch (error) {
    console.error('Error searching messages:', error);
    throw error;
  }
}

/**
 * Get user's conversations summary (for listing)
 */
export async function getConversationsSummary(
  userId: string
): Promise<Array<Conversation & { lastMessage?: string; timestamp?: string }>> {
  try {
    const conversations = await fetchConversations(userId);

    // For each conversation, get the last message
    const withMessages = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await fetchLastMessage(conv.id);
        return {
          ...conv,
          lastMessage: lastMsg?.message,
          timestamp: lastMsg?.created_at,
        };
      })
    );

    return withMessages;
  } catch (error) {
    console.error('Error getting conversations summary:', error);
    throw error;
  }
}

/**
 * Get unread message count (if schema supports read status)
 */
export async function getUnreadCount(
  conversationId: string,
  userId: string
): Promise<number> {
  try {
    // This depends on your schema having read status tracking
    // For now, return 0 as placeholder
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('private', false); // Assuming false means unread

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}