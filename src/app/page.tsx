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

  let listings = [];
  let error = null;

  try {
    // Validate Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL environment variable is not set. Please configure it in Vercel settings."
      );
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set. Please configure it in Vercel settings."
      );
    }

    // Build query with filters
    let query = supabase
      .from("listings")
      .select("*, user_profiles!inner(full_name, institution, campus)");

    if (search) query = query.ilike("title", `%${search}%`);
    if (category) query = query.eq("category", category);
    if (institution) query = query.eq("user_profiles.institution", institution);
    if (campus) query = query.eq("user_profiles.campus", campus);

    // Execute query
    const { data, error: queryError } = await query.order("created_at", {
      ascending: false,
    });

    if (queryError) {
      console.error("❌ Supabase query error:", {
        message: queryError.message,
        code: queryError.code,
        details: queryError.details,
      });
      throw new Error(
        `Failed to load listings: ${queryError.message || "Database error"}`
      );
    }

    listings = data || [];
    console.log("✅ Loaded", listings.length, "listings");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error("❌ Home page error:", errorMessage);
    error = {
      message: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }

  // Build institution and campus data
  const institutions = Object.keys(INSTITUTION_CAMPUSES).sort();
  const campusMap = INSTITUTION_CAMPUSES;
  const allCampuses = Array.from(
    new Set(Object.values(INSTITUTION_CAMPUSES).flat())
  ).sort();

  return (
    <main style={{ padding: "1.25rem 1rem" }}>
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 800,
          color: "#111",
          marginBottom: "0.25rem",
          lineHeight: 1.2,
        }}
      >
        Ra Zamzama Marketplace
      </h1>
      <p style={{ color: "#555", fontSize: "0.95rem", marginBottom: "1rem" }}>
        Buy &amp; Sell among South African students
      </p>

      <SearchForm />

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#7f1d1d",
            padding: "1rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          <p>
            <strong>⚠️ Error loading listings:</strong> {error.message}
          </p>
          {process.env.NODE_ENV === "development" && (
            <details style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
              <summary>Debug info</summary>
              <pre
                style={{
                  background: "#fca5a5",
                  padding: "0.5rem",
                  borderRadius: "0.25rem",
                  overflow: "auto",
                  marginTop: "0.5rem",
                }}
              >
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {!error && listings.length === 0 && (
        <div
          style={{
            background: "#dbeafe",
            border: "1px solid #93c5fd",
            color: "#1e40af",
            padding: "1rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          <p>No listings found. Try adjusting your search filters.</p>
        </div>
      )}

      <HomeClient
        listings={listings}
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
