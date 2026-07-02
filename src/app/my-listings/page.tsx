"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import DeleteButton from "../../components/DeleteButton";
import ProtectedRoute from "../../components/ProtectedRoute";
import FooterContactLink from "../../components/FooterContactLink";


function MyListingsContent() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadListings = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first");
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      setListings(data || []);
      setLoading(false);
    };

    loadListings();
  }, [router]);

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        My Listings
      </h1>

      {listings.length === 0 ? (
        <div>
          <p className="mb-4">
            You have not posted any listings yet.
          </p>

          <Link
            href="/post"
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Create Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md p-4 border"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-40 object-cover rounded mb-3"
                />
              )}

              <h2 className="text-xl font-bold">
                {item.title}
              </h2>

              <p className="text-gray-600 mt-2">
                {item.description}
              </p>

              <p className="text-green-600 font-bold mt-2">
                R {item.price}
              </p>

              <div className="flex gap-2 mt-4">
                <Link
                  href={`/listing/${item.id}`}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  View
                </Link>

                <Link
                  href={`/edit-listing/${item.id}`}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </Link>

                <DeleteButton listingId={item.id} />
              </div>
            </div>
          ))}
        </div>
      )}
<FooterContactLink />

  </main>
  );
}

export default function MyListings() {
  return (
    <ProtectedRoute require="verified">
      <MyListingsContent />
    </ProtectedRoute>
  );
}