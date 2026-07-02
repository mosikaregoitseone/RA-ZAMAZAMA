'use client';

export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { VerificationStatus } from '../../components/VerificationStatus';
import { DocumentUploadForm } from '../../components/DocumentUploadForm';
import { TrustScoreDisplay } from '../../components/TrustScoreDisplay';
import { PaymentProofUpload } from '../../components/PaymentProofUpload';
import FooterContactLink from '../../components/FooterContactLink';

type Tab = 'status' | 'documents' | 'identity' | 'transactions';

interface VerificationData {
  email_verified: boolean;
  documents_verified: boolean;
  identity_verified: boolean;
  verification_status: string;
}

export default function VerificationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('status');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        setUserId(user.id);
        const { data: verification, error: verifyError } = await supabase
          .from('user_verifications').select('*').eq('user_id', user.id).maybeSingle();

        if (verifyError) {
          console.error('Verification load error:', verifyError);
          setVerificationData({
            email_verified: false,
            documents_verified: false,
            identity_verified: false,
            verification_status: 'not_started',
          });
          return;
        }

        setVerificationData(verification || {
          email_verified: false,
          documents_verified: false,
          identity_verified: false,
          verification_status: 'not_started',
        });
      } catch { setError('An error occurred while loading your profile'); }
      finally { setLoading(false); }
    })();
  }, [router]);

  const progress = verificationData
    ? Math.round(([verificationData.email_verified, verificationData.documents_verified, verificationData.identity_verified]
        .filter(Boolean).length / 3) * 100)
    : 0;

  if (loading) return <main className="p-6"><p>Loading verification…</p></main>;

  if (error) return (
    <main className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
        <p className="text-red-700">{error}</p>
        <button onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-6 py-2 rounded font-medium hover:bg-red-700">
          Try Again
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">✨ Account Verification</h1>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Verification Progress</p>
              <p className="text-sm font-bold text-blue-600">{progress}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex gap-2 md:gap-6 overflow-x-auto">
          {[
            { id: 'status', label: '📊 Status' },
            { id: 'documents', label: '📄 Documents' },
            { id: 'identity', label: '🎓 Identity' },
            { id: 'transactions', label: '💳 Transactions' },
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id as Tab)}
              className={`px-4 md:px-6 py-4 font-semibold text-sm md:text-base whitespace-nowrap border-b-2 transition ${
                activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-4">🏆 Your Trust Score</h2>
              <TrustScoreDisplay userId={userId} showBreakdown size="large" />
            </div>
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-4">📈 Verification Details</h2>
              <VerificationStatus userId={userId} />
            </div>
          </div>
        )}

        {/* FIX (#8): one upload card per document type, each tracks its own status */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
              Upload each document separately. You&apos;ll see its review status here.
            </div>
            <DocumentUploadForm userId={userId} documentType="student_card" />
            <DocumentUploadForm userId={userId} documentType="registration_proof" />
            <DocumentUploadForm userId={userId} documentType="fee_statement" />
          </div>
        )}

        {activeTab === 'identity' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-2xl font-bold mb-4">🎓 Identity Verification</h2>
            <p className="text-gray-600">
              Complete document verification first to unlock identity verification.
            </p>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">💡 Transaction QR codes have moved</h3>
              <p className="text-sm text-gray-700">
                The transaction QR code is now started from inside a chat with the other person.
                Open the chat, tap the <strong>📷 QR</strong> button in the header, and both of you scan
                each other&apos;s code when you meet.
              </p>
              <Link href="/messages" className="inline-block mt-3 text-blue-600 font-medium hover:underline">
                Go to Messages →
              </Link>
            </div>
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-4">💰 Payment Proof</h2>
              <PaymentProofUpload userId={userId} transactionId="sample-transaction-123" userType="buyer" />
            </div>
          </div>
        )}
      </div>

      {/* FIX (#7): Contact Support link now points to /contact-us */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 text-center">
          <p className="text-gray-600 text-sm">
            Need help?{' '}
            <Link href="/contact-us" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
      <FooterContactLink />
    </main>
  );
}