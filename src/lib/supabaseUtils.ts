// src/lib/supabaseUtils.ts
// Utility functions for safe Supabase operations and response handling

import { supabase } from "./supabase";

/**
 * Safely flatten Supabase responses that might contain nested arrays
 * Handles cases where relationships are returned as arrays
 */
export function flattenSupabaseResponse<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return [data];
}

/**
 * Safely flatten nested relationship data
 * Converts nested arrays to single objects
 */
export function flattenNestedRelationship<T>(
  data: any,
  relationshipKey: string
): T {
  if (!data) return data;

  return {
    ...data,
    [relationshipKey]: Array.isArray(data[relationshipKey])
      ? data[relationshipKey][0]
      : data[relationshipKey],
  };
}

/**
 * Safely flatten multiple nested relationships
 */
export function flattenMultipleRelationships<T>(
  data: any,
  relationshipKeys: string[]
): T {
  if (!data) return data;

  const flattened = { ...data };

  relationshipKeys.forEach((key) => {
    if (flattened[key]) {
      flattened[key] = Array.isArray(flattened[key])
        ? flattened[key][0]
        : flattened[key];
    }
  });

  return flattened;
}

/**
 * Handle Supabase query with comprehensive error handling
 * This version properly handles Supabase query builders
 */
export async function safeSupabaseQuery<T>(
  queryBuilder: any // Accept any Supabase query builder
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    // Execute the query by calling it (it's already a promise-like)
    const { data, error } = await queryBuilder;

    if (error) {
      return {
        data: null,
        error: new Error(`Database error: ${error.message}`),
      };
    }

    if (!data) {
      return {
        data: null,
        error: new Error("No data returned from database"),
      };
    }

    // Safely convert to array
    const dataArray = flattenSupabaseResponse<T>(data);

    return {
      data: dataArray,
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: new Error(`Unexpected error: ${err.message}`),
    };
  }
}

/**
 * Validate response structure before using
 */
export function validateSupabaseResponse(
  data: any,
  expectedKeys: string[]
): boolean {
  if (!data) return false;

  if (Array.isArray(data)) {
    // Check first item in array
    if (data.length === 0) return false;
    return expectedKeys.every((key) => key in data[0]);
  } else {
    // Check single object
    return expectedKeys.every((key) => key in data);
  }
}

/**
 * Transform Supabase response to expected format
 */
export function transformSupabaseData<T, R>(
  data: T[],
  transformer: (item: T) => R
): R[] {
  return data.map(transformer);
}

/**
 * Document query utilities with proper typing
 */
export const DocumentQueryUtils = {
  /**
   * Get all unverified documents with user info
   */
  async getUnverifiedDocuments() {
    try {
      const { data, error } = await supabase
        .from("verification_documents")
        .select(
          `
          id,
          user_id,
          document_type,
          file_url,
          status,
          admin_notes,
          created_at,
          user_profiles!user_id (
            id,
            full_name,
            email,
            university,
            role
          )
        `
        )
        .neq("status", "approved")
        .neq("status", "rejected")
        .order("created_at", { ascending: false });

      if (error) {
        return {
          documents: null,
          error: new Error(`Failed to fetch documents: ${error.message}`),
        };
      }

      if (!data) {
        return {
          documents: null,
          error: new Error("No documents found"),
        };
      }

      // Safely handle array response and flatten nested data
      const docs = Array.isArray(data) ? data : [data];
      const flattenedDocuments = docs.map((doc: any) => ({
        ...doc,
        user_profiles: Array.isArray(doc.user_profiles)
          ? doc.user_profiles[0]
          : doc.user_profiles,
      }));

      return { documents: flattenedDocuments, error: null };
    } catch (err: any) {
      return {
        documents: null,
        error: new Error(`Unexpected error: ${err.message}`),
      };
    }
  },

  /**
   * Get a single document by ID
   */
  async getDocument(docId: string) {
    try {
      const { data, error } = await supabase
        .from("verification_documents")
        .select(
          `
          id,
          user_id,
          document_type,
          file_url,
          status,
          admin_notes,
          created_at,
          user_profiles:user_id (
            id,
            full_name,
            email,
            university
          )
        `
        )
        .eq("id", docId)
        .single();

      if (error) {
        return {
          document: null,
          error: new Error(`Failed to fetch document: ${error.message}`),
        };
      }

      if (!data) {
        return { document: null, error: new Error("Document not found") };
      }

      // Flatten user_profiles
      const document = {
        ...data,
        user_profiles: Array.isArray((data as any).user_profiles)
          ? (data as any).user_profiles[0]
          : (data as any).user_profiles,
      };

      return { document, error: null };
    } catch (err: any) {
      return {
        document: null,
        error: new Error(`Unexpected error: ${err.message}`),
      };
    }
  },

  /**
   * Update document verification status
   */
  async verifyDocument(docId: string, verified: boolean, notes?: string) {
    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({
          status: verified ? "approved" : "rejected",
          admin_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", docId);

      // Also update user verification status
      if (verified) {
        // Get the user_id from the document
        const { data: doc } = await supabase
          .from("verification_documents")
          .select("user_id")
          .eq("id", docId)
          .single();

        if (doc?.user_id) {
          await supabase
            .from("user_verifications")
            .update({
              documents_verified: true,
              documents_verified_at: new Date().toISOString(),
              verification_status: "documents_approved",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", doc.user_id);
        }
      }

      if (error) {
        return {
          success: false,
          error: new Error(`Failed to verify document: ${error.message}`),
        };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return {
        success: false,
        error: new Error(`Unexpected error: ${err.message}`),
      };
    }
  },

  /**
   * Update user profile verification status
   */
  async updateUserVerificationStatus(userId: string, verified: boolean) {
    try {
      const { error } = await supabase
        .from("user_verifications")
        .update({
          documents_verified: verified,
          documents_verified_at: verified ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        return {
          success: false,
          error: new Error(`Failed to update profile: ${error.message}`),
        };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return {
        success: false,
        error: new Error(`Unexpected error: ${err.message}`),
      };
    }
  },
};

/**
 * Example usage:
 *
 * // Get unverified documents
 * const { documents, error } = await DocumentQueryUtils.getUnverifiedDocuments();
 * if (error) {
 *   console.error(error.message);
 *   return;
 * }
 * setDocuments(documents || []);
 *
 * // Verify a document
 * const { success, error } = await DocumentQueryUtils.verifyDocument(
 *   docId,
 *   true,
 *   "Document looks authentic"
 * );
 * if (error) {
 *   showError(error.message);
 *   return;
 * }
 * showSuccess("Document verified!");
 */

// Export all utilities
export default {
  flattenSupabaseResponse,
  flattenNestedRelationship,
  flattenMultipleRelationships,
  safeSupabaseQuery,
  validateSupabaseResponse,
  transformSupabaseData,
  DocumentQueryUtils,
};
