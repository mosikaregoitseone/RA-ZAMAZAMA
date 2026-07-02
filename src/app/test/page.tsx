import { supabase } from "../../lib/supabase";

export default async function StartChat({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  return (
    <pre>
      {JSON.stringify(
        {
          listing,
          error,
        },
        null,
        2
      )}
    </pre>
  );
}