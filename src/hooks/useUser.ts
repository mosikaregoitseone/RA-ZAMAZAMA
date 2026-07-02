// src/hooks/useUser.ts
// FIX: Added verification update listener to invalidate cache when user is approved

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getCurrentUser, onAuthStateChange } from '../lib/auth';
import { fetchUserProfile, fetchUserRole } from '../services/userService';
import { isAdmin } from '../lib/permissions';
import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole, AuthUser } from '../types';

export interface UseUserReturn {
  user: AuthUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isVerified: boolean;
  isAdminUser: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const useUser = (): UseUserReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const verificationChannelRef = useRef<any>(null);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      setProfile(currentUser.profile);
      setRole(currentUser.role);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchUserData();

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange(() => {
      fetchUserData();
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [fetchUserData]);

  // FIX #2: Listen for verification updates from admin approval
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to verification update broadcasts
    const channel = supabase
      .channel(`user:${user.id}`)
      .on('broadcast', { event: 'verification_updated' }, (payload) => {
        console.log('Verification update received:', payload);
        // Refetch user data when verification is updated
        fetchUserData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to verification updates for user ${user.id}`);
        }
      });

    verificationChannelRef.current = channel;

    return () => {
      if (verificationChannelRef.current) {
        supabase.removeChannel(verificationChannelRef.current);
      }
    };
  }, [user?.id, fetchUserData]);

  return {
    user,
    profile,
    role,
    isVerified: profile?.is_verified || false,
    isAdminUser: isAdmin(role),
    isSuperAdmin: role === 'superadmin',
    loading,
    error,
    refetch: fetchUserData,
  };
};

export default useUser;