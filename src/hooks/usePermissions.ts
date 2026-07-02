'use client';

import useUser from './useUser';
import {
  isAuthenticated,
  isAdmin,
  isSuperAdmin,
  canAccessVerifiedFeatures,
  canSendMessages,
  canInteractWithListings,
  canSubmitDocuments,
} from '../lib/permissions';
import type { UserRole } from '../types';

export interface UsePermissionsReturn {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAccessVerified: boolean;
  canSendMsg: boolean;
  canInteractListings: boolean;
  canSubmitDocs: boolean;
  role: UserRole | null;
  isVerified: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, role, isVerified } = useUser();

  return {
    isAuthenticated: isAuthenticated(user?.id),
    isAdmin: isAdmin(role),
    isSuperAdmin: isSuperAdmin(role),
    canAccessVerified: canAccessVerifiedFeatures(isVerified, role),
    canSendMsg: canSendMessages(isVerified, role),
    canInteractListings: canInteractWithListings(isVerified, role),
    canSubmitDocs: canSubmitDocuments(isVerified, role),
    role,
    isVerified,
  };
}

export default usePermissions;