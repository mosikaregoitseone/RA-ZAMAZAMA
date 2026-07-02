// src/app/listing/[id]/ListingClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import { ErrorNotification, useNotification } from "../../../components/ErrorNotification";
import type { UserProfile } from "../../../lib/types";
import FooterContactLink from "../../../components/FooterContactLink";
import { getCurrentAdminInfo, isAdminRole } from "../../../lib/adminUtils";

interface ListingClientProps {
  listingId: string;
  sellerId: string;
  title: string;
}

function useCanInteract() {
  const [canInteract, setCanInteract] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCanInteract(false);
          setCheckingVerification(false);
          return;
        }

        const adminInfo = await getCurrentAdminInfo();
        if (isAdminRole(adminInfo?.role)) {
          setCanInteract(true);
          setCheckingVerification(false);
          return;
        }

        const { data: v } = await supabase
          .from('user_verifications')
          .select('documents_verified, verification_status')
          .eq('user_id', user.id)
          .maybeSingle();

        setCanInteract(
          v?.documents_verified === true ||
          v?.verification_status === 'documents_approved'
        );
      } catch (e) {
        console.error('Verification check failed:', e);
        setCanInteract(false);
      } finally {
        setCheckingVerification(false);
      }
    })();
  }, []);

  return { canInteract, checkingVerification };
}

export default function ListingClient({
  listingId,
  sellerId,
  title,
}: ListingClientProps) {
  const router = useRouter();
  const { notification, showError, showSuccess, clearNotification } = useNotification();
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { canInteract, checkingVerification } = useCanInteract();

  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setCurrentUser(user as any);
        setIsOwner(user.id === sellerId);
      }

      setLoading(false);
    };

    checkOwnership();
  }, [sellerId]);

  const deleteListing = async () => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId);

      if (error) {
        showError(`Failed to delete: ${error.message}`);
        setDeleting(false);
        return;
      }

      showSuccess("✅ Listing deleted!");
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/my-listings");
      }, 1500);
    } catch (error: any) {
      showError(`An unexpected error occurred: ${error.message}`);
      setDeleting(false);
    }
  };

  const reportListing = async () => {
    if (!currentUser) {
      showError("Please login to report this listing");
      return;
    }

    const reason = prompt("Tell us what's wrong with this listing (be specific):");
    if (!reason || reason.trim().length === 0) {
      return;
    }

    setReporting(true);

    try {
      const { error } = await supabase.from("reports").insert([
        {
          reporter_id: currentUser.id,
          reported_listing_id: listingId,
          report_type: "listing",
          reason: "user_reported",
          description: reason.trim(),
          status: "pending",
        },
      ]);

      if (error) {
        showError(`Failed to report: ${error.message}`);
        setReporting(false);
        return;
      }

      showSuccess("✅ Thank you! Our team will review this shortly.");
      setReporting(false);
    } catch (error: any) {
      showError(`An unexpected error occurred: ${error.message}`);
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
        <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
      </div>
    );
  }

  return (
    <>
      {notification && (
        <ErrorNotification
          message={notification.message}
          type={notification.type}
          onClose={clearNotification}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-6">
        {isOwner ? (
          <>
            {/* Owner actions: Edit and Delete */}
            <Link
              href={`/edit-listing/${listingId}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition text-center"
            >
              ✏️ Edit Listing
            </Link>

            <button
              onClick={deleteListing}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition text-center"
            >
              {deleting ? "Deleting..." : "🗑️ Delete Listing"}
            </button>
          </>
        ) : (
          <>
            {/* Buyer actions: Chat and Report */}
            {currentUser ? (
              canInteract ? (
                <Link
                  href={`/start-chat/${listingId}`}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition text-center"
                >
                  💬 Chat with Seller
                </Link>
              ) : (
                <Link
                  href="/verification"
                  className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg font-medium text-center cursor-not-allowed"
                  title="Finish verification to message sellers"
                >
                  🔒 Verify to Chat
                </Link>
              )
            ) : (
              <Link
                href="/login"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition text-center"
              >
                💬 Login to Chat
              </Link>
            )}

            <button
              onClick={reportListing}
              disabled={reporting}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition text-center"
            >
              {reporting ? "Reporting..." : "🚩 Report"}
            </button>
          </>
        )}
      </div>

      {/* Info message */}
      {isOwner && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-medium">This is your listing.</span> You can edit or delete it anytime.
          </p>
        </div>
      )}
      
      <FooterContactLink />

    </>
    
  );
}