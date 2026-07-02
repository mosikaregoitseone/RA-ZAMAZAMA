"use client";

export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

/**
 * Admin Verification Page
 * Displays users for manual verification (approve/reject individual users)
 * Document approval is handled separately in Document Review page
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getCurrentAdminInfo, AdminInfo } from "../../../lib/adminUtils";
import { approveUserManual, rejectUserManual } from "../../../services/verificationService";
import { VerificationStatus } from "../../../lib/verificationConstants";

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  university: string;
  campus: string;
  student_number: string;
  verification_status: string;
}

export default function AdminVerificationPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PendingUser[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

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
      await load(info);
      setLoading(false);
    })();
  }, [router]);

  async function load(info: AdminInfo) {
    try {
      let q = supabase
        .from("user_profiles")
        .select(
          "id, full_name, email, university, campus, student_number"
        );

      if (info.role === "admin" && info.institution) {
        q = q.eq("university", info.institution);
      }
      
      const { data: profiles, error: pe } = await q;
      if (pe) {
        setMsg("Failed to load users: " + pe.message);
        return;
      }
      
      const ids = (profiles || []).map((p: any) => p.id);
      if (!ids.length) {
        setRows([]);
        return;
      }

      const { data: ver } = await supabase
        .from("user_verifications")
        .select(
          "user_id, verification_status"
        )
        .in("user_id", ids);

      const byId: Record<string, any> = {};
      (ver || []).forEach((v: any) => (byId[v.user_id] = v));

      const merged: PendingUser[] = (profiles || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name || "",
        email: p.email,
        university: p.university || "",
        campus: p.campus || "",
        student_number: p.student_number || "",
        verification_status: byId[p.id]?.verification_status || "pending",
      }));

      setRows(merged);
    } catch (err) {
      console.error("Error loading users:", err);
      setMsg("Failed to load users");
    }
  }

  async function setStatus(userId: string, approve: boolean) {
    if (!admin) return;
    
    setBusyId(userId);
    setMsg("");
    
    try {
      if (approve) {
        await approveUserManual(userId, "Approved via admin verification page");
        setMsg("✅ User verified.");
      } else {
        await rejectUserManual(userId, "Rejected via admin verification page");
        setMsg("❌ User rejected.");
      }
      
      // Refresh list
      await load(admin);
    } catch (e: any) {
      setMsg("Error: " + (e?.message || String(e)));
      console.error("Error updating user status:", e);
    } finally {
      setBusyId(null);
    }
  }

  if (loading)
    return (
      <main className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </main>
    );

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">User Verification</h1>
      <p className="text-gray-600 mb-4">
        {admin?.role === "superadmin"
          ? "Super admin — viewing every institution."
          : `Institution: ${admin?.institution ?? "(none assigned)"}`}
      </p>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
        <p className="font-semibold mb-2">ℹ️ About this page</p>
        <p>
          This dashboard shows <strong>user-level verification only</strong>.
          <br />
          <strong>Document approval</strong> is in{" "}
          <strong>Admin → Document Review</strong> → the system auto-verifies
          users when all required documents are approved.
        </p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded border text-sm ${
          msg.includes('✅') 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : msg.includes('❌')
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {msg}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">✅ No users to review.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 text-left font-semibold">Name</th>
                <th className="p-3 text-left font-semibold">Email</th>
                <th className="p-3 text-left font-semibold">Institution</th>
                <th className="p-3 text-left font-semibold">Student #</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const verified = u.verification_status === VerificationStatus.Approved;
                const rejected = u.verification_status === VerificationStatus.Rejected;
                
                return (
                  <tr key={u.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3">{u.full_name || "—"}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      {u.university}
                      {u.campus ? ` · ${u.campus}` : ""}
                    </td>
                    <td className="p-3">{u.student_number || "—"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold inline-block ${
                          verified
                            ? "bg-green-100 text-green-700"
                            : rejected
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {verified
                          ? "✅ Verified"
                          : rejected
                          ? "❌ Rejected"
                          : "⏳ Pending"}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        disabled={busyId === u.id || verified}
                        onClick={() => setStatus(u.id, true)}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs font-medium transition"
                        title={verified ? "User already verified" : "Approve user"}
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === u.id}
                        onClick={() => setStatus(u.id, false)}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs font-medium transition"
                        title="Reject user"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}