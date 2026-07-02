// src/app/listing/[id]/page.tsx
import { supabase } from "../../../lib/supabase";
import ListingClient from "./ListingClient";
import Link from "next/link";
import type { Listing, UserProfile } from "../../../lib/types";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch listing with seller info
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*, user_profiles(full_name, university, id)")
    .eq("id", id)
    .single();

  if (error || !listing) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Listing Not Found</h1>
          <p className="text-red-800 mb-6">
            This listing doesn't exist or may have been deleted.
          </p>
          <Link
            href="/"
            className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const typedListing = listing as Listing;
  const seller = listing.user_profiles as UserProfile | null;

  return (
    <main className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Back to Listings
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image Section */}
        <div>
          {typedListing.image_url ? (
            <img
              src={typedListing.image_url}
              alt={typedListing.title}
              className="w-full rounded-lg shadow-lg object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-gray-500 text-lg">No image available</span>
            </div>
          )}

          {/* Category Badge */}
          <div className="mt-4 flex gap-2">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {typedListing.category}
            </span>
            <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
              Posted {new Date(typedListing.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          {/* Title and Price */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {typedListing.title}
            </h1>
            <p className="text-4xl font-bold text-green-600">
              R {typedListing.price.toLocaleString()}
            </p>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {typedListing.description}
            </p>
          </div>

          {/* Seller Info */}
          {seller && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About the Seller</h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {seller.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{seller.full_name}</p>
                  <p className="text-sm text-gray-600">📍 {seller.university}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <ListingClient
            listingId={typedListing.id}
            sellerId={typedListing.seller_id}
            title={typedListing.title}
          />
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="mt-12 grid md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">Listing ID</p>
          <p className="font-mono text-sm text-gray-900 break-all">{typedListing.id}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">Posted</p>
          <p className="text-sm text-gray-900">
            {new Date(typedListing.created_at).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">Status</p>
          <p className="text-sm font-medium text-green-600">✅ Active</p>
        </div>
      </div>

      {/* Safety Tips */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-bold text-yellow-900 mb-3">🛡️ Safety Tips</h3>
        <ul className="text-sm text-yellow-800 space-y-2">
          <li>✓ Meet in a public place</li>
          <li>✓ Inspect the item before payment</li>
          <li>✓ Use secure payment methods</li>
          <li>✓ Never give your personal information before meeting</li>
          <li>✓ Trust your instincts - report any suspicious activity</li>
        </ul>
      </div>
    </main>
  );
}
