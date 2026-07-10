'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TransactionQRCode } from '../../../components/TransactionQRCode';
import { MeetupLocationForm } from '../../../components/MeetupLocationForm';

interface ConvSummary {
  id: string;
  other: {
    id: string;
    full_name: string;
    profile_picture_url?: string;
    institution?: string;
    campus?: string;
  } | null;
  listing: { title: string; image_url?: string } | null;
  lastMessage: {
    message: string;
    created_at: string;
    sender_id: string;
  } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  deleted_for: string[];
}

export default function ChatPageClient({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  // Active chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [conv, setConv] = useState<any>(null);
  const [listingPrice, setListingPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Sidebar state
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [search, setSearch] = useState('');

  // ✅ Transaction flow state - SIMPLE!
  const [showMeetupForm, setShowMeetupForm] = useState(false);
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        setCurrentUser(user);

        const [{ data: asBuyer }, { data: asSeller }] = await Promise.all([
          supabase.from('conversations').select('*').eq('buyer_id', user.id),
          supabase.from('conversations').select('*').eq('seller_id', user.id),
        ]);

        const convMap = new Map<string, any>();
        
        if (asBuyer) {
          asBuyer.forEach((conv) => convMap.set(conv.id, conv));
        }
        if (asSeller) {
          asSeller.forEach((conv) => convMap.set(conv.id, conv));
        }

        const merged = Array.from(convMap.values());

        const enhanced = await Promise.all(
          merged.map(async (conv) => {
            const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
            const [{ data: prof }, { data: list }, { data: msgs }] = await Promise.all([
              supabase.from('user_profiles').select('*').eq('id', otherId).maybeSingle(),
              supabase.from('listings').select('*').eq('id', conv.listing_id).maybeSingle(),
              supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1),
            ]);
            return {
              id: conv.id,
              other: prof,
              listing: list,
              lastMessage: msgs?.[0] || null,
            };
          })
        );

        if (mounted) setConversations(enhanced);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // -------- load active conversation messages --------
  useEffect(() => {
    let mounted = true;

    const setupChat = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Fetch initial messages
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (!mounted) return;
        setMessages(msgs || []);

        // Fetch conversation details
        const { data: conv } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .maybeSingle();

        if (conv && mounted) {
          setActiveListingId(conv.listing_id);
          setConv(conv);

          const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
          const { data: prof } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', otherId)
            .maybeSingle();

          if (mounted) setOtherUser(prof);

          const { data: listing } = await supabase
            .from('listings')
            .select('price')
            .eq('id', conv.listing_id)
            .maybeSingle();

          if (mounted && listing) setListingPrice(Number(listing.price) || 0);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading chat:', error);
        setLoading(false);
      }
    };

    setupChat();
  }, [conversationId]);

  // -------- setup realtime subscription --------
  useEffect(() => {
    let mounted = true;

    // Unsubscribe from previous channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Subscribe to new channel for INSERT and UPDATE
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (mounted) {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
          )
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [conversationId]);

  // auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  // -------- actions --------
  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return;
    const text = message;
    setMessage('');
    try {
      await supabase.from('messages').insert([
        {
          conversation_id: conversationId,
          sender_id: currentUser.id,
          message: text,
        },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(text);
    }
  };

  // Hide message for current user only
  const hideMessageForMe = async (messageId: string) => {
    if (!currentUser) return;

    // Optimistic UI
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, deleted_for: [...(m.deleted_for ?? []), currentUser.id] }
          : m
      )
    );

    try {
      const { data: row, error: readErr } = await supabase
        .from('messages')
        .select('deleted_for')
        .eq('id', messageId)
        .single();

      if (readErr) {
        console.error('hide read failed', readErr);
        return;
      }

      const next = Array.from(
        new Set([...(row?.deleted_for ?? []), currentUser.id])
      );

      const { error: updErr } = await supabase
        .from('messages')
        .update({ deleted_for: next })
        .eq('id', messageId);

      if (updErr) {
        console.error('hide update failed', updErr);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  deleted_for: (m.deleted_for ?? []).filter(
                    (id) => id !== currentUser.id
                  ),
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Error hiding message:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                deleted_for: (m.deleted_for ?? []).filter(
                  (id) => id !== currentUser.id
                ),
              }
            : m
        )
      );
    }
  };

  // ✅ SIMPLE: Just open the form!
  const handleTransactionClick = () => {
    console.log('Transaction button clicked - opening meetup form');
    if (!currentUser || !conv || !activeListingId) {
      alert('Missing transaction data');
      return;
    }
    setShowMeetupForm(true);
  };

  // Filter messages
  const visibleMessages = messages.filter(
    (m) => !(m.deleted_for ?? []).includes(currentUser?.id)
  );

  return (
    <div className="min-h-screen bg-[#0b1a3a] text-white flex">
      {/* LEFT SIDEBAR - Conversation list */}
      <aside className="hidden sm:flex flex-col w-72 border-r border-white/10 bg-[#0b1a3a]">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-bold mb-3">Messages</h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded border border-white/20 text-sm focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations
            .filter((c) => c.other?.full_name?.toLowerCase().includes(search.toLowerCase()))
            .map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/chat/${c.id}`)}
                className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/10 transition ${
                  c.id === conversationId ? 'bg-white/10' : ''
                }`}
              >
                <h3 className="font-semibold text-sm">{c.other?.full_name}</h3>
                <p className="text-xs text-white/60 truncate">{c.listing?.title}</p>
                {c.lastMessage && (
                  <p className="text-xs text-white/50 truncate mt-1">{c.lastMessage.message}</p>
                )}
              </button>
            ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <Link
            href="/messages"
            className="inline-block px-3 py-2 bg-blue-600 rounded text-sm hover:bg-blue-700 transition"
          >
            Back to Messages
          </Link>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p>Loading chat...</p>
          </div>
        ) : (
          <>
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-10 bg-background border-b border-white/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {otherUser?.profile_picture_url ? (
                  <img
                    src={otherUser.profile_picture_url}
                    alt={otherUser.full_name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 grid place-items-center font-semibold text-sm shrink-0">
                    {otherUser?.full_name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="font-bold truncate">{otherUser?.full_name}</h1>
                  <p className="text-xs text-white/60 truncate">{otherUser?.institution}</p>
                </div>
              </div>

              {/* ✅ Transaction button - opens form */}
              <button
                onClick={handleTransactionClick}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-sm font-semibold transition shrink-0 ml-2"
              >
                📦 Transaction
              </button>
            </div>

            {/* MESSAGES AREA */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {visibleMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white/50">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                visibleMessages.map((msg, i) => (
                  <div
                    key={`${msg.id}-${i}`}
                    className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-4 py-2 group ${
                        msg.sender_id === currentUser?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {msg.sender_id === currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => hideMessageForMe(msg.id)}
                            className="text-xs opacity-0 group-hover:opacity-70 hover:opacity-100 transition"
                            title="Delete for me"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* MESSAGE INPUT */}
            <div className="border-t border-white/10 p-4 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-white/10 rounded border border-white/20 focus:outline-none"
              />
              <button
                onClick={sendMessage}
                className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 transition font-semibold"
              >
                Send
              </button>
            </div>
          </>
        )}
      </main>

      {/* ✅ MEETUP FORM MODAL - opens when button clicked */}
      {showMeetupForm && !createdTransactionId && otherUser && conv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="my-8">
            <MeetupLocationForm
              listingId={activeListingId || ''}
              listingPrice={listingPrice}
              listingTitle={conv.listing?.title || 'Item'}
              sellerId={conv.seller_id}
              sellerName={otherUser.full_name}
              buyerId={conv.buyer_id}
              onSuccess={(txId) => {
                console.log('Transaction created with ID:', txId);
                setCreatedTransactionId(txId);
                setShowMeetupForm(false);
              }}
              onCancel={() => {
                console.log('Meetup form cancelled');
                setShowMeetupForm(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ✅ QR CODE MODAL - shows after form completes */}
      {createdTransactionId && currentUser && conv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1a3a] rounded-lg max-w-md w-full border border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">📱 Scan QR Code</h2>
                <button
                  onClick={() => setCreatedTransactionId(null)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              <TransactionQRCode
                transactionId={createdTransactionId}
                userId={currentUser.id}
                userType={conv.buyer_id === currentUser.id ? 'buyer' : 'seller'}
                onConfirmed={() => {
                  console.log('QR confirmed');
                  setCreatedTransactionId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}