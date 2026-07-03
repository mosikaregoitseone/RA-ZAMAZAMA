'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

import { multipleAccounts } from '../../../lib/multipleAccounts';
import { initializeTrustScore } from '../../../lib/trustScoreUtils';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically handles the OAuth callback
        // The session is set when the page loads
    
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (!session) {
          setError('No session found. Please try logging in again.');
          setLoading(false);
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        const user = session.user;

        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // If new user (OAuth signup), create profile
        if (!existingProfile) {
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert([
              {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || '',
              },
            ]);

          if (createError) {
            console.error('Failed to create profile:', createError);
          }

          // Initialize trust score
          await initializeTrustScore(user.id);
        }

        // Store account for multi-account support
        multipleAccounts.saveAccount(user, session);

        // Redirect to profile setup if new user, else to home
        if (!existingProfile) {
          router.push('/profile-setup');
        } else if (!existingProfile.profile_picture_url) {
          // If user exists but has no profile picture, go to setup
          router.push('/profile-setup');
        } else {
          // User is complete, go to home
          router.push('/');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        setLoading(false);
      }
    };

    handleCallback();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <h1>Completing Sign In...</h1>
        <p>Please wait while we verify your account.</p>
        <div style={{ marginTop: '20px', width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ color: '#dc2626' }}>Sign In Failed</h1>
        <p style={{ marginTop: '10px', color: '#666' }}>{error}</p>
        <button
          onClick={() => router.push('/login')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return null;
}
