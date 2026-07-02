/**
 * Verification Constants
 * Single source of truth for all verification-related values
 * Matches your Supabase schema constraints
 */

export const VerificationStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type VerificationStatusType = typeof VerificationStatus[keyof typeof VerificationStatus];

export const DocumentType = {
  StudentCard: 'student_card',
  RegistrationProof: 'registration_proof',
  FeeStatement: 'fee_statement',
} as const;

export type DocumentTypeValue = typeof DocumentType[keyof typeof DocumentType];

// All required documents for full verification
export const REQUIRED_DOCUMENTS: DocumentTypeValue[] = [
  DocumentType.StudentCard,
  DocumentType.RegistrationProof,
  DocumentType.FeeStatement,
];

// Max attempts (matches schema constraint: CHECK (attempt_number >= 1 AND attempt_number <= 5))
export const MAX_DOCUMENT_ATTEMPTS = 5;

// Trust score awards
export const TRUST_SCORE_AWARDS = {
  DocumentsApproved: 30,
  IdentityApproved: 40,
} as const;