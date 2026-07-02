/**
 * Admin helpers. Reads role + scoped institution from public.user_roles
 * (the security-definer table; do NOT trust user_profiles.role for auth).
 */
import { supabase } from './supabase';

export type AppRole = 'user' | 'admin' | 'superadmin';

export interface AdminInfo {
  userId: string;
  role: AppRole;
  institution: string | null; // null for superadmin & regular users
}

/** Returns current admin context, or null if not signed in. */
export async function getCurrentAdminInfo(): Promise<AdminInfo | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role, institution')
    .eq('user_id', user.id);

  const rows = roles || [];
  if (rows.some((r) => r.role === 'superadmin')) {
    return { userId: user.id, role: 'superadmin', institution: null };
  }
  const adminRow = rows.find((r) => r.role === 'admin');
  if (adminRow) {
    return { userId: user.id, role: 'admin', institution: adminRow.institution ?? null };
  }
  return { userId: user.id, role: 'user', institution: null };
}

export function isAdminRole(r: AppRole | null | undefined): boolean {
  return r === 'admin' || r === 'superadmin';
}
