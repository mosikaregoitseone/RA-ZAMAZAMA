/**
 * Trust Score Management Utilities
 * Updated for RA ZAMAZAMA (NO facial recognition system)
 */

import { supabase } from "../lib/supabase";

// ============================================
// DATABASE TYPES
// ============================================
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  deleted_for: string[]; // Array of user IDs who have hidden this message
}

export interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  university: string;
  campus: string;
  student_number: string;
  bio?: string;
  profile_picture_url?: string;
  trust_score: number;
  email_verified: boolean;
  student_verified: boolean;
  identity_verified: boolean;
  role: 'user' | 'admin' | 'superadmin';
  verification_status: 'not_started' | 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  condition?: string;
  status: 'active' | 'sold' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  category: 'Electronics' | 'Textbooks' | 'Furniture' | 'Food' | 'Services' | 'Other';
  image?: File;
  condition?: string;
}

export interface TrustScoreAction {
  action_type: string;
  points: number;
  description: string;
}

/**
 * TRUST SCORE SYSTEM (0 - 1000)
 */
export const TRUST_SCORE_ACTIONS = {
  // =========================
  // EMAIL + VERIFICATION
  // =========================
  EMAIL_VERIFIED: {
    action_type: "email_verified",
    points: 100,
    description: "Student email verified",
  },

  STUDENT_VERIFIED: {
    action_type: "student_verified",
    points: 250,
    description: "Student documents approved",
  },

  IDENTITY_VERIFIED: {
    action_type: "identity_verified",
    points: 150,
    description: "Identity verified (selfie + student card)",
  },

  // =========================
  // TRANSACTIONS
  // =========================
  SUCCESSFUL_SALE: {
    action_type: "successful_sale",
    points: 10,
    description: "Successful sale completed",
  },

  SUCCESSFUL_PURCHASE: {
    action_type: "successful_purchase",
    points: 5,
    description: "Successful purchase completed",
  },

  FIRST_TRANSACTION: {
    action_type: "first_transaction",
    points: 20,
    description: "First successful transaction",
  },

  // =========================
  // REVIEWS
  // =========================
  POSITIVE_REVIEW: {
    action_type: "positive_review",
    points: 10,
    description: "Positive review received",
  },

  NEGATIVE_REVIEW: {
    action_type: "negative_review",
    points: -15,
    description: "Negative review received",
  },

  // =========================
  // DISPUTES / FRAUD
  // =========================
  DISPUTE_LOST: {
    action_type: "dispute_lost",
    points: -50,
    description: "Lost dispute case",
  },

  FRAUD_CONFIRMED: {
    action_type: "fraud_confirmed",
    points: -100,
    description: "Fraud confirmed",
  },

  SCAM_REPORT: {
    action_type: "scam_report",
    points: -30,
    description: "Scam report filed",
  },
};

/**
 * Initialize trust score for new users
 */
export async function initializeTrustScore(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("trust_scores").insert({
      user_id: userId,
      score: 0,
      last_calculated: new Date().toISOString(),
    });

    if (error) {
      console.error("Trust score init error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

/**
 * Get current score
 */
export async function getTrustScore(userId: string): Promise<number> {
  const { data } = await supabase
    .from("trust_scores")
    .select("score")
    .eq("user_id", userId)
    .single();

  return data?.score ?? 0;
}

/**
 * Update trust score (0 - 1000 clamp)
 */
export async function updateTrustScore(
  userId: string,
  action: TrustScoreAction
): Promise<number | null> {
  const current = await getTrustScore(userId);

  const newScore = Math.max(
    0,
    Math.min(1000, current + action.points)
  );

  const { error } = await supabase
    .from("trust_scores")
    .update({
      score: newScore,
      last_calculated: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error(error);
    return null;
  }

  return newScore;
}

/**
 * Convenience wrappers
 */
export async function markEmailVerified(userId: string) {
  return updateTrustScore(
    userId,
    TRUST_SCORE_ACTIONS.EMAIL_VERIFIED
  );
}

export async function markStudentVerified(userId: string) {
  return updateTrustScore(
    userId,
    TRUST_SCORE_ACTIONS.STUDENT_VERIFIED
  );
}

export async function markIdentityVerified(userId: string) {
  return updateTrustScore(
    userId,
    TRUST_SCORE_ACTIONS.IDENTITY_VERIFIED
  );
}

