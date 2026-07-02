// src/services/verificationService.ts
// 100% Schema Aligned Verification Service
// Mirrors database: user_verifications, verification_documents, user_roles, user_profiles

import { supabase } from "../lib/supabase";

import {
  VerificationStatus,
  REQUIRED_DOCUMENTS,
  MAX_DOCUMENT_ATTEMPTS,
  type VerificationStatusType,
  type DocumentTypeValue,
} from "../lib/verificationConstants";

// ---------- Error helpers ----------
// Supabase/PostgREST errors often don't stringify well in the browser console,
// which is why you might see `{}`. These helpers normalize them into readable messages.
type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  status?: number;
} & Record<string, any>;

function formatSupabaseError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "Unknown error";

  const e = err as SupabaseErrorLike;
  const parts: string[] = [];
  if (e.message) parts.push(e.message);
  if (e.details) parts.push(`details: ${e.details}`);
  if (e.hint) parts.push(`hint: ${e.hint}`);
  if (e.code) parts.push(`code: ${e.code}`);
  if (typeof e.status === "number") parts.push(`status: ${e.status}`);

  if (parts.length) return parts.join(" | ");

  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

function firstRpcRow<T = any>(data: any): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return data as T;
}

// ---------- DB-aligned types ----------

// Mirrors public.user_verifications (PostgreSQL schema)
export interface UserVerification {
  id: string;
  user_id: string;
  verification_status: VerificationStatusType; // 'pending', 'approved', 'rejected'

  email_verified: boolean;
  email_verified_at: string | null;
  email_domain: string | null;

  documents_verified: boolean;
  documents_verified_at: string | null;
  documents_rejected_count: number | null;

  student_card_status: VerificationStatusType | null;
  student_card_attempt: number | null;
  registration_proof_status: VerificationStatusType | null;
  registration_proof_attempt: number | null;
  fee_statement_status: VerificationStatusType | null;
  fee_statement_attempt: number | null;

  identity_verified: boolean;
  identity_verified_at: string | null;

  reviewed_by: string | null;
  reviewed_at: string | null;

  verification_reminder_dismissed: boolean | null;

  created_at: string;
  updated_at: string;
}

// Mirrors public.verification_documents (PostgreSQL schema)
export interface VerificationDocument {
  id: string;
  user_id: string;
  document_type: DocumentTypeValue; // 'student_card', 'registration_proof', 'fee_statement'
  file_url: string;
  file_size_kb: number | null;
  status: VerificationStatusType; // 'pending', 'approved', 'rejected'
  attempt_number: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

// Mirrors public.verification_history
export interface VerificationHistoryEntry {
  id: string;
  user_id: string;
  admin_id: string | null;
  action: string;
  notes: string | null;
  created_at: string;
}

// Input for submitDocument (exported for hook + form consumers)
export type SubmitDocumentInput = {
  userId: string;
  documentType: DocumentTypeValue;
  fileUrl: string;
  fileSizeKb?: number;
};

// RPC Response Type
export interface ApproveDocumentResponse {
  success: boolean;
  message: string;
  user_approved: boolean;
  user_id: string;
}

export interface RejectDocumentResponse {
  success: boolean;
  message: string;
  user_id: string;
}

// ---------- Single verification check ----------
export function isUserVerified(v: UserVerification | null): boolean {
  return v?.verification_status === VerificationStatus.Approved;
}

// ---------- Reads ----------

/**
 * Fetch user verification record
 * Maps to: SELECT * FROM user_verifications WHERE user_id = $1
 */
export async function fetchVerificationStatus(userId: string): Promise<UserVerification | null> {
  try {
    const { data, error } = await supabase
      .from("user_verifications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as UserVerification) || null;
  } catch (error) {
    console.error("Error fetching verification status:", error);
    throw error;
  }
}

/**
 * Fetch all pending documents (admin view)
 * Maps to: SELECT * FROM verification_documents WHERE status = 'pending'
 */
export async function fetchPendingDocuments(
  institutionFilter?: string
): Promise<VerificationDocument[]> {
  try {
    let q = supabase
      .from("verification_documents")
      .select(
        `
      id, user_id, document_type, file_url, file_size_kb, status,
      attempt_number, reviewed_by, reviewed_at, admin_notes, uploaded_at, created_at, updated_at
    `
      )
      .eq("status", VerificationStatus.Pending)
      .order("uploaded_at", { ascending: false });

    if (institutionFilter) {
      // Note: This would need a JOIN in production. Supabase doesn't support direct table joins in this context.
      // Filter is applied client-side instead
      console.warn("Institution filter is applied client-side");
    }

    const { data, error } = await q;
    if (error) throw error;

    return (data || []) as VerificationDocument[];
  } catch (error) {
    console.error("Error fetching pending documents:", error);
    throw error;
  }
}

/**
 * Fetch pending documents for a specific user
 * Maps to: SELECT * FROM verification_documents WHERE user_id = $1 AND status = 'pending'
 */
export async function fetchUserPendingDocuments(userId: string): Promise<VerificationDocument[]> {
  try {
    const { data, error } = await supabase
      .from("verification_documents")
      .select("*")
      .eq("user_id", userId)
      .eq("status", VerificationStatus.Pending)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return (data || []) as VerificationDocument[];
  } catch (error) {
    console.error("Error fetching user pending documents:", error);
    throw error;
  }
}

// Back-compat alias
export const fetchUserDocuments = fetchUserPendingDocuments;

/**
 * Fetch all documents for a user (including approved/rejected)
 * Maps to: SELECT * FROM verification_documents WHERE user_id = $1
 */
export async function fetchUserAllDocuments(userId: string): Promise<VerificationDocument[]> {
  try {
    const { data, error } = await supabase
      .from("verification_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as VerificationDocument[];
  } catch (error) {
    console.error("Error fetching user documents:", error);
    throw error;
  }
}

// ---------- Writes ----------

/**
 * Submit a document to the database
 * Maps to: INSERT INTO verification_documents (...)
 */
export async function submitDocument(input: SubmitDocumentInput): Promise<VerificationDocument> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("verification_documents")
      .insert({
        user_id: input.userId,
        document_type: input.documentType,
        file_url: input.fileUrl,
        file_size_kb: input.fileSizeKb || null,
        status: VerificationStatus.Pending,
        attempt_number: 1,
        uploaded_at: now,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .maybeSingle();

    if (error) throw error;

    const document = (data as VerificationDocument) || null;
    if (!document) throw new Error("Document submission failed: no data returned");

    return document;
  } catch (error) {
    console.error("Error submitting document:", error);
    throw error;
  }
}

/**
 * Approve a document via RPC function
 * Calls: approve_document(p_document_id, p_admin_notes)
 * Returns: success, message, user_approved, user_id
 */
export async function approveDocument(
  documentId: string,
  notes?: string
): Promise<{
  success: boolean;
  userApproved: boolean;
  userId: string;
  message: string;
}> {
  try {
    const { data, error } = await supabase.rpc("approve_document", {
      p_document_id: documentId,
      p_admin_notes: notes ?? null,
    });

    if (error) {
      // Log the raw object for debugging, but throw a readable message.
      console.error("RPC error in approveDocument:", error);
      throw new Error(`approve_document RPC error: ${formatSupabaseError(error)}`);
    }

    // PostgREST returns either an array (table return) or an object (single row).
    const row = firstRpcRow<ApproveDocumentResponse>(data);
    if (!row) {
      throw new Error("approve_document RPC returned no data");
    }
    if (!row.success) {
      throw new Error(row.message || "approve_document RPC failed");
    }

    return {
      success: true,
      userApproved: !!row.user_approved,
      userId: row.user_id,
      message: row.message,
    };
  } catch (error) {
    // Ensure we always throw a real Error with a useful message.
    const message = formatSupabaseError(error);
    console.error("Error approving document:", error);
    throw new Error(message);
  }
}

/**
 * Reject a document via RPC function
 * Calls: reject_document(p_document_id, p_admin_notes)
 * Returns: success, message, user_id
 */
export async function rejectDocument(
  documentId: string,
  notes: string
): Promise<{
  success: boolean;
  userId: string;
  message: string;
}> {
  try {
    if (!notes || notes.trim().length === 0) {
      throw new Error("Rejection reason is required");
    }

    const { data, error } = await supabase.rpc("reject_document", {
      p_document_id: documentId,
      p_admin_notes: notes,
    });

    if (error) {
      console.error("RPC error in rejectDocument:", error);
      throw new Error(`reject_document RPC error: ${formatSupabaseError(error)}`);
    }

    const row = firstRpcRow<RejectDocumentResponse>(data);
    if (!row) {
      throw new Error("reject_document RPC returned no data");
    }
    if (!row.success) {
      throw new Error(row.message || "reject_document RPC failed");
    }

    return {
      success: true,
      userId: row.user_id,
      message: row.message,
    };
  } catch (error) {
    const message = formatSupabaseError(error);
    console.error("Error rejecting document:", error);
    throw new Error(message);
  }
}

// ---------- Manual approval/rejection (admin override) ----------

/**
 * Manually approve a user (admin override)
 * Calls: approve_user_manual(p_user_id, p_notes)
 */
export async function approveUserManual(userId: string, notes?: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("approve_user_manual", {
      p_user_id: userId,
      p_notes: notes ?? null,
    });

    if (error) {
      console.error("RPC error in approveUserManual:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error approving user manually:", error);
    throw error;
  }
}

/**
 * Manually reject a user (admin override)
 * Calls: reject_user_manual(p_user_id, p_notes)
 */
export async function rejectUserManual(userId: string, notes: string): Promise<void> {
  try {
    if (!notes || notes.trim().length === 0) {
      throw new Error("Rejection reason is required");
    }

    const { error } = await supabase.rpc("reject_user_manual", {
      p_user_id: userId,
      p_notes: notes,
    });

    if (error) {
      console.error("RPC error in rejectUserManual:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error rejecting user manually:", error);
    throw error;
  }
}

// ---------- Document upload utilities ----------

/**
 * Upload student document to storage and create database record
 * 1. Validates file (size, type)
 * 2. Checks for existing pending documents
 * 3. Checks attempt count
 * 4. Uploads to storage: verification-documents bucket
 * 5. Creates verification_documents row
 */
export async function uploadStudentDocument(
  userId: string,
  documentType: DocumentTypeValue,
  file: File
): Promise<{
  success: boolean;
  documentId?: string;
  message: string;
}> {
  try {
    // Validate file size (5MB max)
    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return {
        success: false,
        message: "File size exceeds 5MB limit",
      };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        message: "Only JPG, PNG, and PDF files are allowed",
      };
    }

    // Check for existing pending documents of this type
    const { data: existingDocs, error: checkError } = await supabase
      .from("verification_documents")
      .select("id, attempt_number")
      .eq("user_id", userId)
      .eq("document_type", documentType)
      .eq("status", "pending");

    if (checkError) {
      return {
        success: false,
        message: "Failed to check existing documents",
      };
    }

    if (existingDocs && existingDocs.length > 0) {
      return {
        success: false,
        message: "You already have a pending document of this type. Please wait for review.",
      };
    }

    // Get rejected documents to count attempts
    const { data: rejectedDocs, error: rejectError } = await supabase
      .from("verification_documents")
      .select("attempt_number")
      .eq("user_id", userId)
      .eq("document_type", documentType)
      .eq("status", "rejected");

    if (rejectError) {
      return {
        success: false,
        message: "Failed to check document history",
      };
    }

    const attemptNumber = (rejectedDocs?.length || 0) + 1;

    if (attemptNumber > MAX_DOCUMENT_ATTEMPTS) {
      return {
        success: false,
        message: `You have reached the maximum number of resubmissions (${MAX_DOCUMENT_ATTEMPTS}) for this document type. Please contact support.`,
      };
    }

    // Upload file to storage
    const timestamp = Date.now();
    const filename = `${userId}/${documentType}/${timestamp}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(filename, file, { upsert: false });

    if (uploadError) {
      return {
        success: false,
        message: `Failed to upload document: ${uploadError.message}`,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("verification-documents").getPublicUrl(filename);

    const fileUrl = urlData?.publicUrl || "";

    // Create database record
    const document = await submitDocument({
      userId,
      documentType,
      fileUrl,
      fileSizeKb: Math.ceil(file.size / 1024),
    });

    return {
      success: true,
      documentId: document.id,
      message: `Document uploaded successfully (Attempt ${attemptNumber}/${MAX_DOCUMENT_ATTEMPTS})`,
    };
  } catch (err) {
    console.error("Error uploading student document:", err);
    return {
      success: false,
      message:
        "An error occurred while uploading the document: " +
        (err instanceof Error ? err.message : "Unknown error"),
    };
  }
}

/**
 * Get pending documents for admin review with user profile data
 * Joins verification_documents with user_profiles
 */
export async function getPendingDocumentsForReview(institutionFilter?: string) {
  try {
    // Fetch pending documents
    const { data: documents, error: docsError } = await supabase
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
      .order("uploaded_at", { ascending: false });

    if (docsError) {
      console.error("Failed to fetch pending documents:", docsError);
      return [];
    }

    if (!documents || documents.length === 0) return [];

    // Get unique user IDs
    const userIds = [...new Set(documents.map((doc: any) => doc.user_id))];

    // Fetch associated user profiles
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        `
        id,
        full_name,
        email,
        university,
        institution,
        trust_score,
        is_verified
      `
      )
      .in("id", userIds);

    if (profileError) {
      console.error("Failed to fetch user profiles:", profileError);
      return [];
    }

    // Merge documents with profiles
    const merged = documents.map((doc: any) => {
      const profile = profiles?.find((p: any) => p.id === doc.user_id) || null;
      return {
        ...doc,
        user_profiles: profile
          ? {
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
              university: profile.university,
              institution: profile.institution,
              trust_score: profile.trust_score,
              is_verified: profile.is_verified,
            }
          : null,
      };
    });

    // Apply institution filter if provided
    if (!institutionFilter) return merged;

    return merged.filter((doc: any) => {
      const profileInstitution = doc.user_profiles?.university || doc.user_profiles?.institution;
      return profileInstitution === institutionFilter;
    });
  } catch (err) {
    console.error("Error fetching pending documents for review:", err);
    return [];
  }
}

/**
 * Review document (legacy method using direct update)
 * Note: New implementations should use approveDocument/rejectDocument RPC instead
 */
export async function reviewDocument(request: {
  documentId: string;
  status: "approved" | "rejected";
  adminNotes?: string;
  adminId: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const now = new Date().toISOString();

    // Update document status
    const { data, error } = await supabase
      .from("verification_documents")
      .update({
        status: request.status,
        reviewed_by: request.adminId,
        reviewed_at: now,
        admin_notes: request.adminNotes || null,
        updated_at: now,
      })
      .eq("id", request.documentId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: `Failed to review document: ${error.message}`,
      };
    }

    if (request.status === "rejected") {
      return {
        success: true,
        message: "Document rejected. User can resubmit.",
      };
    }

    // If approved, check if all required docs are now approved
    const userId = data.user_id;
    const { data: allDocs } = await supabase
      .from("verification_documents")
      .select("document_type, status")
      .eq("user_id", userId);

    const allApproved =
      allDocs &&
      allDocs.some((d: any) => d.document_type === "student_card" && d.status === "approved") &&
      allDocs.some((d: any) => d.document_type === "registration_proof" && d.status === "approved") &&
      allDocs.some((d: any) => d.document_type === "fee_statement" && d.status === "approved");

    if (allApproved) {
      // Auto-verify user
      await supabase
        .from("user_verifications")
        .update({
          documents_verified: true,
          documents_verified_at: now,
          verification_status: "approved",
          reviewed_by: request.adminId,
          reviewed_at: now,
        })
        .eq("user_id", userId);

      // Update user profile
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("trust_score")
        .eq("id", userId)
        .single();

      if (userProfile) {
        await supabase
          .from("user_profiles")
          .update({
            trust_score: Math.min(100, (userProfile.trust_score || 50) + 30),
            verification_badge_student: true,
            is_verified: true,
            verification_status: "approved",
            verification_date: now,
          })
          .eq("id", userId);

        // Log trust score history
        await supabase.from("trust_score_history").insert({
          user_id: userId,
          points_change: 30,
          new_score: Math.min(100, (userProfile.trust_score || 50) + 30),
          action_type: "documents_approved",
          action_description: "All required documents verified",
        });
      }
    }

    return {
      success: true,
      message: "Document approved successfully",
    };
  } catch (err) {
    console.error("Error reviewing document:", err);
    return {
      success: false,
      message: "An error occurred while reviewing the document",
    };
  }
}
