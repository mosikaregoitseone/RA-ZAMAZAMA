'use client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useMessages } from '../../hooks';
import { canSendMessages } from '../../lib/permissions';
import { supabase } from '../../lib/supabase';
import ProtectedRoute from '../../components/ProtectedRoute';
import FooterContactLink from '../../components/FooterContactLink';

interface ConversationDisplay {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  created_at: string;
  otherUserName: string;
  otherUserAvatar?: string;
  otherUserInitials: string;
  listingTitle: string;
  lastMessage: string;
  lastMessageTime?: string;
}

function MessagesPageContent() {
  const router = useRouter();
  const { user, role, isVerified, loading: userLoading } = useUser();
  const { conversations: basicConversations, loading: conversationsLoading } = useMessages(user?.id || '');
  const [displayConversations, setDisplayConversations] = useState<ConversationDisplay[]>([]);
  const [enriching, setEnriching] = useState(false);

  const loading = userLoading || conversationsLoading || enriching;
  const canChat = canSendMessages(isVerified, role);

  // Enrich conversations with user and listing data
  useEffect(() => {
    const enrichConversations = async () => {
      if (!basicConversations || basicConversations.length === 0) {
        setDisplayConversations([]);
        return;
      }

      setEnriching(true);
      try {
        const enriched: ConversationDisplay[] = await Promise.all(
          basicConversations.map(async (conv) => {
            try {
              // Determine other user ID
              const otherUserId = conv.buyer_id === user?.id ? conv.seller_id : conv.buyer_id;

              // Fetch other user profile
              const { data: otherUserData } = await supabase
                .from('user_profiles')
                .select('full_name, profile_picture_url')
                .eq('id', otherUserId)
                .single();

              // Fetch listing
              const { data: listingData } = await supabase
                .from('listings')
                .select('title')
                .eq('id', conv.listing_id)
                .single();

              // Fetch last message
              const { data: messagesData } = await supabase
                .from('messages')
                .select('message, created_at')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1);

              const otherUserName = otherUserData?.full_name || 'Unknown user';
              const lastMessage = messagesData?.[0]?.message || 'No messages yet';
              const lastMessageTime = messagesData?.[0]?.created_at
                ? new Date(messagesData[0].created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              // Get initials for avatar
              const initials = otherUserName
                .split(' ')
                .map((part: string) => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return {
                ...conv,
                otherUserName,
                otherUserAvatar: otherUserData?.profile_picture_url,
                otherUserInitials: initials,
                listingTitle: listingData?.title || 'Unknown listing',
                lastMessage,
                lastMessageTime,
              };
            } catch (error) {
              console.error('Error enriching conversation:', error);
              return {
                ...conv,
                otherUserName: 'Unknown user',
                otherUserInitials: '?',
                listingTitle: 'Unknown listing',
                lastMessage: 'Error loading message',
                lastMessageTime: '',
              };
            }
          })
        );

        setDisplayConversations(enriched);
      } finally {
        setEnriching(false);
      }
    };

    if (user?.id) {
      enrichConversations();
    }
  }, [basicConversations, user?.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b1a3a] text-white flex items-center justify-center">
        <p>Loading messages…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b1a3a] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 mb-4">You must be logged in to view messages</p>
          <Link href="/login" className="inline-block px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  const handleSelectConversation = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  return (
    <main className="min-h-screen bg-[#0b1a3a] text-white">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-screen">
        {/* LEFT SIDEBAR - CONVERSATIONS LIST */}
        <aside className="border-r border-white/10 bg-[#0b1a3a] flex flex-col">
          {/* HEADER */}
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white text-[#0b1a3a] grid place-items-center font-extrabold">
                RA
              </div>
              <div>
                <h1 className="font-extrabold tracking-wide">Messages</h1>
                <p className="text-xs text-white/60">
                  {displayConversations.length} conversation{displayConversations.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>

          {/* CONVERSATIONS LIST */}
          <div className="flex-1 overflow-y-auto">
            {displayConversations.length === 0 ? (
              <div className="p-5 text-white/70 text-sm">
                <p className="mb-3">No conversations yet.</p>
                <p className="text-xs">Start by messaging someone from a listing page.</p>
              </div>
            ) : (
              displayConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className="w-full text-left px-4 py-4 border-b border-white/8 hover:bg-white/5 transition active:bg-white/10"
                >
                  <div className="flex gap-3">
                    {/* AVATAR */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden shrink-0 grid place-items-center font-semibold text-sm text-white">
                      {conv.otherUserAvatar ? (
                        <img
                          src={conv.otherUserAvatar}
                          alt={conv.otherUserName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        conv.otherUserInitials
                      )}
                    </div>

                    {/* CONVERSATION INFO */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold truncate text-sm">{conv.otherUserName}</h3>
                        {conv.lastMessageTime && (
                          <span className="text-xs text-white/50 shrink-0">{conv.lastMessageTime}</span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 truncate mb-1">{conv.listingTitle}</p>
                      <p className="text-xs text-white/75 truncate">{conv.lastMessage}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT PANEL - MESSAGE VIEW */}
        <section className="hidden lg:flex flex-col justify-between bg-[#0b1a3a]">
          {/* TOP SECTION */}
          <div className="border-b border-white/10 p-6 md:p-8">
            <h2 className="text-3xl font-bold mb-2">Chat inbox</h2>
            <p className="text-white/70 max-w-2xl text-sm">
              Select a conversation from the left to view and continue chatting. Use the chat screen for messaging, QR handshakes, and transaction actions.
            </p>
          </div>

          {/* CENTER - SELECT PROMPT */}
          <div className="flex-1 grid place-items-center p-6">
            <div className="max-w-md w-full bg-white text-gray-900 rounded-2xl p-6 shadow-lg">
              <div className="text-3xl mb-3 text-center">💬</div>
              <h3 className="text-lg font-bold mb-2 text-center">Select a conversation</h3>
              <p className="text-gray-600 mb-4 text-sm text-center">
                Choose a thread from the left to continue the conversation in the full chat view.
              </p>
              {displayConversations.length > 0 ? (
                <button
                  onClick={() => handleSelectConversation(displayConversations[0].id)}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition text-sm"
                >
                  Open most recent chat
                </button>
              ) : (
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition text-sm"
                >
                  Browse listings
                </Link>
              )}
            </div>
          </div>

          {/* BOTTOM */}
          <div className="p-6 border-t border-white/10">
            <FooterContactLink />
          </div>
        </section>

        {/* MOBILE - SELECT MESSAGE PROMPT */}
        <section className="flex lg:hidden flex-col justify-between bg-[#0b1a3a]">
          <div className="border-b border-white/10 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-1">Chat inbox</h2>
            <p className="text-white/70 max-w-2xl text-xs">
              Select a conversation to open the full chat view.
            </p>
          </div>

          <div className="flex-1 grid place-items-center p-4">
            <div className="max-w-sm w-full bg-white text-gray-900 rounded-xl p-5 shadow-lg">
              <h3 className="font-bold mb-2 text-center">Select a conversation</h3>
              <p className="text-gray-600 mb-4 text-xs text-center">
                Tap a thread to open the chat.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedRoute require="verified">
      <MessagesPageContent />
    </ProtectedRoute>
  );
}