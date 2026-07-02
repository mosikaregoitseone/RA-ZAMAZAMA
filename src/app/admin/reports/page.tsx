"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");

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
      loadReports();
    };

    checkAdmin();
  }, [router, filter]);

  const loadReports = async () => {
    let query = supabase
      .from("reports")
      .select(`
        *,
        reporter:user_profiles!reporter_id(full_name, email),
        reported_user:user_profiles!reported_user_id(full_name, email)
      `);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query.order("created_at", {
      ascending: false,
    });

    setReports(data || []);
    setLoading(false);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("reports")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      alert(error.message);
      return;
    }

    // Log to audit
    await supabase.from("admin_audit_log").insert([
      {
        admin_id: user.id,
        action: "update_report",
        target_type: "report",
        target_id: reportId,
        details: `Changed status to ${newStatus}`,
      },
    ]);

    alert("Report updated!");
    loadReports();
  };

  if (loading) {
    return <main className="p-6"><p>Loading...</p></main>;
  }

  if (!isAdmin) return null;

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">
          Manage Reports
        </h1>

        <div className="flex gap-2 mb-6">
          {["pending", "reviewing", "resolved", "dismissed", "all"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded capitalize ${
                  filter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>
      </div>

      {!reports.length ? (
        <p className="text-gray-500">No reports found.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white border rounded-lg p-6 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="font-bold text-lg capitalize">
                    {report.report_type} - {report.reason}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Reported by:{" "}
                    {report.reporter?.full_name}
                  </p>
                  {report.reported_user && (
                    <p className="text-sm text-gray-600">
                      Reported user:{" "}
                      {report.reported_user.full_name}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-semibold capitalize ${
                    report.status === "pending"
                      ? "bg-orange-100 text-orange-700"
                      : report.status === "reviewing"
                      ? "bg-blue-100 text-blue-700"
                      : report.status === "resolved"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {report.status}
                </span>
              </div>

              <p className="mb-3 text-gray-700">
                {report.description}
              </p>

              <p className="text-xs text-gray-500 mb-4">
                Reported:{" "}
                {new Date(report.created_at).toLocaleString()}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateReportStatus(report.id, "reviewing")
                  }
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  Mark Reviewing
                </button>

                <button
                  onClick={() =>
                    updateReportStatus(report.id, "resolved")
                  }
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                >
                  Resolve
                </button>

                <button
                  onClick={() =>
                    updateReportStatus(report.id, "dismissed")
                  }
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}