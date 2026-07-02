import { supabase } from "../lib/supabase";
import SearchForm from "../components/SearchForm";
import { INSTITUTION_CAMPUSES } from "../lib/institutionCampuses";
import HomeClient from "./HomeClient";
import FooterContactLink from "../components/FooterContactLink";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    institution?: string;
    campus?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const category = params.category || "";
  const institution = params.institution || "";
  const campus = params.campus || "";

  // FIX (#5): user_profiles uses `institution` + `campus`, not `university`.
  // Filter on the correct columns and use an inner join so the eq() applies.
  let query = supabase
    .from("listings")
    .select("*, user_profiles!inner(full_name, institution, campus)");

  if (search) query = query.ilike("title", `%${search}%`);
  if (category) query = query.eq("category", category);
  if (institution) query = query.eq("user_profiles.institution", institution);
  if (campus) query = query.eq("user_profiles.campus", campus);

  const { data: listings, error } = await query.order("created_at", { ascending: false });

  // Build full list of institutions + the campus map (used by the filter dropdowns).
  const institutions = Object.keys(INSTITUTION_CAMPUSES).sort();
  const campusMap = INSTITUTION_CAMPUSES;
  const allCampuses = Array.from(
    new Set(Object.values(INSTITUTION_CAMPUSES).flat())
  ).sort();

  return (
    <main style={{ padding: "1.25rem 1rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#111", marginBottom: "0.25rem", lineHeight: 1.2 }}>
        Ra Zamzama Marketplace
      </h1>
      <p style={{ color: "#555", fontSize: "0.95rem", marginBottom: "1rem" }}>
        Buy &amp; Sell among South African students
      </p>

      <SearchForm />

      {error && (
        <p style={{ color: "#ef4444", marginBottom: "0.75rem", fontSize: "0.9rem" }}>{error.message}</p>
      )}

      <HomeClient
        listings={listings || []}
        institutions={institutions}
        campusMap={campusMap}
        allCampuses={allCampuses}
        selectedInstitution={institution}
        selectedCampus={campus}
      />
      <FooterContactLink />
    </main>
  );
}