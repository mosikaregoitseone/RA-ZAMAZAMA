// src/lib/permissions.ts

import type { UserRole } from '../types';

/**
 * Check if user is authenticated
 */
export function isAuthenticated(userId: string | null | undefined): boolean {
  return Boolean(userId);
}

/**
 * Check if user is verified
 * Used to determine if user can access verified-only features
 */
export function isVerifiedUser(isVerified: boolean | null | undefined): boolean {
  return isVerified === true;
}

/**
 * Check if user has admin role
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

/**
 * Check if user is superadmin
 * Used for sensitive operations like creating other admins
 */
export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === 'superadmin';
}

/**
 * Check if user can access verified-only features
 * Admins bypass verification requirement everywhere in the app
 */
export function canAccessVerifiedFeatures(
  isVerified: boolean | null | undefined,
  role: UserRole | null | undefined
): boolean {
  // Admins always have access
  if (isAdmin(role)) {
    return true;
  }
  // Regular users need to be verified
  return isVerified === true;
}

/**
 * Check if user can interact with listings
 * Admins can interact without verification, regular users must be verified
 */
export function canInteractWithListings(
  isVerified: boolean | null | undefined,
  role: UserRole | null | undefined
): boolean {
  return canAccessVerifiedFeatures(isVerified, role);
}

/**
 * Check if user can send messages
 * Admins can always send, regular users must be verified
 */
export function canSendMessages(
  isVerified: boolean | null | undefined,
  role: UserRole | null | undefined
): boolean {
  return canAccessVerifiedFeatures(isVerified, role);
}

/**
 * Check if user can upload verification documents
 * Admins bypass, regular users must provide documents
 */
export function canSubmitDocuments(
  isVerified: boolean | null | undefined,
  role: UserRole | null | undefined
): boolean {
  // Everyone can submit (but admins bypass the requirement)
  return true;
}

/**
 * Check if user can view analytics
 * Only admins and superadmins
 */
export function canViewAnalytics(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
}

/**
 * Check if user can manage users (ban, edit, etc.)
 * Only admins and superadmins
 */
export function canManageUsers(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
}

/**
 * Check if user can review documents
 * Only admins and superadmins
 */
export function canReviewDocuments(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
}

/**
 * Check if user can create new admin accounts
 * Only superadmin
 */
export function canCreateAdmin(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

/**
 * Check if user can manage admin permissions
 * Only superadmin
 */
export function canManageAdmins(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

/**
 * Check if user can access admin panel
 * Admins and superadmins only
 */
export function canAccessAdmin(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
}

/**
 * Check if user can access superadmin features
 * Superadmin only
 */
export function canAccessSuperAdminFeatures(
  role: UserRole | null | undefined
): boolean {
  return isSuperAdmin(role);
}

/**
 * Check if user can edit listing
 * Only the owner or admin
 */
export function canEditListing(
  sellerId: string,
  currentUserId: string | null | undefined,
  currentUserRole: UserRole | null | undefined
): boolean {
  if (isAdmin(currentUserRole)) {
    return true;
  }
  return sellerId === currentUserId;
}

/**
 * Check if user can delete listing
 * Only the owner or admin
 */
export function canDeleteListing(
  sellerId: string,
  currentUserId: string | null | undefined,
  currentUserRole: UserRole | null | undefined
): boolean {
  return canEditListing(sellerId, currentUserId, currentUserRole);
}

/**
 * Check if user can view private profile
 * User themselves, admins, or explicit permission
 */
export function canViewPrivateProfile(
  profileOwnerId: string,
  currentUserId: string | null | undefined,
  currentUserRole: UserRole | null | undefined
): boolean {
  if (isAdmin(currentUserRole)) {
    return true;
  }
  return profileOwnerId === currentUserId;
}

/**
 * Check if user can edit user profile
 * User themselves or admin
 */
export function canEditProfile(
  profileOwnerId: string,
  currentUserId: string | null | undefined,
  currentUserRole: UserRole | null | undefined
): boolean {
  if (isAdmin(currentUserRole)) {
    return true;
  }
  return profileOwnerId === currentUserId;
}

/**
 * Check if user can initiate payment for transaction
 * Only buyer of the transaction
 */
export function canInitializePayment(
  buyerId: string,
  currentUserId: string | null | undefined,
  currentUserRole: UserRole | null | undefined
): boolean {
  if (isAdmin(currentUserRole)) {
    return true;
  }
  return buyerId === currentUserId;
}

/**
 * Check if user can confirm payment for transaction
 * Only seller of the transaction
 */
export function canConfirmPayment(
  sellerId: string,
  currentUserId: string | null | undefined,
  currentUserRole: UserRole | null | undefined
): boolean {
  if (isAdmin(currentUserRole)) {
    return true;
  }
  return sellerId === currentUserId;
}

/**
 * Check if user can open dispute
 * Only participants of the transaction
 */
export function canOpenDispute(
  buyerId: string,
  sellerId: string,
  currentUserId: string | null | undefined,
  currentUserRole: UserRole | null | undefined
): boolean {
  if (isAdmin(currentUserRole)) {
    return true;
  }
  return currentUserId === buyerId || currentUserId === sellerId;
}

/**
 * Check if user can resolve dispute
 * Only admins
 */
export function canResolveDispute(
  role: UserRole | null | undefined
): boolean {
  return isAdmin(role);
}

/**
 * Get permission level for user
 * Useful for conditional UI rendering
 * 3 = superadmin, 2 = admin, 1 = verified user, 0 = unverified user
 */
export function getPermissionLevel(
  isVerified: boolean | null | undefined,
  role: UserRole | null | undefined
): number {
  if (isSuperAdmin(role)) return 3;
  if (isAdmin(role)) return 2;
  if (isVerified) return 1;
  return 0;
}

/**
 * Get user's access level label
 */
export function getAccessLevelLabel(role: UserRole | null | undefined): string {
  if (isSuperAdmin(role)) return 'Super Administrator';
  if (isAdmin(role)) return 'Administrator';
  return 'User';
}

/**
 * Check if user has any elevated permissions
 */
export function hasElevatedPermissions(
  role: UserRole | null | undefined
): boolean {
  return isAdmin(role);
}

/**
 * Check if user has access to restricted content
 * Combines verification and role checks
 */
export function hasAccessToRestricted(
  isVerified: boolean | null | undefined,
  role: UserRole | null | undefined
): boolean {
  return canAccessVerifiedFeatures(isVerified, role);
}

/**
 * Create a permission mask for frontend conditional rendering
 * Returns object with all permission flags
 */
export function getPermissionMask(
  userId: string | null | undefined,
  isVerified: boolean | null | undefined,
  role: UserRole | null | undefined
) {
  return {
    isAuthenticated: isAuthenticated(userId),
    isVerified: isVerifiedUser(isVerified),
    isAdmin: isAdmin(role),
    isSuperAdmin: isSuperAdmin(role),
    canAccessVerified: canAccessVerifiedFeatures(isVerified, role),
    canInteractListings: canInteractWithListings(isVerified, role),
    canViewAnalytics: canViewAnalytics(role),
    canManageUsers: canManageUsers(role),
    canReviewDocuments: canReviewDocuments(role),
    canCreateAdmin: canCreateAdmin(role),
    canAccessAdmin: canAccessAdmin(role),
    canAccessSuperAdmin: canAccessSuperAdminFeatures(role),
    permissionLevel: getPermissionLevel(isVerified, role),
  };
}