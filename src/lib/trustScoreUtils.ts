/**
 * Trust Score Utilities
 * Calculate and manage user trust scores based on verification, transactions, and behavior
 */

import { supabase } from './supabase';

export interface TrustScoreBreakdown {
  baseScore: number;
  emailVerified: number;
  documentsVerified: number;
  identityVerified: number;
  successfulTransactions: number;
  rating: number;
  accountAge: number;
  noDisputes: number;
  campusVerified: number;
  deductions: number;
  totalScore: number;
}

/**
 * Initialize trust score for new user
 * Base score: 50 points
 */
export async function initializeTrustScore(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        trust_score: 50,
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to initialize trust score:', error);
    }
  } catch (err) {
    console.error('Error initializing trust score:', err);
  }
}

/**
 * Calculate trust score based on multiple factors
 * Should be called daily or when verification/transaction status changes
 */
export async function calculateTrustScore(userId: string): Promise<TrustScoreBreakdown> {
  try {
    let score: TrustScoreBreakdown = {
      baseScore: 50,
      emailVerified: 0,
      documentsVerified: 0,
      identityVerified: 0,
      successfulTransactions: 0,
      rating: 0,
      accountAge: 0,
      noDisputes: 0,
      campusVerified: 0,
      deductions: 0,
      totalScore: 50,
    };

    // ============================================
    // GET USER DATA
    // ============================================

    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('created_at, institution, rating_average, total_transactions')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Failed to fetch user data:', userError);
      return score;
    }

    // ============================================
    // 1. EMAIL VERIFICATION (+10)
    // ============================================

    const { data: verifications, error: verifyError } = await supabase
      .from('user_verifications')
      .select('email_verified, documents_verified, identity_verified')
      .eq('user_id', userId)
      .single();

    if (!verifyError && verifications?.email_verified) {
      score.emailVerified = 10;
    }

    // ============================================
    // 2. DOCUMENTS VERIFIED (+30)
    // ============================================

    if (!verifyError && verifications?.documents_verified) {
      score.documentsVerified = 30;
    }

    // ============================================
    // 3. IDENTITY VERIFIED (+20)
    // ============================================

    if (!verifyError && verifications?.identity_verified) {
      score.identityVerified = 20;
    }

    // ============================================
    // 4. SUCCESSFUL TRANSACTIONS (+20)
    // ============================================

    if (user?.total_transactions && user.total_transactions >= 5) {
      score.successfulTransactions = 20;
    }

    // ============================================
    // 5. RATING AVERAGE (+15)
    // ============================================

    if (user?.rating_average && user.rating_average >= 4.5) {
      score.rating = 15;
    }

    // ============================================
    // 6. ACCOUNT AGE (+7)
    // ============================================

    if (user?.created_at) {
      const createdDate = new Date(user.created_at);
      const ageInDays = Math.floor(
        (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (ageInDays > 365) {
        score.accountAge = 7;
      }
    }

    // ============================================
    // 7. NO DISPUTES IN LAST 6 MONTHS (+10)
    // ============================================

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: disputes, error: disputeError } = await supabase
      .from('transactions')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .eq('dispute_opened', true)
      .gte('created_at', sixMonthsAgo.toISOString());

    if (!disputeError && disputes && disputes.length === 0) {
      score.noDisputes = 10;
    }

    // ============================================
    // 8. CAMPUS VERIFIED (+5)
    // ============================================

    if (user?.institution) {
      score.campusVerified = 5;
    }

    // ============================================
    // DEDUCTIONS
    // ============================================

    const { data: badTransactions } = await supabase
      .from('transactions')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .eq('status', 'cancelled')
      .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (badTransactions && badTransactions.length >= 3) {
      score.deductions -= 5;
    }

    // ============================================
    // CALCULATE TOTAL
    // ============================================

    score.totalScore = Math.max(
      0,
      Math.min(
        100,
        score.baseScore +
          score.emailVerified +
          score.documentsVerified +
          score.identityVerified +
          score.successfulTransactions +
          score.rating +
          score.accountAge +
          score.noDisputes +
          score.campusVerified +
          score.deductions
      )
    );

    // Update user_profiles with new score
    await supabase
      .from('user_profiles')
      .update({ trust_score: score.totalScore })
      .eq('id', userId);

    return score;
  } catch (err) {
    console.error('Error calculating trust score:', err);
    throw err;
  }
}

/**
 * Get formatted trust score with breakdown
 */
export async function getTrustScoreDisplay(userId: string): Promise<{
  score: number;
  level: string;
  badge: string;
}> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('trust_score')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { score: 50, level: 'New User', badge: '🟡' };
    }

    const score = data.trust_score || 50;
    let level = 'New User';
    let badge = '🟡';

    if (score >= 90) {
      level = 'Excellent';
      badge = '🟢';
    } else if (score >= 75) {
      level = 'Good';
      badge = '🟢';
    } else if (score >= 60) {
      level = 'Fair';
      badge = '🟡';
    } else if (score >= 40) {
      level = 'Below Average';
      badge = '🔴';
    } else {
      level = 'High Risk';
      badge = '🔴';
    }

    return { score, level, badge };
  } catch (err) {
    console.error('Error getting trust score display:', err);
    return { score: 50, level: 'New User', badge: '🟡' };
  }
}

/**
 * Update trust score on transaction completion
 */
export async function updateScoreOnTransaction(
  userId: string,
  transactionType: 'sale' | 'purchase' | 'first_transaction'
): Promise<void> {
  try {
    await calculateTrustScore(userId);
  } catch (err) {
    console.error('Error updating score on transaction:', err);
  }
}

/**
 * Deduct points for negative actions
 */
export async function deductTrustPoints(userId: string, reason: string, points: number): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('trust_score')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const newScore = Math.max(0, (data.trust_score || 50) - points);

      await supabase.from('user_profiles').update({ trust_score: newScore }).eq('id', userId);

      console.log(`Trust score deduction for ${userId}: ${reason} (-${points} points)`);
    }
  } catch (err) {
    console.error('Error deducting trust points:', err);
  }
}

/**
 * Get user's seller level based on sales
 */
export function getSellerLevel(totalSales: number, trustScore: number): string {
  if (trustScore < 50) {
    return 'Restricted';
  }

  if (totalSales >= 50 && trustScore >= 80) {
    return 'Gold Seller';
  }

  if (totalSales >= 10 && trustScore >= 70) {
    return 'Trusted Seller';
  }

  if (totalSales >= 1) {
    return 'Verified Student';
  }

  return 'New User';
}

/**
 * Get risk level for a transaction
 */
export async function getTransactionRiskLevel(buyerId: string, sellerId: string): Promise<{
  buyerRisk: 'low' | 'medium' | 'high';
  sellerRisk: 'low' | 'medium' | 'high';
  overallRisk: 'low' | 'medium' | 'high';
}> {
  try {
    const getBuyerData = supabase
      .from('user_profiles')
      .select('trust_score, created_at')
      .eq('id', buyerId)
      .single();

    const getSellerData = supabase
      .from('user_profiles')
      .select('trust_score, created_at')
      .eq('id', sellerId)
      .single();

    const [buyerResult, sellerResult] = await Promise.all([getBuyerData, getSellerData]);

    const getRiskFromScore = (score: number, createdAt: string): 'low' | 'medium' | 'high' => {
      if (score >= 75) return 'low';
      if (score >= 60) return 'medium';
      if (score < 40) return 'high';

      const ageInDays = Math.floor(
        (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (ageInDays < 7) return 'high';
      if (ageInDays < 30) return 'medium';

      return 'low';
    };

    const buyerRisk = getRiskFromScore(
      buyerResult.data?.trust_score || 50,
      buyerResult.data?.created_at || new Date().toISOString()
    );
    const sellerRisk = getRiskFromScore(
      sellerResult.data?.trust_score || 50,
      sellerResult.data?.created_at || new Date().toISOString()
    );

    const riskLevels = { low: 0, medium: 1, high: 2 };
    const maxRisk = Math.max(riskLevels[buyerRisk], riskLevels[sellerRisk]);
    const overallRisk = Object.keys(riskLevels)[maxRisk] as 'low' | 'medium' | 'high';

    return { buyerRisk, sellerRisk, overallRisk };
  } catch (err) {
    console.error('Error calculating transaction risk:', err);
    return { buyerRisk: 'medium', sellerRisk: 'medium', overallRisk: 'medium' };
  }
}

/**
 * Get trust score tier/badge based on score
 */
export function getTrustScoreTier(score: number): {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  color: string;
  percentage: number;
  description: string;
} {
  if (score >= 85) {
    return { 
      tier: 'Platinum', 
      color: '#4169E1', 
      percentage: 100,
      description: 'Excellent reputation with verified activities'
    };
  }
  if (score >= 70) {
    return { 
      tier: 'Gold', 
      color: '#FFD700', 
      percentage: 85,
      description: 'Very good reputation with solid verification'
    };
  }
  if (score >= 55) {
    return { 
      tier: 'Silver', 
      color: '#C0C0C0', 
      percentage: 70,
      description: 'Decent reputation with basic verification'
    };
  }
  return { 
    tier: 'Bronze', 
    color: '#CD7F32', 
    percentage: 55,
    description: 'New user with limited trust history'
  };
}