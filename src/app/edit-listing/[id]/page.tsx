// src/app/edit-listing/[id]/page.tsx
import { supabase } from "../../../lib/supabase";
import EditListingForm from "./EditListingForm";
import { redirect } from "next/navigation";
import type { Listing } from "../../../lib/types";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Get current user server-side
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the listing
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  // Handle errors
  if (error || !listing) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-900 mb-2">Listing Not Found</h1>
          <p className="text-red-800 mb-4">
            This listing doesn't exist or may have been deleted.
          </p>
          <a href="/my-listings" className="text-red-600 hover:text-red-700 font-medium">
            ← Back to My Listings
          </a>
        </div>
      </main>
    );
  }

  // Security check: Only the seller can edit
  if (listing.seller_id !== user.id) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-yellow-900 mb-2">Access Denied</h1>
          <p className="text-yellow-800 mb-4">
            You don't have permission to edit this listing. Only the seller can make changes.
          </p>
          <a href="/" className="text-yellow-600 hover:text-yellow-700 font-medium">
            ← Back to Home
          </a>
        </div>
      </main>
    );
  }

  return <EditListingForm listing={listing as Listing} />;
}
