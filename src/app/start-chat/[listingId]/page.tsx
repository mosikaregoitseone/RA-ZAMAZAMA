"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function StartChatPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const router = useRouter();

  useEffect(() => {
    const createConversation = async () => {
      const { listingId } = await params;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first");
        router.push("/login");
        return;
      }

      // Get the listing to find the seller
      const { data: listing } = await supabase
        .from("listings")
        .select("seller_id")
        .eq("id", listingId)
        .single();

      if (!listing) {
        alert("Listing not found");
        router.push("/");
        return;
      }

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(buyer_id.eq.${user.id},seller_id.eq.${listing.seller_id}),and(buyer_id.eq.${listing.seller_id},seller_id.eq.${user.id})`
        )
        .single();

      if (existingConversation) {
        // Conversation already exists, go to it
        router.push(`/chat/${existingConversation.id}`);
        return;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from("conversations")
        .insert([
          {
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: listing.seller_id,
          },
        ])
        .select()
        .single();

      if (error) {
        alert(`Error creating conversation: ${error.message}`);
        router.push("/");
        return;
      }

      // Redirect to chat
      if (newConversation) {
        router.push(`/chat/${newConversation.id}`);
      }
    };

    createConversation();
  }, [params, router]);

  return (
    <main className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg text-gray-600">Opening chat...</p>
      </div>
    </main>
  );
}