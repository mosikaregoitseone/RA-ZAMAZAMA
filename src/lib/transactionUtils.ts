import { supabase } from './supabase';

export interface TransactionCreateRequest {
  buyerId: string;
  sellerId: string;
  listingId: string;
  listingPrice: number;
  meetupLocation?: string;
  meetupDate?: string;
  meetupTime?: string;
}

export interface QRConfirmationRequest {
  transactionId: string;
  userId: string;
  userType: 'buyer' | 'seller';
}

export interface PaymentProofRequest {
  transactionId: string;
  proofFile: File;
}

export async function createTransaction(request: TransactionCreateRequest): Promise<{
  success: boolean;
  transactionId?: string;
  qrCode?: string;
  message: string;
}> {
  try {
    // CRITICAL FIX: Validate listing_price
    // The database constraint requires: listing_price > 0
    const price = Number(request.listingPrice);
    
    // Check if price is a valid number and greater than 0
    if (isNaN(price) || price <= 0) {
      return {
        success: false,
        message: `Invalid listing price: ${request.listingPrice}. Price must be a number greater than 0.`,
      };
    }

    const qrCode = 'QR_' + Math.random().toString(36).substring(2, 11) + Date.now();

    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          buyer_id: request.buyerId,
          seller_id: request.sellerId,
          listing_id: request.listingId,
          listing_price: price, // Use validated price
          listing_currency: 'ZAR',
          qr_code: qrCode,
          status: 'qr_generated',
          meetup_location: request.meetupLocation,
          meetup_date: request.meetupDate,
          meetup_time: request.meetupTime,
          qr_confirmation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Transaction creation error:', error);
      return { success: false, message: 'Failed to create transaction: ' + error.message };
    }

    return {
      success: true,
      transactionId: data.id,
      qrCode: qrCode,
      message: 'Transaction created. Please scan the QR code at meetup.',
    };
  } catch (err) {
    console.error('createTransaction error:', err);
    return {
      success: false,
      message: 'An error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

export async function confirmQRScan(request: QRConfirmationRequest): Promise<{
  success: boolean;
  bothConfirmed: boolean;
  message: string;
}> {
  try {
    console.log('🔵 Starting QR scan confirmation...');
    console.log('Request:', request);

    console.log('📡 Calling API: /api/qr-scan');
    
    const scanResponse = await fetch('/api/qr-scan', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionId: request.transactionId,
        userId: request.userId,
        userType: request.userType,
      }),
    });

    console.log('📡 API Response Status:', scanResponse.status);

    const responseText = await scanResponse.text();
    console.log('📡 API Response Text:', responseText);

    interface ErrorResponse {
      error?: string;
      rawText?: string;
      message?: string;
    }

    let errorData: ErrorResponse = {};
    try {
      errorData = JSON.parse(responseText) as ErrorResponse;
    } catch (parseErr) {
      console.warn('⚠️ Could not parse response as JSON:', parseErr);
      errorData = { rawText: responseText };
    }

    if (!scanResponse.ok) {
      console.error('❌ QR scan API error:', errorData);
      const errorMessage = errorData.error || errorData.rawText || errorData.message || 'Unknown error';
      return { 
        success: false, 
        bothConfirmed: false, 
        message: 'Failed to log QR scan: ' + errorMessage
      };
    }

    console.log('✅ QR scan logged successfully');

    console.log('📝 Updating transaction status...');
    
    const updateData =
      request.userType === 'buyer'
        ? { buyer_qr_confirmed: true, buyer_qr_confirmed_at: new Date().toISOString() }
        : { seller_qr_confirmed: true, seller_qr_confirmed_at: new Date().toISOString() };

    // Update transaction status (without .select() to avoid RLS issues)
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        ...updateData,
        status: 'buyer_qr_confirmed',
      })
      .eq('id', request.transactionId);

    if (updateError) {
      console.error('❌ Transaction update error:', updateError);
      return { success: false, bothConfirmed: false, message: 'Failed to confirm QR: ' + updateError.message };
    }

    console.log('✅ Transaction updated');

    // Fetch the updated transaction separately to check both confirmations
    console.log('📝 Fetching updated transaction...');
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('buyer_qr_confirmed, seller_qr_confirmed')
      .eq('id', request.transactionId)
      .single();

    if (fetchError || !transaction) {
      console.error('❌ Failed to fetch transaction:', fetchError);
      return { success: false, bothConfirmed: false, message: 'Failed to fetch transaction status' };
    }

    console.log('✅ Transaction fetched:', transaction);

    const bothConfirmed = transaction.buyer_qr_confirmed && transaction.seller_qr_confirmed;

    if (bothConfirmed) {
      console.log('🎉 Both parties confirmed!');
      await supabase
        .from('transactions')
        .update({
          status: 'qr_confirmed',
          qr_confirmed_at: new Date().toISOString(),
          payment_status: 'unpaid',
        })
        .eq('id', request.transactionId);

      return {
        success: true,
        bothConfirmed: true,
        message: 'Meetup confirmed by both parties. Please proceed with payment.',
      };
    }

    console.log('⏳ Waiting for other party...');
    return {
      success: true,
      bothConfirmed: false,
      message: 'Your QR confirmation has been recorded. Waiting for the other party.',
    };
  } catch (err) {
    console.error('❌ confirmQRScan error:', err);
    return {
      success: false,
      bothConfirmed: false,
      message: 'An error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

export async function uploadPaymentProof(request: PaymentProofRequest): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(request.proofFile.type)) {
      return { success: false, message: 'Only JPG, PNG, and PDF files are allowed' };
    }

    if (request.proofFile.size > 5 * 1024 * 1024) {
      return { success: false, message: 'File size exceeds 5MB limit' };
    }

    const filename = `${request.transactionId}/${Date.now()}-${request.proofFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filename, request.proofFile);

    if (uploadError) {
      return { success: false, message: 'Failed to upload payment proof' };
    }

    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filename);

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        payment_proof_url: urlData?.publicUrl,
        payment_proof_uploaded_at: new Date().toISOString(),
        payment_status: 'proof_uploaded',
        status: 'payment_uploaded',
      })
      .eq('id', request.transactionId);

    if (updateError) {
      return { success: false, message: 'Failed to record payment proof' };
    }

    return {
      success: true,
      message: 'Payment proof uploaded. Waiting for seller confirmation.',
    };
  } catch (err) {
    return {
      success: false,
      message: 'An error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

export async function confirmPaymentReceived(transactionId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        seller_payment_confirmed: true,
        seller_payment_confirmed_at: new Date().toISOString(),
        payment_status: 'confirmed',
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      return { success: false, message: 'Failed to confirm payment' };
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', data.listing_id)
      .single();

    if (listing) {
      const { data: sellerProfile } = await supabase
        .from('user_profiles')
        .select('total_transactions')
        .eq('id', listing.seller_id)
        .single();

      if (sellerProfile) {
        await supabase
          .from('user_profiles')
          .update({
            total_transactions: (sellerProfile.total_transactions || 0) + 1,
          })
          .eq('id', listing.seller_id);
      }

      const { data: buyerProfile } = await supabase
        .from('user_profiles')
        .select('total_transactions')
        .eq('id', data.buyer_id)
        .single();

      if (buyerProfile) {
        await supabase
          .from('user_profiles')
          .update({
            total_transactions: (buyerProfile.total_transactions || 0) + 1,
          })
          .eq('id', data.buyer_id);
      }
    }

    return {
      success: true,
      message: 'Payment confirmed. Transaction completed!',
    };
  } catch (err) {
    return {
      success: false,
      message: 'An error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

export async function getTransactionDetails(transactionId: string) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `
        *,
        buyer:buyer_id(id, full_name, trust_score),
        seller:seller_id(id, full_name, trust_score),
        listing:listing_id(title, price)
      `
      )
      .eq('id', transactionId)
      .single();

    if (error) {
      console.error('Failed to fetch transaction:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching transaction details:', err);
    return null;
  }
}

export async function openDispute(transactionId: string, reason: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        dispute_opened: true,
        dispute_opened_at: new Date().toISOString(),
        dispute_reason: reason,
        status: 'disputed',
      })
      .eq('id', transactionId);

    if (error) {
      return { success: false, message: 'Failed to open dispute' };
    }

    return {
      success: true,
      message: 'Dispute opened. Admin will review your case.',
    };
  } catch (err) {
    return {
      success: false,
      message: 'An error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

export async function cancelTransaction(transactionId: string, reason: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        dispute_reason: reason,
      })
      .eq('id', transactionId);

    if (error) {
      return { success: false, message: 'Failed to cancel transaction' };
    }

    return {
      success: true,
      message: 'Transaction cancelled successfully.',
    };
  } catch (err) {
    return {
      success: false,
      message: 'An error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}