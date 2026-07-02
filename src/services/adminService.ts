// src/services/adminService.ts

import { supabase } from "../lib/supabase";
import type { AdminAccount } from "../types";

/**
 * Fetch all admin accounts
 */
export async function fetchAdmins(): Promise<AdminAccount[]> {
  try {
    const { data, error } = await supabase
      .from("admin_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as AdminAccount[]) || [];
  } catch (error) {
    console.error("Error fetching admins:", error);
    throw error;
  }
}

/**
 * Fetch admin by user ID
 */
export async function fetchAdminByUserId(userId: string): Promise<AdminAccount | null> {
  try {
    const { data, error } = await supabase.from("admin_accounts").select("*").eq("user_id", userId).maybeSingle();

    if (error) throw error;
    return (data as AdminAccount) || null;
  } catch (error) {
    console.error("Error fetching admin:", error);
    throw error;
  }
}

/**
 * Create new admin account
 */
export async function createAdmin(
  userId: string,
  adminType: "admin" | "superadmin",
  institutionId?: string,
  createdBy?: string
): Promise<AdminAccount> {
  try {
    // IMPORTANT (DB alignment):
    // - public.user_roles unique key is (user_id, role) (NOT user_id alone)
    // - public.admin_accounts.admin_type allows: 'superadmin' | 'institution_admin'
    // - public.user_roles.institution is TEXT and is used to match user_profiles.university in can_admin_user()
    //
    // For an "admin" in the UI we create:
    // - user_roles.role = 'admin'
    // - admin_accounts.admin_type = 'institution_admin'
    //
    // NOTE: institutionId is a UUID in admin_accounts, but user_roles expects institution NAME (text).
    // If you have an institutionId, we try to resolve the institution name for user_roles.institution.
    let institutionName: string | null = null;
    if (institutionId) {
      const { data: inst, error: instErr } = await supabase
        .from("institutions")
        .select("name")
        .eq("id", institutionId)
        .maybeSingle();
      if (instErr) throw instErr;
      institutionName = inst?.name ?? null;
    }

    // 1) Add/update role row (requires appropriate RLS policy or admin-only RPC on your DB)
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: adminType,
          institution: institutionName,
        },
        { onConflict: "user_id,role" }
      );
    if (roleError) throw roleError;

    // 2) Create admin account row
    const dbAdminType = adminType === "superadmin" ? "superadmin" : "institution_admin";
    const { data, error } = await supabase
      .from("admin_accounts")
      .insert({
        user_id: userId,
        admin_type: dbAdminType,
        institution_id: institutionId || null,
        is_active: true,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AdminAccount;
  } catch (error) {
    console.error("Error creating admin:", error);
    throw error;
  }
}

/**
 * Update admin
 */
export async function updateAdmin(adminId: string, updates: Partial<AdminAccount>): Promise<AdminAccount> {
  try {
    const { data, error } = await supabase.from("admin_accounts").update(updates).eq("id", adminId).select().single();

    if (error) throw error;
    return data as AdminAccount;
  } catch (error) {
    console.error("Error updating admin:", error);
    throw error;
  }
}

/**
 * Deactivate admin
 */
export async function deactivateAdmin(adminId: string): Promise<void> {
  try {
    const { error } = await supabase.from("admin_accounts").update({ is_active: false }).eq("id", adminId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deactivating admin:", error);
    throw error;
  }
}

/**
 * Log admin action
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const { error } = await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error logging admin action:", error);
    // Don't throw - audit logging failure shouldn't break the action
  }
}

/**
 * Fetch audit logs
 */
export async function fetchAuditLogs(adminId?: string, limit: number = 100) {
  try {
    let query = supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(limit);

    if (adminId) {
      query = query.eq("admin_id", adminId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }
}

/**
 * Fetch analytics data
 */
export async function fetchAnalyticsData() {
  try {
    // Users count
    const { count: usersCount } = await supabase.from("user_profiles").select("*", { count: "exact", head: true });

    // Verified users
    const { count: verifiedCount } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_verified", true);

    // Listings count
    const { count: listingsCount } = await supabase.from("listings").select("*", { count: "exact", head: true });

    // Transactions count
    const { count: transactionsCount } = await supabase.from("transactions").select("*", { count: "exact", head: true });

    // Completed transactions
    const { count: completedCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    // Pending documents
    const { count: pendingDocsCount } = await supabase
      .from("verification_documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Total reports
    const { count: reportsCount } = await supabase.from("reports").select("*", { count: "exact", head: true });

    // Unresolved reports
    const { count: unresolvedReports } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return {
      totalUsers: usersCount || 0,
      verifiedUsers: verifiedCount || 0,
      verificationPercentage: usersCount ? Math.round(((verifiedCount || 0) / usersCount) * 100) : 0,
      totalListings: listingsCount || 0,
      totalTransactions: transactionsCount || 0,
      completedTransactions: completedCount || 0,
      completionRate: transactionsCount ? Math.round(((completedCount || 0) / transactionsCount) * 100) : 0,
      pendingDocuments: pendingDocsCount || 0,
      totalReports: reportsCount || 0,
      unresolvedReports: unresolvedReports || 0,
    };
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return {
      totalUsers: 0,
      verifiedUsers: 0,
      verificationPercentage: 0,
      totalListings: 0,
      totalTransactions: 0,
      completedTransactions: 0,
      completionRate: 0,
      pendingDocuments: 0,
      totalReports: 0,
      unresolvedReports: 0,
    };
  }
}

/**
 * Get user moderation history
 */
export async function getUserModerationHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_moderation")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching moderation history:", error);
    throw error;
  }
}

/**
 * Suspend user
 */
export async function suspendUser(
  userId: string,
  reason: string,
  suspendedBy: string,
  suspensionDays: number = 30
): Promise<void> {
  try {
    const suspensionEndDate = new Date();
    suspensionEndDate.setDate(suspensionEndDate.getDate() + suspensionDays);

    const { error } = await supabase.from("user_moderation").insert({
      user_id: userId,
      status: "suspended",
      reason,
      suspended_by: suspendedBy,
      suspension_end_date: suspensionEndDate.toISOString(),
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error suspending user:", error);
    throw error;
  }
}

/**
 * Ban user
 */
export async function banUser(userId: string, reason: string, bannedBy: string): Promise<void> {
  try {
    const { error } = await supabase.from("user_moderation").insert({
      user_id: userId,
      status: "banned",
      reason,
      suspended_by: bannedBy,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error banning user:", error);
    throw error;
  }
}

/**
 * Unban/unsuspend user
 */
export async function unmoderateUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase.from("user_moderation").update({ status: "active" }).eq("user_id", userId);

    if (error) throw error;
  } catch (error) {
    console.error("Error unmodereting user:", error);
    throw error;
  }
}

/**
 * Get dashboard stats for superadmin
 */
export async function getSuperAdminStats() {
  const analytics = await fetchAnalyticsData();

  // Get admin count
  const { count: adminCount } = await supabase
    .from("admin_accounts")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Get recent activity
  const { data: recentActions } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(10);

  return {
    ...analytics,
    totalAdmins: adminCount || 0,
    recentAdminActions: recentActions || [],
  };
}

/**
 * Get dashboard stats for regular admin
 */
export async function getAdminStats(institutionId?: string) {
  const analytics = await fetchAnalyticsData();

  // Get pending documents for institution if specified
  let pendingDocsQuery = supabase.from("verification_documents").select("*").eq("status", "pending").order("created_at", { ascending: true });

  if (institutionId) {
    // This would require joining with user_profiles
    // Implementation depends on schema
  }

  const { data: pendingDocs } = await pendingDocsQuery.limit(20);

  return {
    ...analytics,
    recentPendingDocuments: pendingDocs || [],
  };
}