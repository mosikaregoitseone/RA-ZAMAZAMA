// src/services/userService.ts

import { supabase } from '../lib/supabase';
import type { UserProfile, UserVerification, AdminAccount } from '../types';

/**
 * Fetch user profile by ID
 */
export async function fetchUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as UserProfile) || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Create user profile
 */
export async function createUserProfile(
  userId: string,
  profile: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        ...profile,
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * Fetch user role
 */
export async function fetchUserRole(userId: string): Promise<string> {
  try {
    // Try user_roles table first
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.role) {
      return data.role;
    }

    // Fallback to user_profiles
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    return profileData?.role || 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'user';
  }
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const role = await fetchUserRole(userId);
    return role === 'admin' || role === 'superadmin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if user is superadmin
 */
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  try {
    const role = await fetchUserRole(userId);
    return role === 'superadmin';
  } catch (error) {
    console.error('Error checking superadmin status:', error);
    return false;
  }
}

/**
 * Fetch user verification status
 */
export async function fetchUserVerification(
  userId: string
): Promise<UserVerification | null> {
  try {
    const { data, error } = await supabase
      .from('user_verifications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as UserVerification) || null;
  } catch (error) {
    console.error('Error fetching user verification:', error);
    throw error;
  }
}

/**
 * Update user verification status
 */
export async function updateUserVerification(
  userId: string,
  updates: Partial<UserVerification>
): Promise<UserVerification> {
  try {
    const { data, error } = await supabase
      .from('user_verifications')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserVerification;
  } catch (error) {
    console.error('Error updating user verification:', error);
    throw error;
  }
}

/**
 * Upsert user verification (create if doesn't exist)
 */
export async function upsertUserVerification(
  userId: string,
  data: Partial<UserVerification>
): Promise<UserVerification> {
  try {
    const { data: result, error } = await supabase
      .from('user_verifications')
      .upsert(
        {
          user_id: userId,
          ...data,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return result as UserVerification;
  } catch (error) {
    console.error('Error upserting user verification:', error);
    throw error;
  }
}

/**
 * Fetch user trust score
 */
export async function fetchUserTrustScore(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('trust_scores')
      .select('current_score')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.current_score || 50;
  } catch (error) {
    console.error('Error fetching trust score:', error);
    return 50;
  }
}

/**
 * Update user trust score
 */
export async function updateTrustScore(
  userId: string,
  newScore: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('trust_scores')
      .update({ current_score: newScore })
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating trust score:', error);
    throw error;
  }
}

/**
 * Fetch multiple user profiles
 */
export async function fetchUserProfiles(
  userIds: string[]
): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', userIds);

    if (error) throw error;
    return (data as UserProfile[]) || [];
  } catch (error) {
    console.error('Error fetching multiple profiles:', error);
    throw error;
  }
}

/**
 * Search users by name or email
 */
export async function searchUsers(query: string): Promise<UserProfile[]> {
  if (!query || query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(
        `full_name.ilike.%${query}%,email.ilike.%${query}%`
      )
      .limit(20);

    if (error) throw error;
    return (data as UserProfile[]) || [];
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Get all verified users count
 */
export async function getVerifiedUsersCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting verified users count:', error);
    return 0;
  }
}

/**
 * Get all users count
 */
export async function getAllUsersCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting all users count:', error);
    return 0;
  }
}

/**
 * Fetch admin account
 */
export async function fetchAdminAccount(
  userId: string
): Promise<AdminAccount | null> {
  try {
    const { data, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as AdminAccount) || null;
  } catch (error) {
    console.error('Error fetching admin account:', error);
    throw error;
  }
}

/**
 * Update user verification status (for admin approval)
 */
export async function setUserVerified(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_verified: true,
        verification_date: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error setting user as verified:', error);
    throw error;
  }
}

/**
 * Get user activity (last login, created date, etc.)
 */
export async function getUserActivity(userId: string) {
  try {
    const profile = await fetchUserProfile(userId);
    return {
      createdAt: profile?.created_at,
      updatedAt: profile?.updated_at,
      transactionCount: profile?.transaction_count || 0,
      reputationScore: profile?.reputation_score || 0,
    };
  } catch (error) {
    console.error('Error getting user activity:', error);
    return null;
  }
}