// src/components/AdminDocumentReview.tsx
// 100% Schema Aligned Admin Document Review Component
// Reusable component for document review modal/panel

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { approveDocument, rejectDocument, getPendingDocumentsForReview } from "../services/verificationService";
import { logAdminAction } from "../services/adminService";
import { ErrorNotification, useNotification } from "./ErrorNotification";

export interface DocumentReviewProps {
  adminId?: string;
  institutionFilter?: string;
  onDocumentApproved?: (userId: string, documentId: string) => void;
  onDocumentRejected?: (userId: string, documentId: string) => void;
  className?: string;
}

interface PendingDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_size_kb?: number;
  status: string;
  attempt_number: number;
  reviewed_by?: string;
  admin_notes?: string;
  reviewed_at?: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    id: string;
    full_name: string;
    email: string;
    university?: string;
    institution?: string;
    trust_score?: number;
    is_verified?: boolean;
  };
}

export const AdminDocumentReview: React.FC<DocumentReviewProps> = ({
  adminId,
  institutionFilter,
  onDocumentApproved,
  onDocumentRejected,
  className = "",
}) => {
  const { notification, showError, showSuccess, clearNotification } = useNotification();
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PendingDocument | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Fetch documents on mount and when filters change
  useEffect(() => {
    fetchDocuments();
  }, [filterType, sortBy, institutionFilter]);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      clearNotification();

      const docs = await getPendingDocumentsForReview(institutionFilter);

      // Apply type filter
      let filtered = docs;
      if (filterType !== "all") {
        filtered = docs.filter((d) => d.document_type === filterType);
      }

      // Apply sort
      filtered.sort((a, b) => {
        const dateA = new Date(a.uploaded_at).getTime();
        const dateB = new Date(b.uploaded_at).getTime();
        return sortBy === "newest" ? dateB - dateA : dateA - dateB;
      });

      setDocuments(filtered);
    } catch (error: any) {
      showError(`Failed to fetch documents: ${error.message}`);
      console.error("Fetch documents error:", error);
    } finally {
      setLoading(false);
    }
  }, [filterType, sortBy, institutionFilter, clearNotification, showError]);

  const handleApprove = useCallback(async () => {
    if (!selectedDoc) return;

    setProcessing(true);
    clearNotification();

    try {
      const result = await approveDocument(selectedDoc.id, adminNotes || undefined);

      if (!result.success) {
        showError(result.message);
        return;
      }

      // Log action
      if (adminId) {
        await logAdminAction(
          adminId,
          "approve_document",
          "verification_document",
          selectedDoc.id,
          {
            document_type: selectedDoc.document_type,
            user_id: selectedDoc.user_id,
            notes: adminNotes,
          }
        );
      }

      showSuccess(
        result.userApproved
          ? "✓ Document approved — User is now verified!"
          : "✓ Document approved"
      );

      // Callback
      if (onDocumentApproved) {
        onDocumentApproved(selectedDoc.user_id, selectedDoc.id);
      }

      // Reset and refresh
      setSelectedDoc(null);
      setAdminNotes("");
      await fetchDocuments();
    } catch (error: any) {
      showError(error.message || "Failed to approve document");
      console.error("Approve error:", error);
    } finally {
      setProcessing(false);
    }
  }, [selectedDoc, adminNotes, adminId, clearNotification, showSuccess, showError, onDocumentApproved, fetchDocuments]);

  const handleReject = useCallback(async () => {
    if (!selectedDoc) return;

    if (!adminNotes.trim()) {
      showError("Please provide a rejection reason");
      return;
    }

    setProcessing(true);
    clearNotification();

    try {
      const result = await rejectDocument(selectedDoc.id, adminNotes);

      if (!result.success) {
        showError(result.message);
        return;
      }

      // Log action
      if (adminId) {
        await logAdminAction(
          adminId,
          "reject_document",
          "verification_document",
          selectedDoc.id,
          {
            document_type: selectedDoc.document_type,
            user_id: selectedDoc.user_id,
            reason: adminNotes,
          }
        );
      }

      showSuccess("✓ Document rejected — User can resubmit");

      // Callback
      if (onDocumentRejected) {
        onDocumentRejected(selectedDoc.user_id, selectedDoc.id);
      }

      // Reset and refresh
      setSelectedDoc(null);
      setAdminNotes("");
      await fetchDocuments();
    } catch (error: any) {
      showError(error.message || "Failed to reject document");
      console.error("Reject error:", error);
    } finally {
      setProcessing(false);
    }
  }, [selectedDoc, adminNotes, adminId, clearNotification, showSuccess, showError, onDocumentRejected, fetchDocuments]);

  const getDocTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      student_card: "Student Card",
      registration_proof: "Registration Proof",
      fee_statement: "Fee Statement",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "approved":
        return "text-green-600 bg-green-50";
      case "rejected":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className={`w-full ${className}`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Document List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header with controls */}
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <h3 className="text-lg font-semibold">Pending Documents</h3>
              <p className="text-blue-100 text-sm mt-1">{documents.length} to review</p>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="all">All Types</option>
                  <option value="student_card">Student Card</option>
                  <option value="registration_proof">Registration Proof</option>
                  <option value="fee_statement">Fee Statement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              <button
                onClick={fetchDocuments}
                disabled={loading}
                className="w-full px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {/* Documents List */}
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {documents.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p className="text-sm">No pending documents</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setAdminNotes("");
                    }}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                      selectedDoc?.id === doc.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate text-sm">
                          {doc.user_profiles?.full_name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {doc.user_profiles?.email}
                        </div>
                      </div>
                      <span
                        className={`badge badge-sm flex-shrink-0 ${
                          doc.status === "pending" ? "badge-warning" : "badge-info"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Type:</span>
                        <span className="font-medium">{getDocTypeLabel(doc.document_type)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Attempt:</span>
                        <span className="font-medium">{doc.attempt_number}/5</span>
                      </div>
                      {doc.file_size_kb && (
                        <div className="flex justify-between text-gray-600">
                          <span>Size:</span>
                          <span className="font-medium">{doc.file_size_kb}KB</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Document Review */}
        <div className="lg:col-span-2">
          {selectedDoc ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <h2 className="text-2xl font-bold">
                  {selectedDoc.user_profiles?.full_name || "User"}
                </h2>
                <p className="text-blue-100 text-sm mt-1">{selectedDoc.user_profiles?.email}</p>
                {selectedDoc.user_profiles?.trust_score !== undefined && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-blue-100 text-sm">Trust Score:</span>
                    <span className="text-lg font-bold">
                      {selectedDoc.user_profiles.trust_score}/100
                    </span>
                  </div>
                )}
              </div>

              {/* Document Details */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Document Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium text-gray-900">
                      {getDocTypeLabel(selectedDoc.document_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Attempt</p>
                    <p className="font-medium text-gray-900">{selectedDoc.attempt_number}/5</p>
                  </div>
                  {selectedDoc.file_size_kb && (
                    <div>
                      <p className="text-sm text-gray-600">File Size</p>
                      <p className="font-medium text-gray-900">{selectedDoc.file_size_kb} KB</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Uploaded</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedDoc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Document Link */}
                <div className="mt-4">
                  <a
                    href={selectedDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
                  >
                    View Document ↗
                  </a>
                </div>
              </div>

              {/* Review Section */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Review Decision</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes {selectedDoc.status !== "pending" && "*"}
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add comments or rejection reason..."
                    disabled={processing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">{adminNotes.length} characters</p>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={processing || loading}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        ✓ Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processing || loading || !adminNotes.trim()}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        ✗ Reject
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedDoc(null);
                    setAdminNotes("");
                  }}
                  disabled={processing}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Deselect
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Document Selected
              </h3>
              <p className="text-gray-600">
                Select a document from the list to review it
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentReview;