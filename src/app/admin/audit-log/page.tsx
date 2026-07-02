"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuditLogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      loadLogs();
    };

    checkAdmin();
  }, [router]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("admin_audit_log")
      .select(
        `
        *,
        admin:user_profiles!admin_id(full_name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    setLogs(data || []);
    setLoading(false);
  };

  if (loading) {
    return <main className="p-6"><p>Loading...</p></main>;
  }

  if (!isAdmin) return null;

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">Audit Log</h1>

      <div className="space-y-2">
        {!logs.length ? (
          <p className="text-gray-500">No actions logged yet.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-gray-50 border rounded p-4 text-sm"
            >
              <div className="flex justify-between mb-2">
                <span className="font-semibold">
                  {log.admin?.full_name}
                </span>
                <span className="text-gray-500">
                  {new Date(
                    log.created_at
                  ).toLocaleString()}
                </span>
              </div>

              <p className="text-gray-700">
                <strong>{log.action}</strong> on{" "}
                <span className="font-mono text-xs bg-gray-200 px-1 rounded">
                  {log.target_type}
                </span>
              </p>

              {log.details && (
                <p className="text-gray-600 mt-1">
                  {log.details}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}