'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface TransactionRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listing_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  meetup_location?: string;
  meetup_time?: string;
  parent_transaction_id?: string;
  transaction_count: number;
  buyerName?: string;
  sellerName?: string;
  listingTitle?: string;
  uniqueKey?: string;
}

interface TransactionHistory {
  id: string;
  transaction_count: number;
  created_at: string;
  meetup_location?: string;
  meetup_time?: string;
  status: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Helper function to generate unique key
  const generateUniqueKey = (buyer_id: string, seller_id: string, listing_id: string): string => {
    const ids = [buyer_id, seller_id].sort();
    return `${ids[0]}|${ids[1]}|${listing_id}`;
  };

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setError(null);
        setLoading(true);

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError('Failed to authenticate. Please log in again.');
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        // Get ALL transactions for this user (buyer OR seller)
        const { data: allTxns, error: txnError } = await supabase
          .from('transactions')
          .select('*')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (txnError) {
          console.error('Error fetching transactions:', txnError);
          setError(`Failed to fetch transactions: ${txnError.message}`);
          setLoading(false);
          return;
        }

        if (!allTxns || allTxns.length === 0) {
          setTransactions([]);
          setLoading(false);
          return;
        }

        // DEDUPLICATE: Group by (buyer_id, seller_id, listing_id)
        const uniqueMap = new Map<string, TransactionRow>();

        for (const txn of allTxns) {
          // Validate transaction data
          if (!txn.buyer_id || !txn.seller_id || !txn.listing_id) {
            console.warn('Skipping transaction with missing IDs:', txn);
            continue;
          }

          const uniqueKey = generateUniqueKey(txn.buyer_id, txn.seller_id, txn.listing_id);

          // Keep only the LATEST transaction for this pair
          if (!uniqueMap.has(uniqueKey)) {
            uniqueMap.set(uniqueKey, { ...txn, uniqueKey });
          } else {
            const existing = uniqueMap.get(uniqueKey)!;
            if (new Date(txn.created_at) > new Date(existing.created_at)) {
              uniqueMap.set(uniqueKey, { ...txn, uniqueKey });
            }
          }
        }

        // Fetch related user and listing info for each unique transaction
        const uniqueTxns = Array.from(uniqueMap.values());
        const enriched = await Promise.all(
          uniqueTxns.map(async (txn) => {
            try {
              const [buyerResp, sellerResp, listingResp] = await Promise.all([
                supabase
                  .from('user_profiles')
                  .select('full_name')
                  .eq('id', txn.buyer_id)
                  .maybeSingle(),
                supabase
                  .from('user_profiles')
                  .select('full_name')
                  .eq('id', txn.seller_id)
                  .maybeSingle(),
                supabase
                  .from('listings')
                  .select('title')
                  .eq('id', txn.listing_id)
                  .maybeSingle(),
              ]);

              // Count total transactions for this pair+listing
              const { data: allHistory, error: historyError } = await supabase
                .from('transactions')
                .select('id')
                .eq('buyer_id', txn.buyer_id)
                .eq('seller_id', txn.seller_id)
                .eq('listing_id', txn.listing_id);

              if (historyError) {
                console.warn('Error fetching transaction history:', historyError);
              }

              return {
                ...txn,
                buyerName: buyerResp.data?.full_name || 'Unknown Buyer',
                sellerName: sellerResp.data?.full_name || 'Unknown Seller',
                listingTitle: listingResp.data?.title || 'Unknown Item',
                transaction_count: allHistory?.length || 1,
              };
            } catch (err) {
              console.error('Error enriching transaction:', err);
              return {
                ...txn,
                buyerName: 'Unknown Buyer',
                sellerName: 'Unknown Seller',
                listingTitle: 'Unknown Item',
                transaction_count: 1,
              };
            }
          })
        );

        setTransactions(enriched);
      } catch (err) {
        console.error('Error loading transactions:', err);
        setError(`An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  const handleViewDetails = async (transaction: TransactionRow) => {
    try {
      setSelectedTransaction(transaction);

      // Get ALL transactions for this buyer+seller+listing combo
      const { data: history, error } = await supabase
        .from('transactions')
        .select('id, transaction_count, created_at, meetup_location, meetup_time, status')
        .eq('buyer_id', transaction.buyer_id)
        .eq('seller_id', transaction.seller_id)
        .eq('listing_id', transaction.listing_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching history:', error);
        setTransactionHistory([]);
        return;
      }

      setTransactionHistory(history || []);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error loading transaction history:', err);
      setTransactionHistory([]);
    }
  };

  const getTransactionLabel = (count: number) => {
    if (count === 1) return 'First transaction';
    if (count === 2) return '2nd transaction';
    if (count === 3) return '3rd transaction';
    return `${count}th transaction`;
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading your transactions...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Transactions</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold">❌ Error: {error}</p>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-lg">No transactions yet.</p>
          <p className="text-gray-500 text-sm mt-2">Start a chat with a seller to create your first transaction.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-100 border-b sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-left whitespace-nowrap font-semibold">Other Party</th>
                    <th className="p-3 text-left whitespace-nowrap font-semibold">Item</th>
                    <th className="p-3 text-left whitespace-nowrap font-semibold">Price</th>
                    <th className="p-3 text-left whitespace-nowrap font-semibold">Status</th>
                    <th className="p-3 text-left whitespace-nowrap font-semibold">Transaction</th>
                    <th className="p-3 text-left whitespace-nowrap font-semibold">Last Updated</th>
                    <th className="p-3 text-left whitespace-nowrap font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        {currentUser?.id === txn.buyer_id
                          ? `${txn.sellerName} (Seller)`
                          : `${txn.buyerName} (Buyer)`}
                      </td>
                      <td className="p-3 font-medium max-w-xs truncate">{txn.listingTitle}</td>
                      <td className="p-3 whitespace-nowrap font-semibold">R{txn.listing_price}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold inline-block ${
                            txn.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : txn.status === 'pending_agreement' || txn.status === 'qr_generated'
                              ? 'bg-blue-100 text-blue-700'
                              : txn.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {txn.status === 'qr_generated'
                            ? 'QR Generated'
                            : txn.status === 'pending_agreement'
                            ? 'Pending'
                            : txn.status.charAt(0).toUpperCase() + txn.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="p-3 font-semibold whitespace-nowrap">
                        <span className={txn.transaction_count > 1 ? 'text-blue-600' : ''}>
                          {getTransactionLabel(txn.transaction_count)}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-gray-600">
                        {new Date(txn.updated_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleViewDetails(txn)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 border-t px-3 py-2 text-xs text-gray-500">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} • Scroll to view more
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Transaction Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl transition"
                >
                  ✕
                </button>
              </div>

              {/* TRANSACTION SUMMARY */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="font-bold text-lg mb-4">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Selling To / Buying From</p>
                    <p className="font-semibold">
                      {currentUser?.id === selectedTransaction.buyer_id
                        ? selectedTransaction.sellerName
                        : selectedTransaction.buyerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Item</p>
                    <p className="font-semibold">{selectedTransaction.listingTitle}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Price</p>
                    <p className="font-semibold">R{selectedTransaction.listing_price}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Status</p>
                    <p className="font-semibold capitalize">{selectedTransaction.status}</p>
                  </div>
                </div>
              </div>

              {/* CURRENT TRANSACTION DETAILS */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="font-bold text-lg mb-4">Meeting Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Location</p>
                    <p className="font-semibold">{selectedTransaction.meetup_location || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Time</p>
                    <p className="font-semibold">{selectedTransaction.meetup_time || '—'}</p>
                  </div>
                </div>
              </div>

              {/* TRANSACTION HISTORY */}
              {transactionHistory.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4">
                    Transaction History
                    <span className="text-gray-600 font-normal text-sm ml-2">
                      ({transactionHistory.length} {transactionHistory.length === 1 ? 'transaction' : 'transactions'})
                    </span>
                  </h3>

                  {transactionHistory.length === 1 ? (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
                      This is your first transaction with this user for this item.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactionHistory.map((txn) => (
                        <div
                          key={txn.id}
                          className={`p-4 rounded border-l-4 ${
                            txn.id === selectedTransaction.id
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-sm">{getTransactionLabel(txn.transaction_count)}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                📅 {new Date(txn.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-600">
                                📍 {txn.meetup_location || 'Location not specified'}
                              </p>
                              <p className="text-xs text-gray-600">
                                🕐 {txn.meetup_time || 'Time not specified'}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ml-2 ${
                                txn.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {txn.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}