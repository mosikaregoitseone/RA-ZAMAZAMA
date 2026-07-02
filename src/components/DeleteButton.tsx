"use client";

export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  listingId,
}: {
  listingId: string;
}) {
  const router = useRouter();

  const deleteListing = async () => {
    const confirmed = confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Listing deleted");

    router.refresh();
  };

  return (
    <button
      onClick={deleteListing}
      className="bg-red-600 text-white px-3 py-1 rounded"
    >
      Delete
    </button>
  );
}