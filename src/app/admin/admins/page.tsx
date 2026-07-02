"use client";
export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

/** Super-admin-only page — lists every admin account. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getCurrentAdminInfo } from "../../../lib/adminUtils";

interface Row {
  user_id: string;
  role: string;
  institution: string | null;
  email?: string;
  full_name?: string;
}

export default function AdminsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const info = await getCurrentAdminInfo();
      if (!info || info.role !== "superadmin") {
        router.push("/");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role, institution")
        .in("role", ["admin", "superadmin"]);

      const ids = (roles || []).map((r: any) => r.user_id);
      let profilesById: Record<string, any> = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .in("id", ids);
        (profiles || []).forEach((p: any) => (profilesById[p.id] = p));
      }
      setRows(
        (roles || []).map((r: any) => ({
          ...r,
          email: profilesById[r.user_id]?.email,
          full_name: profilesById[r.user_id]?.full_name,
        }))
      );
      setLoading(false);
    })();
  }, [router]);

  if (loading)
    return (
      <main className="p-6">
        <p>Loading…</p>
      </main>
    );

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">All Admin Accounts</h1>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3 text-left">Institution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id + r.role} className="border-b hover:bg-gray-50">
              <td className="p-3">{r.full_name || "—"}</td>
              <td className="p-3">{r.email || r.user_id}</td>
              <td className="p-3 font-semibold">{r.role}</td>
              <td className="p-3">{r.institution || (r.role === "superadmin" ? "(all)" : "—")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
