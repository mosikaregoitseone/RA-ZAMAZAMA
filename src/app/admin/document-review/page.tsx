// src/app/admin/document-review/page.tsx
// 100% Schema Aligned Document Review Page - FIXED VERSION
// Fetches pending documents from verification_documents table
// Displays with associated user_profiles data
// Features: Approve/Reject with error handling, Document type tabs for quick switching

"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { ErrorNotification, useNotification } from "../../../components/ErrorNotification";
import { getCurrentAdminInfo } from "../../../lib/adminUtils";
import { approveDocument, rejectDocument } from "../../../services/verificationService";
import { logAdminAction } from "../../../services/adminService";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  university: string;
  institution: string;
  role: string;
  trust_score: number;
  is_verified: boolean;
}

interface DocumentReview {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_size_kb: number;
  status: string;
  attempt_number: number;
  reviewed_by?: string;
  admin_notes?: string;
  reviewed_at?: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  user_profiles?: UserProfile;
}

interface ReviewState {
  documentId: string;
  userId: string;
  status: "approved" | "rejected";
  notes: string;
}

const DOCUMENT_TYPES = [
  { id: "all", label: "All Documents", icon: "📄" },
  { id: "student_card", label: "Student Card", icon: "🎓" },
  { id: "registration_proof", label: "Registration Proof", icon: "📋" },
  { id: "fee_statement", label: "Fee Statement", icon: "💰" },
];

export default function DocumentReviewPage() {
  const { notification, showError, showSuccess, clearNotification } = useNotification();
  const [documents, setDocuments] = useState<DocumentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentReview | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Initialize and fetch documents
  useEffect(() => {
    const initialize = async () => {
      try {
        const admin = await getCurrentAdminInfo();
        setCurrentAdmin(admin);
        await fetchUnverifiedDocuments(admin);
      } catch (error) {
        console.error("Initialization error:", error);
        showError("Failed to initialize admin panel");
      }
    };
    initialize();
  }, []);

  const fetchUnverifiedDocuments = useCallback(
    async (admin?: any) => {
      try {
        setLoading(true);
        clearNotification();

        // Build query for pending documents
        let query = supabase
          .from("verification_documents")
          .select(
            `
            id,
            user_id,
            document_type,
            file_url,
            file_size_kb,
            status,
            attempt_number,
            reviewed_by,
            admin_notes,
            reviewed_at,
            uploaded_at,
            created_at,
            updated_at
          `
          )
          .eq("status", "pending")
          .order("uploaded_at", {
            ascending: sortOrder === "oldest" ? true : false,
          });

        const { data, error } = await query;

        if (error) {
          showError(`Failed to fetch documents: ${error.message}`);
          console.error("Query error:", error);
          setDocuments([]);
          return;
        }

        let docsArray: DocumentReview[] = Array.isArray(data) ? data : data ? [data] : [];
        console.log("Fetched documents:", docsArray);

        if (docsArray.length === 0) {
          setDocuments([]);
          showSuccess("No pending documents to review");
          return;
        }

        // Fetch associated user profiles
        const userIds = docsArray.map((doc) => doc.user_id);
        const uniqueUserIds = [...new Set(userIds)];

        let userProfiles: Record<string, UserProfile> = {};

        if (uniqueUserIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from("user_profiles")
            .select(
              `
              id,
              full_name,
              email,
              university,
              institution,
              role,
              trust_score,
              is_verified
            `
            )
            .in("id", uniqueUserIds);

          if (profiles) {
            profiles.forEach((profile: any) => {
              userProfiles[profile.id] = profile;
            });
          } else if (profileError) {
            console.warn("Could not fetch user profiles:", profileError.message);
          }
        }

        // Combine documents with their user profile
        const docsWithUsers: DocumentReview[] = docsArray.map((doc) => ({
          ...doc,
          user_profiles: userProfiles[doc.user_id] || undefined,
        }));

        // Apply institution filter if regular admin
        let scoped = docsWithUsers;
        if (admin?.role === "admin" && admin.institution) {
          scoped = docsWithUsers.filter(
            (d) =>
              d.user_profiles?.university === admin.institution ||
              d.user_profiles?.institution === admin.institution
          );
        }

        // Apply document type filter
        if (filterType !== "all") {
          scoped = scoped.filter((d) => d.document_type === filterType);
        }

        setDocuments(scoped);

        if (scoped.length === 0) {
          showSuccess("No documents match your filters");
        }
      } catch (error: any) {
        showError(`Error fetching documents: ${error.message}`);
        console.error("Fetch error:", error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    },
    [filterType, sortOrder, clearNotification, showError, showSuccess]
  );

  const handleVerifyDocument = async (docId: string, approved: boolean) => {
    if (!selectedDoc) return;

    // Validate rejection reason
    if (!approved && !adminNotes.trim()) {
      showError("Please provide a rejection reason");
      return;
    }

    setVerifying(true);
    clearNotification();

    try {
      if (approved) {
        console.log("Approving document:", docId);
        const result = await approveDocument(docId, adminNotes || undefined);

        if (result.success) {
          showSuccess(
            result.userApproved
              ? "Document approved — user is now verified!"
              : "Document approved"
          );

          // Log the action
          if (currentAdmin?.id) {
            await logAdminAction(
              currentAdmin.id,
              "approve_document",
              "verification_document",
              docId,
              {
                document_type: selectedDoc.document_type,
                user_id: selectedDoc.user_id,
                notes: adminNotes,
              }
            );
          }
        } else {
          showError(result.message || "Failed to approve document");
          return;
        }
      } else {
        // Reject document
        console.log("Rejecting document:", docId);
        const result = await rejectDocument(docId, adminNotes);

        if (result.success) {
          showSuccess("Document rejected — user can resubmit");

          // Log the action
          if (currentAdmin?.id) {
            await logAdminAction(
              currentAdmin.id,
              "reject_document",
              "verification_document",
              docId,
              {
                document_type: selectedDoc.document_type,
                user_id: selectedDoc.user_id,
                reason: adminNotes,
              }
            );
          }
        } else {
          showError(result.message || "Failed to reject document");
          return;
        }
      }

      // Reset selection and notes, then refresh list
      setSelectedDoc(null);
      setAdminNotes("");
      await fetchUnverifiedDocuments(currentAdmin);
    } catch (e: any) {
      console.error("Verification error:", e);
      showError(e.message || "An error occurred while processing the document");
    } finally {
      setVerifying(false);
    }
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      student_card: "Student Card",
      registration_proof: "Registration Proof",
      fee_statement: "Fee Statement",
    };
    return labels[type] || type;
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "pending":
        return "badge badge-warning";
      case "approved":
        return "badge badge-success";
      case "rejected":
        return "badge badge-error";
      default:
        return "badge";
    }
  };

  // Get document count by type
  const getDocumentCount = (type: string): number => {
    if (type === "all") return documents.length;
    return documents.filter((d) => d.document_type === type).length;
  };

  // Quick switch to next pending document of same type
  const switchToNextDocument = () => {
    if (!selectedDoc) return;
    
    const filteredDocs = filterType === "all" 
      ? documents 
      : documents.filter((d) => d.document_type === filterType);
    
    const currentIndex = filteredDocs.findIndex((d) => d.id === selectedDoc.id);
    if (currentIndex < filteredDocs.length - 1) {
      setSelectedDoc(filteredDocs[currentIndex + 1]);
      setAdminNotes("");
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Document Review</h1>
          <p className="text-gray-600 mt-2">
            Review and approve/reject student verification documents
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <div className="mb-4">
            <ErrorNotification
              message={notification.message}
              type={notification.type}
              onClose={clearNotification}
            />
          </div>
        )}

        {/* Document Type Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="flex flex-wrap gap-2 p-4">
            {DOCUMENT_TYPES.map((docType) => (
              <button
                key={docType.id}
                onClick={() => {
                  setFilterType(docType.id);
                  setSelectedDoc(null);
                  setAdminNotes("");
                }}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  filterType === docType.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{docType.icon}</span>
                <span>{docType.label}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  filterType === docType.id
                    ? "bg-blue-400"
                    : "bg-gray-300"
                }`}>
                  {getDocumentCount(docType.id)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-gray-900">
              {documents.filter((d) => d.status === "pending").length}
            </div>
            <div className="text-gray-600 text-sm">Pending Documents</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-gray-900">
              {new Set(documents.map((d) => d.user_id)).size}
            </div>
            <div className="text-gray-600 text-sm">Users</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-gray-900">
              {documents.filter((d) => d.document_type === "student_card").length}
            </div>
            <div className="text-gray-600 text-sm">Student Cards</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-gray-900">
              {documents.filter((d) => d.attempt_number > 1).length}
            </div>
            <div className="text-gray-600 text-sm">Resubmissions</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg">
              {/* Filters and Controls */}
              <div className="p-4 border-b border-gray-200 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>

                <button
                  onClick={() => fetchUnverifiedDocuments(currentAdmin)}
                  className="w-full btn btn-sm btn-outline"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {/* Documents List */}
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {documents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="text-3xl mb-2">📄</div>
                    No pending documents to review
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setAdminNotes("");
                      }}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                        selectedDoc?.id === doc.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {doc.user_profiles?.full_name || "Unknown User"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {doc.user_profiles?.email}
                          </div>
                        </div>
                        <span className={`badge badge-sm flex-shrink-0 ${getStatusBadgeClass(doc.status)}`}>
                          {doc.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-700">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{getDocumentTypeLabel(doc.document_type)}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span className="text-gray-600">Attempt:</span>
                          <span className="font-medium">{doc.attempt_number}/5</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium">{doc.file_size_kb} KB</span>
                        </div>
                        <div className="text-xs text-gray-500 pt-2">
                          {new Date(doc.uploaded_at).toLocaleDateString()} at{" "}
                          {new Date(doc.uploaded_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Document Preview and Review */}
          <div className="lg:col-span-2">
            {selectedDoc ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* User Info Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedDoc.user_profiles?.full_name || "Unknown User"}
                      </h2>
                      <p className="text-blue-100 mt-1">{selectedDoc.user_profiles?.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-blue-100">Trust Score</div>
                      <div className="text-2xl font-bold">{selectedDoc.user_profiles?.trust_score || 50}/100</div>
                    </div>
                  </div>
                </div>

                {/* Document Details */}
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Document Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-600">Document Type</label>
                      <p className="font-medium text-gray-900">
                        {getDocumentTypeLabel(selectedDoc.document_type)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Status</label>
                      <p className={`font-medium ${getStatusBadgeClass(selectedDoc.status)}`}>
                        {selectedDoc.status}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Attempt Number</label>
                      <p className="font-medium text-gray-900">{selectedDoc.attempt_number}/5</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">File Size</label>
                      <p className="font-medium text-gray-900">{selectedDoc.file_size_kb} KB</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Uploaded</label>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedDoc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Institution</label>
                      <p className="font-medium text-gray-900">
                        {selectedDoc.user_profiles?.university ||
                          selectedDoc.user_profiles?.institution ||
                          "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Document Preview Link */}
                  <div className="mb-4">
                    <label className="text-sm text-gray-600">Document Preview</label>
                    <a
                      href={selectedDoc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline mt-2"
                    >
                      View Document in New Tab ↗
                    </a>
                  </div>

                  {selectedDoc.reviewed_at && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Previously reviewed:</span>{" "}
                        {new Date(selectedDoc.reviewed_at).toLocaleString()}
                      </p>
                      {selectedDoc.admin_notes && (
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="font-medium">Notes:</span> {selectedDoc.admin_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Review Form */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Decision</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-1">(required for rejection, optional for approval)</span>
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add approval comments or rejection reason..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {adminNotes.length} characters
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button
                      onClick={() => handleVerifyDocument(selectedDoc.id, true)}
                      disabled={verifying || loading}
                      className="btn btn-success text-white"
                      title="Approve this document"
                    >
                      {verifying ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Processing...
                        </>
                      ) : (
                        "✓ Approve"
                      )}
                    </button>
                    <button
                      onClick={() => handleVerifyDocument(selectedDoc.id, false)}
                      disabled={verifying || loading || !adminNotes.trim()}
                      className="btn btn-error text-white"
                      title="Reject this document (requires notes)"
                    >
                      {verifying ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Processing...
                        </>
                      ) : (
                        "✗ Reject"
                      )}
                    </button>
                  </div>

                  {/* Quick switch button */}
                  {documents.filter((d) => filterType === "all" ? true : d.document_type === filterType).length > 1 && (
                    <button
                      onClick={switchToNextDocument}
                      disabled={verifying}
                      className="w-full btn btn-sm btn-info text-white mb-3"
                    >
                      Next Document →
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedDoc(null);
                      setAdminNotes("");
                    }}
                    disabled={verifying}
                    className="w-full btn btn-ghost"
                  >
                    Deselect Document
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Document Selected</h3>
                <p className="text-gray-600">
                  Select a document from the list on the left to review and approve or reject it.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  Use the tabs above to filter by document type for faster navigation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}