'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchVerificationStatus,
  fetchUserPendingDocuments,
  submitDocument,
  isUserVerified,
  type UserVerification,
  type VerificationDocument,
  type SubmitDocumentInput,
} from '../services/verificationService';

export interface UseVerificationReturn {
  verification: UserVerification | null;
  userDocuments: VerificationDocument[];
  isVerified: boolean;
  loading: boolean;
  submitting: boolean;
  error: Error | null;
  submitDoc: (
    documentType: 'student_card' | 'registration_proof' | 'fee_statement',
    fileUrl: string,
    fileSizeKb?: number
  ) => Promise<VerificationDocument>;
  refetch: () => Promise<void>;
}

export default function useVerification(userId: string): UseVerificationReturn {
  const [verification, setVerification] = useState<UserVerification | null>(null);
  const [userDocuments, setUserDocuments] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setVerification(null);
      setUserDocuments([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [verificationData, documentsData] = await Promise.all([
        fetchVerificationStatus(userId),
        fetchUserPendingDocuments(userId),
      ]);

      setVerification(verificationData);
      setUserDocuments(documentsData || []);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      setError(e);
      console.error('useVerification error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitDocHandler = useCallback(
    async (
      documentType: 'student_card' | 'registration_proof' | 'fee_statement',
      fileUrl: string,
      fileSizeKb?: number
    ): Promise<VerificationDocument> => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      try {
        setSubmitting(true);
        setError(null);

        const input: SubmitDocumentInput = {
          userId,
          documentType,
          fileUrl,
          fileSizeKb,
        };

        const document = await submitDocument(input);
        await fetchData();
        return document;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Unknown error');
        setError(e);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [userId, fetchData]
  );

  return {
    verification,
    userDocuments,
    isVerified: isUserVerified(verification),
    loading,
    submitting,
    error,
    submitDoc: submitDocHandler,
    refetch: fetchData,
  };
}
