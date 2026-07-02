'use client';

export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { multipleAccounts } from '../../lib/multipleAccounts';
import Link from 'next/link';

type LoginMethod = 'email' | 'oauth' | 'magic-link';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

  const [oauthLoading, setOAuthLoading] = useState<'google' | 'github' | null>(null);
  const [activeTab, setActiveTab] = useState<LoginMethod>('email');

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) { setError(loginError.message); setLoading(false); return; }

      if (data.user && data.session) {
        multipleAccounts.saveAccount(data.user, data.session);

        // FIX: profile is "complete" when full_name + institution are present.
        // profile_picture_url is optional and was incorrectly used as the gate.
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, institution')
          .eq('id', data.user.id)
          .single();

        if (!profile?.full_name || !profile?.institution) {
          router.push('/profile-setup');
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async () => {
    if (!magicLinkEmail) { setError('Please enter your email'); return; }
    setMagicLinkLoading(true); setError('');
    try {
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (magicError) { setError(magicError.message); setMagicLinkLoading(false); return; }
      setMagicLinkSent(true); setMagicLinkLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
      setMagicLinkLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setOAuthLoading(provider); setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) { setError(oauthError.message); setOAuthLoading(null); }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign in failed`);
      setOAuthLoading(null);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#f9fafb' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>Welcome Back</h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Sign in to your RA ZAMAZA account</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={() => { setActiveTab('email'); setError(''); }}
            style={{ flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent',
              borderBottom: activeTab === 'email' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'email' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'email' ? '600' : '500', cursor: 'pointer' }}>Email</button>
          <button onClick={() => { setActiveTab('magic-link'); setError(''); }}
            style={{ flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent',
              borderBottom: activeTab === 'magic-link' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'magic-link' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'magic-link' ? '600' : '500', cursor: 'pointer' }}>Magic Link</button>
        </div>

        {error && (
          <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2',
            border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>{error}</div>
        )}

        {activeTab === 'email' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} disabled={loading}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', boxSizing: 'border-box', opacity: loading ? 0.5 : 1 }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailLogin()}
                  style={{ width: '100%', padding: '10px 70px 10px 12px', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', opacity: loading ? 0.5 : 1 }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', color: '#2563eb', fontSize: '13px',
                    fontWeight: 600, cursor: 'pointer', padding: '6px 8px' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button onClick={handleEmailLogin} disabled={loading}
              style={{ width: '100%', padding: '10px 16px', backgroundColor: loading ? '#9ca3af' : '#2563eb',
                color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px' }}>
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </div>
        )}

        {activeTab === 'magic-link' && (
          <div>
            {!magicLinkSent ? (
              <>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  Enter your email to receive a magic link (valid for 15 minutes)
                </p>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Email</label>
                  <input type="email" placeholder="you@example.com" value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)} disabled={magicLinkLoading}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
                      fontSize: '14px', boxSizing: 'border-box', opacity: magicLinkLoading ? 0.5 : 1 }} />
                </div>
                <button onClick={handleMagicLinkLogin} disabled={magicLinkLoading}
                  style={{ width: '100%', padding: '10px 16px', backgroundColor: magicLinkLoading ? '#9ca3af' : '#2563eb',
                    color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
                    cursor: magicLinkLoading ? 'not-allowed' : 'pointer' }}>
                  {magicLinkLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </>
            ) : (
              <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '1px solid #86efac',
                borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: '#166534', fontWeight: '600', marginBottom: '8px' }}>Check Your Email!</p>
                <p style={{ color: '#22863a', fontSize: '14px' }}>We sent a magic link to <strong>{magicLinkEmail}</strong></p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'email' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
              <span style={{ padding: '0 12px', color: '#9ca3af', fontSize: '14px' }}>Or continue with</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
            </div>

            <button onClick={() => handleOAuthSignIn('google')} disabled={oauthLoading === 'google'}
              style={{ width: '100%', padding: '10px 16px', marginBottom: '12px', backgroundColor: 'white',
                border: '1px solid #d1d5db', borderRadius: '8px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px', fontWeight: '600',
                cursor: oauthLoading === 'google' ? 'not-allowed' : 'pointer',
                opacity: oauthLoading === 'google' ? 0.5 : 1 }}>
              {oauthLoading === 'google' ? 'Connecting...' : 'Sign in with Google'}
            </button>

            <button onClick={() => handleOAuthSignIn('github')} disabled={oauthLoading === 'github'}
              style={{ width: '100%', padding: '10px 16px', backgroundColor: 'white',
                border: '1px solid #d1d5db', borderRadius: '8px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px', fontWeight: '600',
                cursor: oauthLoading === 'github' ? 'not-allowed' : 'pointer',
                opacity: oauthLoading === 'github' ? 0.5 : 1 }}>
              {oauthLoading === 'github' ? 'Connecting...' : 'Sign in with GitHub'}
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Sign up</Link>
        </p>
      </div>
    </main>
  );
}