import { supabase } from '../lib/supabase';

export interface TransactionWithHistory {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listing_price: number;
  status: string;
  transaction_count: number;
  meeting_location?: string;
  meeting_time?: string;
  parent_transaction_id?: string;
  created_at: string;
  updated_at: string;
  // Related data
  buyerName?: string;
  sellerName?: string;
  listingTitle?: string;
  // History
  transactionHistory?: Array<{
    id: string;
    transaction_count: number;
    created_at: string;
    meeting_location?: string;
    meeting_time?: string;
  }>;
}

/**
 * Get unique transactions for current user (no duplicates)
 * Shows parent transactions only, or latest in chain
 */
export async function getUserTransactions(
  userId: string
): Promise<TransactionWithHistory[]> {
  try {
    // Get all transactions where user is buyer or seller
    const { data: allTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select(
        `
        id,
        buyer_id,
        seller_id,
        listing_id,
        listing_price,
        status,
        transaction_count,
        parent_transaction_id,
        is_parent,
        meeting_location,
        meeting_time,
        created_at,
        updated_at
      `
      )
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    // Get unique parent transactions only
    // If transaction is a child (parent_transaction_id is not null),
    // use the parent; otherwise use the transaction itself
    const uniqueTransactions: Record<string, TransactionWithHistory> = {};

    for (const txn of allTransactions || []) {
      // Use parent ID if child, otherwise use own ID
      const displayId = txn.parent_transaction_id || txn.id;

      // Keep only the latest version of each unique transaction pair
      if (!uniqueTransactions[displayId]) {
        uniqueTransactions[displayId] = {
          ...txn,
          id: displayId,
        };
      }
    }

    // Fetch related user and listing info
    const txnsArray = Object.values(uniqueTransactions);
    const enriched = await Promise.all(
      txnsArray.map(async (txn) => {
        const [buyerResp, sellerResp, listingResp] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', txn.buyer_id)
            .single(),
          supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', txn.seller_id)
            .single(),
          supabase
            .from('listings')
            .select('title')
            .eq('id', txn.listing_id)
            .single(),
        ]);

        return {
          ...txn,
          buyerName: buyerResp.data?.full_name,
          sellerName: sellerResp.data?.full_name,
          listingTitle: listingResp.data?.title,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return [];
  }
}

/**
 * Get transaction history for a specific parent transaction
 * Shows all repeats of that same buyer+seller+listing combo
 */
export async function getTransactionHistory(
  parentTransactionId: string
): Promise<TransactionWithHistory[]> {
  try {
    // Get the parent transaction
    const { data: parent, error: parentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', parentTransactionId)
      .single();

    if (parentError) throw parentError;

    // Get all transactions (parent + children) for this buyer+seller+listing combo
    const { data: history, error: historyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('buyer_id', parent.buyer_id)
      .eq('seller_id', parent.seller_id)
      .eq('listing_id', parent.listing_id)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    return history || [];
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

/**
 * Create a new transaction (parent or child)
 */
export async function createTransaction(data: {
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listing_price: number;
  meeting_location: string;
  meeting_time: string;
  parent_transaction_id?: string;
}): Promise<{ success: boolean; transactionId?: string; message: string }> {
  try {
    // Check if parent transaction exists
    let parentId = data.parent_transaction_id;
    let transactionCount = 1;

    if (parentId) {
      // Get parent to find transaction count
      const { data: parent, error: parentError } = await supabase
        .from('transactions')
        .select('transaction_count')
        .eq('id', parentId)
        .single();

      if (parentError) throw parentError;

      transactionCount = (parent?.transaction_count || 0) + 1;
    } else {
      // This is a new parent transaction
      // Check if one already exists for this buyer+seller+listing
      const { data: existing } = await supabase
        .from('transactions')
        .select('id, transaction_count')
        .eq('buyer_id', data.buyer_id)
        .eq('seller_id', data.seller_id)
        .eq('listing_id', data.listing_id)
        .eq('is_parent', true)
        .single();

      if (existing) {
        // Parent exists, so this is a repeat
        parentId = existing.id;
        transactionCount = existing.transaction_count + 1;
      } else {
        // Completely new transaction
        transactionCount = 1;
      }
    }

    // Create the transaction record
    const { data: newTxn, error: insertError } = await supabase
      .from('transactions')
      .insert({
        buyer_id: data.buyer_id,
        seller_id: data.seller_id,
        listing_id: data.listing_id,
        listing_price: data.listing_price,
        meeting_location: data.meeting_location,
        meeting_time: data.meeting_time,
        parent_transaction_id: parentId,
        transaction_count: transactionCount,
        is_parent: !parentId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // If this is a child, update parent's transaction_count
    if (parentId) {
      await supabase
        .from('transactions')
        .update({ transaction_count: transactionCount })
        .eq('id', parentId);
    }

    return {
      success: true,
      transactionId: newTxn?.id,
      message: `Transaction created (${transactionCount > 1 ? `${transactionCount}nd/st transaction` : 'First transaction'})`,
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      success: false,
      message: `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get all transactions for admin (filtered by institution)
 */
export async function getAdminTransactions(
  adminId: string,
  adminInstitution?: string,
  isSuperAdmin: boolean = false
): Promise<TransactionWithHistory[]> {
  try {
    let query = supabase
      .from('transactions')
      .select(
        `
        id,
        buyer_id,
        seller_id,
        listing_id,
        listing_price,
        status,
        transaction_count,
        parent_transaction_id,
        is_parent,
        meeting_location,
        meeting_time,
        created_at,
        updated_at
      `
      );

    if (!isSuperAdmin && adminInstitution) {
      // Get all users from this institution
      const { data: institutionUsers } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('university', adminInstitution);

      const userIds = (institutionUsers || []).map((u) => u.id);

      if (userIds.length === 0) {
        return [];
      }

      // Get transactions where ANY participant is from this institution
      query = query.or(
        userIds.map((id) => `buyer_id.eq.${id},seller_id.eq.${id}`).join(',')
      );
    }

    const { data: transactions, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;

    // Filter to show only parent transactions (no duplicates)
    const uniqueTransactions: Record<string, TransactionWithHistory> = {};

    for (const txn of transactions || []) {
      const displayId = txn.parent_transaction_id || txn.id;

      if (!uniqueTransactions[displayId]) {
        uniqueTransactions[displayId] = {
          ...txn,
          id: displayId,
        };
      }
    }

    // Enrich with user and listing info
    const txnsArray = Object.values(uniqueTransactions);
    const enriched = await Promise.all(
      txnsArray.map(async (txn) => {
        const [buyerResp, sellerResp, listingResp] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('full_name, university')
            .eq('id', txn.buyer_id)
            .single(),
          supabase
            .from('user_profiles')
            .select('full_name, university')
            .eq('id', txn.seller_id)
            .single(),
          supabase
            .from('listings')
            .select('title')
            .eq('id', txn.listing_id)
            .single(),
        ]);

        return {
          ...txn,
          buyerName: buyerResp.data?.full_name,
          sellerName: sellerResp.data?.full_name,
          listingTitle: listingResp.data?.title,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    return [];
  }
}