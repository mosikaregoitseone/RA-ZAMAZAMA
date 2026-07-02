// src/lib/auth.ts

import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole as UserRoleType, AuthUser } from '../types';

/**
 * Get current authentication session
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session;
}

/**
 * Get current authenticated user
 */
export async function getCurrentAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Error getting auth user:', error);
    return null;
  }

  return user;
}

/**
 * Fetch user profile from database
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

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as UserProfile | null;
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
}

/**
 * Fetch user role from database
 */
export async function fetchUserRole(userId: string): Promise<UserRoleType> {
  try {
    // First try user_roles table (preferred)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleData?.role) {
      return roleData.role as UserRoleType;
    }

    // Fallback to user_profiles.role
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    return (profileData?.role as UserRoleType) || 'user';
  } catch (error) {
    console.error('Error fetching role:', error);
    return 'user';
  }
}

/**
 * Get complete current user with profile and role
 * This is the main function to use when you need all user data
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const authUser = await getCurrentAuthUser();
    if (!authUser?.id) {
      return null;
    }

    const profile = await fetchUserProfile(authUser.id);
    const role = await fetchUserRole(authUser.id);
    const isVerified = profile?.is_verified || false;
    const isAdmin = role === 'admin' || role === 'superadmin';

    return {
      id: authUser.id,
      email: authUser.email || '',
      profile,
      role,
      isVerified,
      isAdmin,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session?.user?.id;
}

/**
 * Check if user is verified
 */
export async function isUserVerified(userId: string): Promise<boolean> {
  try {
    const profile = await fetchUserProfile(userId);
    return profile?.is_verified || false;
  } catch (error) {
    console.error('Error checking verification:', error);
    return false;
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
 * Sign out user
 */
export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<any> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<any> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw error;
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
}

/**
 * Listen to auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
): (() => void) | null {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => {
    subscription?.unsubscribe();
  };
}

/**
 * Get auth token (for API calls, etc.)
 */
export async function getAuthToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token || null;
}

/**
 * Verify auth token is still valid
 */
export async function verifyAuthToken(): Promise<boolean> {
  try {
    const authUser = await getCurrentAuthUser();
    return !!authUser?.id;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

/**
 * Refresh session
 */
export async function refreshSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.refreshSession();

  if (error) {
    console.error('Error refreshing session:', error);
    throw error;
  }

  return session;
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(metadata: Record<string, any>) {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Centralized auth error handler
 */
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  const message = error.message || '';

  // Map common auth errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email or password is incorrect',
    'Email not confirmed': 'Please verify your email before logging in',
    'User already registered': 'This email is already registered',
    'Password should be at least 6 characters': 'Password must be at least 6 characters',
    'Invalid email': 'Please enter a valid email address',
  };

  return errorMap[message] || message || 'An authentication error occurred';
}