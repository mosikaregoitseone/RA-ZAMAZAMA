"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalListings: 0, pendingReports: 0,
    suspendedUsers: 0, pendingDocuments: 0, openTransactions: 0,
  });

  useEffect(() => {
    (async () => {
      const counts = await Promise.all([
        supabase.from("user_profiles").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("user_moderation").select("*", { count: "exact", head: true }).eq("status", "suspended"),
        supabase.from("verification_documents").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).in("status", ["qr_generated", "qr_confirmed", "payment_pending"]),
      ]);
      setStats({
        totalUsers: counts[0].count || 0,
        totalListings: counts[1].count || 0,
        pendingReports: counts[2].count || 0,
        suspendedUsers: counts[3].count || 0,
        pendingDocuments: counts[4].count || 0,
        openTransactions: counts[5].count || 0,
      });
    })();
  }, []);

  const Card = ({ title, value, color }: { title: string; value: number; color: string }) => (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 8, fontWeight: 600 }}>{title}</p>
      <p style={{ color, fontSize: 30, fontWeight: 800 }}>{value}</p>
    </div>
  );

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: "#475569", marginBottom: 24 }}>Overview of marketplace activity.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        <Card title="Total Users"        value={stats.totalUsers}        color="#2563eb" />
        <Card title="Active Listings"    value={stats.totalListings}     color="#059669" />
        <Card title="Pending Reports"    value={stats.pendingReports}    color="#ea580c" />
        <Card title="Suspended Users"    value={stats.suspendedUsers}    color="#dc2626" />
        <Card title="Pending Documents"  value={stats.pendingDocuments}  color="#7c3aed" />
        <Card title="Open Transactions"  value={stats.openTransactions}  color="#0891b2" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {[
          { href: "/admin/reports",         title: "Manage Reports",   desc: "Review and resolve user complaints" },
          { href: "/admin/users",           title: "Manage Users",     desc: "View, suspend, inspect accounts" },
          { href: "/admin/listings",        title: "Manage Listings",  desc: "Remove inappropriate listings" },
          { href: "/admin/document-review", title: "Document Review",  desc: "Approve/reject student documents" },
          { href: "/admin/transactions",    title: "Transactions",     desc: "Monitor QR transactions & disputes" },
          { href: "/admin/audit-log",       title: "Audit Log",        desc: "All admin actions, immutable trail" },
        ].map((c) => (
          <Link key={c.href} href={c.href}
            style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, textDecoration: "none", color: "inherit" }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>{c.title}</p>
            <p style={{ color: "#64748b", fontSize: 13 }}>{c.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}