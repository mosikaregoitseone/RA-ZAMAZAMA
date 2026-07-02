"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getCurrentAdminInfo, AdminInfo } from "../../../lib/adminUtils";

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    (async () => {
      const info = await getCurrentAdminInfo();
      if (!info) {
        router.push("/login");
        return;
      }
      if (info.role !== "admin" && info.role !== "superadmin") {
        router.push("/");
        return;
      }
      setAdmin(info);
      await loadUsers(info);
      setLoading(false);
    })();
  }, [router]);

  const loadUsers = async (info: AdminInfo) => {
    let q = supabase
      .from("user_profiles")
      .select("*, moderation:user_moderation(status, reason)")
      .order("created_at", { ascending: false });

    if (info.role === "admin" && info.institution) {
      q = q.eq("university", info.institution);
    }
    const { data } = await q;
    setUsers(data || []);
  };

  const suspendUser = async (userId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;

    const { error } = await supabase.from("user_moderation").insert([
      {
        user_id: userId,
        status: "suspended",
        reason,
        suspended_by: user.id,
      },
    ]);
    if (error) {
      alert(error.message);
      return;
    }
    await supabase.from("admin_audit_log").insert([
      {
        admin_id: user.id,
        action: "suspend_user",
        target_type: "user",
        target_id: userId,
        details: reason,
      },
    ]);
    alert("User suspended!");
    if (admin) loadUsers(admin);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading)
    return (
      <main className="p-6">
        <p>Loading…</p>
      </main>
    );

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-2">Manage Users</h1>
      <p className="text-gray-600 mb-6">
        {admin?.role === "superadmin"
          ? "Super admin — all institutions"
          : `Institution: ${admin?.institution ?? "(none assigned)"}`}
      </p>

      <input
        type="text"
        placeholder="Search by name or email…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border p-3 w-full mb-6 rounded"
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Institution</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{user.full_name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3 text-sm">{user.university}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      user.moderation?.[0]?.status === "suspended"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {user.moderation?.[0]?.status === "suspended"
                      ? "Suspended"
                      : "Active"}
                  </span>
                </td>
                <td className="p-3">
                  {user.moderation?.[0]?.status !== "suspended" ? (
                    <button
                      onClick={() => suspendUser(user.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Suspend
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">Suspended</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
