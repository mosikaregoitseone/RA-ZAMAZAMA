"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchForm() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    router.push(`/?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="mb-4">
      <div className="flex flex-col md:flex-row gap-2">
        <input
          type="text"
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "0.65rem 1rem", fontSize: "1rem", outline: "none" }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "0.65rem 1rem", fontSize: "1rem", background: "white", minWidth: "180px", outline: "none" }}
        >
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Textbooks">Textbooks</option>
          <option value="Furniture">Furniture</option>
          <option value="Food">Food</option>
          <option value="Services">Services</option>
          <option value="Clothing">Clothing</option>
          <option value="Academic Work">Academic Work</option>
          <option value="Other">Other</option>
        </select>
        <button
          type="submit"
          style={{ backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", padding: "0.65rem 1.5rem", fontSize: "1rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          🔍 Search
        </button>
      </div>
    </form>
  );
}