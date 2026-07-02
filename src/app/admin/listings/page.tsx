"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ListingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      loadListings();
    };

    checkAdmin();
  }, [router]);

  const loadListings = async () => {
    const { data } = await supabase
      .from("listings")
      .select(
        `
        *,
        seller:user_profiles!seller_id(full_name, email)
      `
      )
      .order("created_at", { ascending: false });

    setListings(data || []);
    setLoading(false);
  };

  const deleteListing = async (listingId: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const reason = prompt("Enter reason for deletion:");
    if (!reason) return;

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("admin_audit_log").insert([
      {
        admin_id: user.id,
        action: "delete_listing",
        target_type: "listing",
        target_id: listingId,
        details: reason,
      },
    ]);

    alert("Listing deleted!");
    loadListings();
  };

  if (loading) {
    return <main className="p-6"><p>Loading...</p></main>;
  }

  if (!isAdmin) return null;

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">Manage Listings</h1>

      {!listings.length ? (
        <p className="text-gray-500">No listings found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white border rounded-lg p-4 shadow-sm"
            >
              {listing.image_url && (
                <img
                  src={listing.image_url}
                  alt={listing.title}
                  className="w-full h-40 object-cover rounded mb-3"
                />
              )}

              <h3 className="font-bold mb-1">
                {listing.title}
              </h3>

              <p className="text-sm text-gray-600 mb-2">
                Seller: {listing.seller?.full_name}
              </p>

              <p className="text-sm text-gray-600 mb-3">
                {listing.description.substring(0, 60)}
                ...
              </p>

              <button
                onClick={() => deleteListing(listing.id)}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm w-full"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}