'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentAdminInfo, isAdminRole } from '../lib/adminUtils';
import { isUserVerified, type UserVerification } from '../services/verificationService';
import RestrictedAccess from './RestrictedAccess';

type Require = 'logged_in' | 'verified';

export default function ProtectedRoute({
  require = 'verified',
  children,
}: {
  require?: Require;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'ok' } | { kind: 'no_user' } | { kind: 'no_verify' }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setState({ kind: 'no_user' });
          return;
        }

        if (require === 'logged_in') {
          if (!cancelled) setState({ kind: 'ok' });
          return;
        }

        // Check if admin - admins bypass verification
        const adminInfo = await getCurrentAdminInfo();
        if (isAdminRole(adminInfo?.role)) {
          if (!cancelled) setState({ kind: 'ok' });
          return;
        }

        // Check verification status
        const { data: verification, error } = await supabase
          .from('user_verifications')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Verification check error:', error);
          if (!cancelled) setState({ kind: 'no_verify' });
          return;
        }

        const verified = isUserVerified(verification as UserVerification | null);
        if (!cancelled) {
          setState(verified ? { kind: 'ok' } : { kind: 'no_verify' });
        }
      } catch (e) {
        console.error('ProtectedRoute auth check failed:', e);
        if (!cancelled) setState({ kind: 'no_verify' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [require]);

  if (state.kind === 'loading')
    return <div className="text-center p-8 text-gray-500">Loading…</div>;
  if (state.kind === 'no_user')
    return (
      <RestrictedAccess
        reason="not_logged_in"
        title="Log in required"
        message="Create an account or log in to use this feature. You can keep browsing the marketplace without an account."
      />
    );
  if (state.kind === 'no_verify')
    return (
      <RestrictedAccess
        reason="not_verified"
        title="Verification required"
        message="Your account needs to be verified for full access. You can browse listings, but posting, buying and messaging stay locked until your verification is approved."
      />
    );
  return <>{children}</>;
}