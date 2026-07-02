"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface Props {
  listings: any[];
  institutions: string[];
  campusMap: Record<string, string[]>;
  allCampuses: string[];
  selectedInstitution: string;
  selectedCampus: string;
}

export default function HomeClient({
  listings, institutions, campusMap, allCampuses,
  selectedInstitution, selectedCampus,
}: Props) {
  const [institution, setInstitution] = useState(selectedInstitution);
  const [campus, setCampus] = useState(selectedCampus);

  // FIX (#5): if an institution is chosen, show only its campuses.
  // Otherwise show every campus across every institution.
  const campusList = useMemo(() => {
    if (institution && campusMap[institution]) return campusMap[institution];
    return allCampuses;
  }, [institution, campusMap, allCampuses]);

  const apply = (nextInstitution: string, nextCampus: string) => {
    const url = new URL(window.location.href);
    if (nextInstitution) url.searchParams.set("institution", nextInstitution);
    else url.searchParams.delete("institution");
    if (nextCampus) url.searchParams.set("campus", nextCampus);
    else url.searchParams.delete("campus");
    window.location.href = url.toString();
  };

  const onInstitutionChange = (v: string) => {
    setInstitution(v);
    setCampus(""); // reset campus when institution changes
    apply(v, "");
  };

  const onCampusChange = (v: string) => {
    setCampus(v);
    apply(institution, v);
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #d1d5db", borderRadius: 6,
    padding: "0.6rem 0.9rem", fontSize: "0.95rem", background: "white", color: "#111",
  };

  return (
    <>
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: "1rem 1.25rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
            🏛️ Institution
          </label>
          <select value={institution} onChange={(e) => onInstitutionChange(e.target.value)} style={selectStyle}>
            <option value="">All Institutions</option>
            {institutions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
            📍 Campus
          </label>
          <select value={campus} onChange={(e) => onCampusChange(e.target.value)} style={selectStyle}>
            <option value="">All Campuses</option>
            {campusList.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {!listings?.length ? (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
          padding: "3rem 1.25rem", textAlign: "center" }}>
          <p style={{ color: "#6b7280" }}>No listings found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid-responsive">
          {listings.map((item: any) => (
            <Link key={item.id} href={`/listing/${item.id}`} className="block">
              <div className="card h-full hover:shadow-lg">
                {item.image_url && (
                  <div className="relative w-full h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                    <img src={item.image_url} className="w-full h-full object-cover hover:scale-105 transition duration-300" alt={item.title} />
                  </div>
                )}
                <div className="p-4 flex flex-col h-full">
                  <span className="badge badge-blue mb-2 w-fit">{item.category}</span>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1">{item.description}</p>
                  <p className="text-green-600 font-bold text-lg mb-2">R {item.price?.toLocaleString?.() ?? item.price}</p>
                  <p className="text-xs text-gray-500 border-t pt-2">
                    👤 {item.user_profiles?.full_name} · {item.user_profiles?.campus || item.user_profiles?.institution}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}