"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function CreateAdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createAdmin() {
    try {
      setLoading(true);
      setMessage("");

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("No user ID returned");

      // 2. Create profile with admin role
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          full_name: email.split("@")[0],
          role: "admin", // SET AS ADMIN
          email: email,
          institution: "Admin",
          campus: "Admin",
          student_number: "ADMIN",
          trust_score: 100,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 3. Create verification record
      const { error: verifyError } = await supabase
        .from("user_verifications")
        .insert({
          user_id: userId,
          email_verified: true,
          documents_verified: true,
          identity_verified: true,
          verification_status: "documents_approved",
          verification_reminder_dismissed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (verifyError) throw verifyError;

      setMessage(`✅ Admin created: ${email}`);
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Error:", error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <div className="rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold mb-6">Create Admin Account</h1>

        {message && (
          <div className={`p-3 rounded mb-4 text-sm ${
            message.includes("✅") 
              ? "bg-green-100 text-green-800" 
              : "bg-red-100 text-red-800"
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded p-2"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded p-2"
          />

          <button
            onClick={createAdmin}
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded font-medium"
          >
            {loading ? "Creating..." : "Create Admin"}
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-4">
          ⚠️ This page should be protected. Add auth check in production.
        </p>
      </div>
    </main>
  );
}