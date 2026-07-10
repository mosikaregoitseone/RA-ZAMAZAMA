'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface VerificationStatusProps {
  userId: string;
  compact?: boolean; // For small displays
}

interface VerificationData {
  email_verified: boolean;
  email_verified_at?: string;
  documents_verified: boolean;
  documents_verified_at?: string;
  student_card_status: string;
  registration_proof_status: string;
  fee_statement_status: string;
  identity_verified: boolean;
  identity_verified_at?: string;
  verification_status: string;
}

export function VerificationStatus({ userId, compact = false }: VerificationStatusProps) {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ============================================
  // LOAD VERIFICATION DATA
  // ============================================
  useEffect(() => {
    const loadVerificationData = async () => {
      try {
        setLoading(true);
        const { data: verification, error: verifyError } = await supabase
          .from('user_verifications')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (verifyError) {
          console.error('Error fetching verification:', verifyError);
          setData(null);
          return;
        }

        setData(verification || null);
      } catch (err) {
        console.error('Verification load error:', err);
        setError('An error occurred while loading verification status');
      } finally {
        setLoading(false);
      }
    };

    // Load data immediately
    loadVerificationData();

    // Set up auto-refresh every 5 seconds
    const refreshInterval = setInterval(loadVerificationData, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, [userId]);

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-600">Loading verification status...</div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-semibold">Error</div>
        <div className="text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  // ============================================
  // NO DATA STATE
  // ============================================
  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="text-yellow-800 font-semibold">Getting Started</div>
        <div className="text-yellow-700 text-sm">Complete your profile to begin verification</div>
      </div>
    );
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅ Approved';
      case 'rejected':
        return '❌ Rejected';
      case 'pending':
        return '⏳ Pending Review';
      case 'not_started':
        return '○ Not Started';
      default:
        return '○ Pending';
    }
  };

  // Calculate completion percentage
  const calculateProgress = () => {
    let completed = 0;
    const total = 3; // Email, Documents, Identity

    if (data.email_verified) completed++;
    if (data.documents_verified) completed++;
    if (data.identity_verified) completed++;

    return Math.round((completed / total) * 100);
  };

  // ✅ FIXED: Get overall documents status based on individual document statuses
  const getDocumentsOverallStatus = () => {
    // All three must be approved for documents to be verified
    const statuses = [data.student_card_status, data.registration_proof_status, data.fee_statement_status];
    
    // If all are approved
    if (statuses.every(s => s === 'approved')) {
      return 'approved';
    }
    
    // If any are rejected
    if (statuses.some(s => s === 'rejected')) {
      return 'rejected';
    }
    
    // If any are pending or not started
    if (statuses.some(s => s === 'pending' || s === 'not_started')) {
      return 'pending';
    }
    
    return 'pending';
  };

  // ✅ FIXED: Count how many documents have been submitted
  const getSubmittedDocumentsCount = () => {
    let count = 0;
    if (data.student_card_status !== 'not_started') count++;
    if (data.registration_proof_status !== 'not_started') count++;
    if (data.fee_statement_status !== 'not_started') count++;
    return count;
  };

  const progress = calculateProgress();
  const documentsOverallStatus = getDocumentsOverallStatus();
  const submittedCount = getSubmittedDocumentsCount();

  // ============================================
  // COMPACT MODE (For listing cards, etc)
  // ============================================
  if (compact) {
    return (
      <div className="text-xs text-gray-600">
        <div className="flex items-center gap-2">
          {data.verification_status === 'documents_approved' && (
            <>
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Verified</span>
            </>
          )}
          {data.verification_status === 'documents_pending' && (
            <>
              <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              <span>Pending Verification</span>
            </>
          )}
          {data.verification_status === 'unverified' && (
            <>
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Not Verified</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // FULL MODE (Detailed display)
  // ============================================
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Status</h2>
        <p className="text-gray-600 text-sm">
          Complete all verification steps to unlock buying, selling, and messaging
        </p>
      </div>

      {/* PROGRESS BAR */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* VERIFICATION ITEMS */}
      <div className="space-y-4">
        {/* EMAIL VERIFICATION */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {data.email_verified ? '✅' : '○'} Email Verification
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Verify your student email address
              </p>
              {data.email_verified && data.email_verified_at && (
                <p className="text-xs text-green-600 mt-2">
                  Verified on {new Date(data.email_verified_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border whitespace-nowrap ${
                data.email_verified
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              }`}
            >
              {data.email_verified ? 'Verified' : 'Not Verified'}
            </span>
          </div>
        </div>

        {/* ✅ FIXED: DOCUMENT VERIFICATION - ONE APPROVAL FOR ALL */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {data.documents_verified ? '✅' : '○'} Document Verification
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Upload 3 required documents for review
              </p>
              {data.documents_verified && data.documents_verified_at && (
                <p className="text-xs text-green-600 mt-2">
                  All documents approved on {new Date(data.documents_verified_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border whitespace-nowrap ${
                data.documents_verified
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : documentsOverallStatus === 'rejected'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-300'
              }`}
            >
              {data.documents_verified
                ? 'All Approved ✓'
                : documentsOverallStatus === 'rejected'
                ? 'Rejected'
                : `In Progress (${submittedCount}/3)`}
            </span>
          </div>

          {/* ✅ FIXED: INDIVIDUAL DOCUMENTS - Show submission status only */}
          <div className="space-y-2 pl-6 text-sm">
            <p className="text-gray-600 mb-3">
              {data.documents_verified
                ? '✅ All documents have been approved!'
                : `Submit all 3 documents below for review. Once all are approved, you'll be verified.`}
            </p>
            
            <div className="space-y-2">
              {/* Student Card */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">📄 Student Card</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                    data.student_card_status
                  )}`}
                >
                  {getStatusText(data.student_card_status)}
                </span>
              </div>

              {/* Registration Proof */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">📋 Registration Proof</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                    data.registration_proof_status
                  )}`}
                >
                  {getStatusText(data.registration_proof_status)}
                </span>
              </div>

              {/* Fee Statement */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">💰 Fee Statement</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                    data.fee_statement_status
                  )}`}
                >
                  {getStatusText(data.fee_statement_status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* IDENTITY VERIFICATION */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {data.identity_verified ? '✅' : '○'} Identity Verification
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Optional: Upload a selfie for additional trust
              </p>
              {data.identity_verified && data.identity_verified_at && (
                <p className="text-xs text-green-600 mt-2">
                  Verified on {new Date(data.identity_verified_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border whitespace-nowrap ${
                data.identity_verified
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              }`}
            >
              {data.identity_verified ? 'Verified' : 'Optional'}
            </span>
          </div>
        </div>
      </div>

      {/* INFO BOX */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 How Document Verification Works</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>✓ Upload all 3 required documents from the Documents tab</li>
          <li>✓ Admin will review each document within 24-48 hours</li>
          <li>✓ Once ALL 3 are approved, your account is verified</li>
          <li>✓ You'll receive an email when fully verified</li>
          <li>✓ Verified accounts can buy, sell, and message freely</li>
        </ul>
      </div>
    </div>
  );
}