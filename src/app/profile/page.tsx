"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import FooterContactLink from "../../components/FooterContactLink";


export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reviews");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Get profile
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Get listings
      const { data: listingsData } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      setListings(listingsData || []);

      // Get report count (reports about this user)
      const { count } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("reported_user_id", user.id);

      setReportCount(count || 0);

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    alert("Password changed successfully!");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordForm(false);
  };

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading profile...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex gap-6 items-start">
          {/* Avatar */}
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase() || "U"}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              {profile?.full_name || "User"}
            </h1>
            <p className="text-gray-600 mb-1">
              📧 {user.email}
            </p>
            <p className="text-gray-600 mb-1">
              🎓 {profile?.university || "University not set"}
            </p>
            <p className="text-gray-600">
              📅 Joined {new Date(profile?.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 flex-wrap justify-end">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{listings.length}</p>
              <p className="text-gray-600 text-sm">Listings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-gray-600 text-sm">Reviews</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{reportCount}</p>
              <p className="text-gray-600 text-sm">Reports</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("reviews")}
          className={`py-2 px-4 font-medium transition ${
            activeTab === "reviews"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ⭐ Reviews (0)
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-2 px-4 font-medium transition ${
            activeTab === "settings"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="bg-white border rounded-lg p-12 text-center shadow-sm">
          <p className="text-gray-600">No reviews yet. Complete transactions to get reviews!</p>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-6">Security Settings</h3>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-4 max-w-md">
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border p-3 w-full rounded"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border p-3 w-full rounded"
              />
              <div className="flex gap-2">
                <button
                  onClick={handlePasswordChange}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowPasswordForm(false)}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <FooterContactLink />
      
    </main>
  );
}