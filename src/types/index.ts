// src/types/index.ts

export type UserRole = 'user' | 'admin' | 'superadmin';
export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'unverified';

export type DocumentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'not_started';

export type TransactionStatus =
  | 'pending_agreement'
  | 'confirmed'
  | 'payment_pending'
  | 'completed'
  | 'disputed';

// ============ USER TYPES ============

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  institution_id: string | null;
  institution: string | null;
  campus: string | null;
  profile_image: string | null;
  profile_picture_url: string | null;
  verification_status: VerificationStatus;
  reputation_score: number;
  transaction_count: number;
  is_verified: boolean;
  verification_date: string | null;
  trust_score: number;
  rating_average: number;
  total_transactions: number;
  seller_level: string;
  role: UserRole;
  bio: string | null;
  student_number: string | null;
  verification_badge_student: boolean;
  verification_badge_identity: boolean;
  vader_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserVerification {
  id: string;
  user_id: string;
  email_verified: boolean;
  email_verified_at: string | null;
  email_domain: string | null;
  documents_verified: boolean;
  documents_verified_at: string | null;
  documents_rejected_count: number;
  student_card_status: DocumentStatus;
  student_card_attempt: number;
  registration_proof_status: DocumentStatus;
  registration_proof_attempt: number;
  fee_statement_status: DocumentStatus;
  fee_statement_attempt: number;
  identity_verified: boolean;
  identity_verified_at: string | null;
  verification_status: VerificationStatus;
  verification_reminder_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAccount {
  id: string;
  user_id: string;
  admin_type: 'admin' | 'superadmin';
  institution_id: string | null;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Renamed to avoid conflict with the UserRole type
export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  institution: string | null;
  created_at: string;
}

// ============ MESSAGE TYPES ============

export interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  topic: string;
  extension: string;
  event: string | null;
  private: boolean;
  payload: Record<string, any> | null;
  binary_payload: string | null;
  created_at: string;
  updated_at: string;
  inserted_at: string;
}

// ============ LISTING TYPES ============

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  location: string | null;
  is_vader: boolean;
  created_at: string;
  updated_at: string;
}

// ============ VERIFICATION TYPES ============

export interface VerificationDocument {
  id: string;
  user_id: string;
  document_type:
    | 'student_card'
    | 'registration_proof'
    | 'fee_statement';
  file_url: string;
  file_size_kb: number | null;
  status: DocumentStatus;
  attempt_number: number;
  reviewed_by: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface SelfieVerification {
  id: string;
  user_id: string;
  selfie_url: string;
  student_card_document_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  attempt_number: number;
  reviewed_by: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  face_matches_card: boolean | null;
  name_matches_profile: boolean | null;
  card_appears_valid: boolean | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

// ============ TRANSACTION TYPES ============

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  status: TransactionStatus;
  qr_code: string;
  buyer_qr_confirmed: boolean;
  buyer_qr_confirmed_at: string | null;
  seller_qr_confirmed: boolean;
  seller_qr_confirmed_at: string | null;
  qr_confirmation_deadline: string | null;
  qr_confirmation_expired: boolean;
  payment_status: 'unpaid' | 'paid' | 'failed';
  payment_proof_url: string | null;
  payment_proof_uploaded_at: string | null;
  seller_payment_confirmed: boolean;
  seller_payment_confirmed_at: string | null;
  listing_price: number;
  listing_currency: string;
  delivery_method: 'meetup' | 'delivery';
  meetup_location: string | null;
  meetup_date: string | null;
  meetup_time: string | null;
  dispute_opened: boolean;
  dispute_opened_at: string | null;
  dispute_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============ REPORT TYPES ============

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_listing_id: string | null;
  report_type: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============ INSTITUTION TYPES ============

export interface Institution {
  id: string;
  name: string;
  province: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  email_domains: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

// ============ ADMIN TYPES ============

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface TrustScore {
  id: string;
  user_id: string;
  current_score: number;
  total_points_earned: number;
  total_points_lost: number;
  is_verified: boolean;
  completed_transactions: number;
  successful_sales: number;
  successful_purchases: number;
  positive_reviews: number;
  negative_reviews: number;
  average_rating: number;
  fraud_reports: number;
  lost_disputes: number;
  created_at: string;
  updated_at: string;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ FILTER TYPES ============

export interface ListingFilters {
  category?: string;
  institution?: string;
  campus?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'price_low' | 'price_high';
}

export interface ConversationWithDetails extends Conversation {
  buyer: UserProfile;
  seller: UserProfile;
  listing: Listing;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface MessageWithSender extends Message {
  sender?: UserProfile;
}

// ============ AUTH TYPES ============

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
  role: UserRole | null;
  isVerified: boolean;
  isAdmin: boolean;
}

export interface CurrentUserData {
  user: AuthUser | null;
  profile: UserProfile | null;
  role: UserRoleRecord | null;
  loading: boolean;
  error: Error | null;
}