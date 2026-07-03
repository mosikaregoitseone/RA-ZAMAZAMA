"use client";



import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { INSTITUTION_DOMAINS } from "../../lib/institutionDomains";
import { INSTITUTION_CAMPUSES } from "../../lib/institutionCampuses";

interface UniversityOption { name: string; domains: string[]; }

export default function ProfileSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saved, setSaved] = useState(false);
  const [campusOptions, setCampusOptions] = useState<string[]>([]);

  const universities: UniversityOption[] = Object.entries(INSTITUTION_DOMAINS).map(
    ([name, domains]) => ({ name, domains })
  );

  const [form, setForm] = useState({
    full_name: "",
    university: "",
    campus: "",
    email: "",
    student_number: "",
    bio: "",
  });

  // FIX (#4): if the user already completed profile setup, send them home
  // instead of re-rendering this form.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, institution, campus, email, student_number, bio")
        .eq("id", user.id)
        .single();
      if (profile?.full_name && profile?.institution) {
        router.replace("/");
        return;
      }
      if (profile) {
        setForm((f) => ({
          ...f,
          full_name: profile.full_name || "",
          university: profile.institution || "",
          campus: profile.campus || "",
          email: profile.email || "",
          student_number: profile.student_number || "",
          bio: profile.bio || "",
        }));
      }
      setChecking(false);
    })();
  }, [router]);

  function getInstitutionDomains(universityName: string): string[] {
    return INSTITUTION_DOMAINS[universityName as keyof typeof INSTITUTION_DOMAINS] || [];
  }
  function getInstitutionCampuses(universityName: string): string[] {
    return INSTITUTION_CAMPUSES[universityName as keyof typeof INSTITUTION_CAMPUSES] || [];
  }
  function validateStudentEmail(email: string, university: string) {
    const domains = getInstitutionDomains(university);
    if (!domains.length) return false;
    return domains.some((d) => email.toLowerCase().endsWith(d.toLowerCase()));
  }

  useEffect(() => {
    if (form.university) {
      const campuses = getInstitutionCampuses(form.university);
      setCampusOptions(campuses);
      if (!campuses.includes(form.campus)) setForm((p) => ({ ...p, campus: "" }));
    } else {
      setCampusOptions([]);
    }
  }, [form.university]);

  async function handleSubmit() {
    try {
      setLoading(true);
      if (!form.full_name || !form.university || !form.email || !form.student_number) {
        alert("Please complete all required fields.");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("You must be logged in."); return; }

      const emailVerified = validateStudentEmail(form.email, form.university);

      const { error } = await supabase.from("user_profiles").upsert({
        id: user.id,
        full_name: form.full_name,
        institution: form.university,
        campus: form.campus,
        email: form.email,
        student_number: form.student_number,
        bio: form.bio,
        trust_score: 10,
        role: "user",
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      const { error: verifyError } = await supabase.from("user_verifications").upsert({
        user_id: user.id,
        email_verified: emailVerified,
        documents_verified: false,
        identity_verified: false,
        verification_status: "unverified",
        verification_reminder_dismissed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (verifyError) throw verifyError;

      setSaved(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`Failed to save profile: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="max-w-2xl mx-auto p-6"><p>Loading profile…</p></div>;
  }

  if (saved) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-xl border p-6">
          <h1 className="text-2xl font-bold mb-4">Profile Created</h1>
          <p className="mb-4">Your profile has been saved successfully.</p>
          <button onClick={() => router.push("/")}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium">
            Continue to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="rounded-xl border p-6">
        <h1 className="text-3xl font-bold mb-6">Complete Your Profile</h1>

        <div className="space-y-4">
          <input type="text" placeholder="Full Name" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full border rounded p-3" />

          <select value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })}
            className="w-full border rounded p-3">
            <option value="">Select Institution</option>
            {universities.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
          </select>

          {form.university && campusOptions.length > 0 ? (
            <select value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })}
              className="w-full border rounded p-3">
              <option value="">Select Campus</option>
              {campusOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input type="text" placeholder="Campus (type manually)" value={form.campus}
              onChange={(e) => setForm({ ...form, campus: e.target.value })}
              className="w-full border rounded p-3" />
          )}

          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Number</label>
            <input type="text" placeholder="e.g., 12345678" value={form.student_number}
              onChange={(e) => setForm({ ...form, student_number: e.target.value })}
              className="w-full border rounded p-2 mb-3" />
            <label className="block text-sm font-medium text-gray-700 mb-2">Generated Email</label>
            <div className="bg-white p-2 rounded border border-gray-300 text-gray-700">
              {form.student_number && form.university
                ? `${form.student_number}@${getInstitutionDomains(form.university)[0] || 'domain.ac.za'}`
                : 'Your email will be generated here'}
            </div>
          </div>

          {/* FIX (#6): label and placeholder now read "Verify Email" */}
          <label className="block text-sm font-medium text-gray-700">Verify Email</label>
          <input type="email" placeholder="Verify Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded p-3" />

          <textarea placeholder="Tell students about yourself" value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full border rounded p-3 min-h-[120px]" />

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-black text-white p-3 rounded">
            {loading ? "Saving..." : "Complete Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}