'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { multipleAccounts } from '../../lib/multipleAccounts';
import { initializeTrustScore } from '../../lib/trustScoreUtils';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [oauthLoading, setOAuthLoading] = useState<'google' | 'github' | null>(null);

  const handleEmailSignUp = async () => {
    setError(''); setSuccess('');
    if (!email || !password || !confirmPassword) { setError('Please fill in all fields'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) { setError(signupError.message); setLoading(false); return; }
      const user = data.user;
      if (user) {
        await supabase.from('user_profiles').insert([{ id: user.id, email: user.email, full_name: '' }]);
        await initializeTrustScore(user.id);
        if (data.session) multipleAccounts.saveAccount(user, data.session);
        setSuccess('Account created successfully! Redirecting to profile setup...');
        setTimeout(() => router.push('/profile-setup'), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'github') => {
    setOAuthLoading(provider); setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) { setError(oauthError.message); setOAuthLoading(null); }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign up failed`);
      setOAuthLoading(null);
    }
  };

  const passwordField = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    show: boolean,
    setShow: (v: boolean) => void
  ) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          onKeyPress={(e) => e.key === 'Enter' && handleEmailSignUp()}
          style={{ width: '100%', padding: '10px 70px 10px 12px', border: '1px solid #d1d5db',
            borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', opacity: loading ? 0.5 : 1 }}
        />
        <button type="button" onClick={() => setShow(!show)}
          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', color: '#2563eb', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer', padding: '6px 8px' }}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#f9fafb' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>Create Account</h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Join RA ZAMAZA and start buying/selling</p>
        </div>

        {error && <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#ecfdf5', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '14px' }}>{success}</div>}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Email</label>
          <input type="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} disabled={loading}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
              fontSize: '14px', boxSizing: 'border-box', opacity: loading ? 0.5 : 1 }} />
        </div>

        {passwordField('Password', password, setPassword, showPassword, setShowPassword)}
        {passwordField('Confirm Password', confirmPassword, setConfirmPassword, showConfirm, setShowConfirm)}

        <button onClick={handleEmailSignUp} disabled={loading}
          style={{ width: '100%', padding: '10px 16px', backgroundColor: loading ? '#9ca3af' : '#2563eb',
            color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px' }}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <span style={{ padding: '0 12px', color: '#9ca3af', fontSize: '14px' }}>Or sign up with</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>

        <button onClick={() => handleOAuthSignUp('google')} disabled={oauthLoading === 'google'}
          style={{ width: '100%', padding: '10px 16px', marginBottom: '12px', backgroundColor: 'white',
            border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600',
            cursor: oauthLoading === 'google' ? 'not-allowed' : 'pointer',
            opacity: oauthLoading === 'google' ? 0.5 : 1 }}>
          {oauthLoading === 'google' ? 'Connecting...' : 'Sign up with Google'}
        </button>

        <button onClick={() => handleOAuthSignUp('github')} disabled={oauthLoading === 'github'}
          style={{ width: '100%', padding: '10px 16px', backgroundColor: 'white',
            border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600',
            cursor: oauthLoading === 'github' ? 'not-allowed' : 'pointer',
            opacity: oauthLoading === 'github' ? 0.5 : 1 }}>
          {oauthLoading === 'github' ? 'Connecting...' : 'Sign up with GitHub'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}