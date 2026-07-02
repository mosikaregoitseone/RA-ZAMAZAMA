// src/lib/constants.ts

/**
 * API Configuration
 */
export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

/**
 * Verification Document Types
 */
export const DOCUMENT_TYPES = {
  STUDENT_CARD: 'student_card',
  REGISTRATION_PROOF: 'registration_proof',
  FEE_STATEMENT: 'fee_statement',
} as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  student_card: 'Student Card',
  registration_proof: 'Registration Proof',
  fee_statement: 'Fee Statement',
};

/**
 * Verification Status
 */
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  UNVERIFIED: 'unverified',
  EMAIL_VERIFIED: 'email_verified',
  DOCUMENTS_PENDING: 'documents_pending',
  DOCUMENTS_APPROVED: 'documents_approved',
  IDENTITY_PENDING: 'identity_pending',
  IDENTITY_APPROVED: 'identity_approved',
  PARTIALLY_VERIFIED: 'partially_verified',
} as const;

/**
 * Document Status
 */
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NOT_STARTED: 'not_started',
} as const;

/**
 * Transaction Status
 */
export const TRANSACTION_STATUS = {
  PENDING_AGREEMENT: 'pending_agreement',
  CONFIRMED: 'confirmed',
  PAYMENT_PENDING: 'payment_pending',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
} as const;

/**
 * User Roles
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

/**
 * Listing Categories
 */
export const LISTING_CATEGORIES = [
  'Textbooks',
  'Stationery',
  'Electronics',
  'Clothing',
  'Furniture',
  'Notes & Study Materials',
  'Accommodation',
  'Services',
  'Other',
] as const;

/**
 * Payment Methods
 */
export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  EWALLET: 'ewallet',
  CASH: 'cash',
} as const;

/**
 * Delivery Methods
 */
export const DELIVERY_METHODS = {
  MEETUP: 'meetup',
  DELIVERY: 'delivery',
} as const;

/**
 * Report Reasons
 */
export const REPORT_REASONS = [
  'Inappropriate content',
  'Scam or fraud',
  'Harassment',
  'Spam',
  'Fake listing',
  'Price manipulation',
  'Offensive language',
  'Other',
] as const;

/**
 * Trust Score Ranges
 */
export const TRUST_SCORE_RANGES = {
  VERY_LOW: { min: 0, max: 20 },
  LOW: { min: 20, max: 40 },
  MEDIUM: { min: 40, max: 60 },
  HIGH: { min: 60, max: 80 },
  VERY_HIGH: { min: 80, max: 100 },
};

/**
 * File Upload Limits
 */
export const FILE_LIMITS = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf'],
};

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

/**
 * Timeouts & Delays
 */
export const TIMEOUTS = {
  TOAST: 3000,
  DEBOUNCE: 300,
  THROTTLE: 500,
  API_CALL: 30000,
  SESSION_CHECK: 60000,
};

/**
 * Cache Keys
 */
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  USER_LISTINGS: 'user_listings',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  VERIFICATION_STATUS: 'verification_status',
  ANALYTICS: 'analytics',
} as const;

/**
 * Storage Keys (localStorage/sessionStorage)
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_OPEN: 'sidebar_open',
} as const;

/**
 * Form Validation Rules
 */
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 2000,
  BIO_MAX_LENGTH: 500,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^(\+27|0)[0-9]{9}$/, // South Africa
};

/**
 * Routes
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  PROFILE_SETUP: '/profile-setup',
  VERIFICATION: '/verification',
  MESSAGES: '/messages',
  CHAT: '/chat',
  LISTINGS: '/listings',
  LISTING_DETAIL: '/listing',
  CREATE_LISTING: '/create-listing',
  SEARCH: '/search',
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_DOCUMENTS: '/admin/document-review',
  ADMIN_TRANSACTIONS: '/admin/transactions',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  ENABLE_VADER_MODE: true,
  ENABLE_QR_TRANSACTIONS: true,
  ENABLE_MESSAGING: true,
  ENABLE_ANALYTICS: true,
  ENABLE_ADMIN_PANEL: true,
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You do not have permission to perform this action',
  NOT_VERIFIED: 'Please verify your account to continue',
  NOT_AUTHENTICATED: 'Please log in to continue',
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again later',
  NETWORK_ERROR: 'Network error. Please check your connection',
  FILE_TOO_LARGE: `File must be smaller than ${FILE_LIMITS.MAX_SIZE_MB}MB`,
  INVALID_FILE_TYPE: 'Invalid file type. Allowed: JPG, PNG, PDF',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  LISTING_CREATED: 'Listing created successfully',
  LISTING_DELETED: 'Listing deleted successfully',
  DOCUMENT_UPLOADED: 'Document uploaded successfully',
  DOCUMENT_APPROVED: 'Document approved successfully',
  DOCUMENT_REJECTED: 'Document rejected successfully',
  MESSAGE_SENT: 'Message sent successfully',
} as const;