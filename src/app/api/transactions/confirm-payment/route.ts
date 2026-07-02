// File: src/app/api/transactions/confirm-payment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { transactionId, userId } = await request.json();

    if (!transactionId || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // ============================================
    // GET TRANSACTION
    // ============================================
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction fetch error:', transactionError);

      return NextResponse.json(
        {
          success: false,
          message: 'Transaction not found',
        },
        { status: 404 }
      );
    }

    // ============================================
    // VERIFY SELLER
    // ============================================
    if (transaction.seller_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not the seller of this transaction',
        },
        { status: 403 }
      );
    }

    // ============================================
    // VERIFY PAYMENT STATUS
    // ============================================
    if (transaction.payment_status !== 'proof_uploaded') {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot confirm payment. Current status: ${transaction.payment_status}`,
        },
        { status: 400 }
      );
    }

    // ============================================
    // UPDATE TRANSACTION
    // ============================================
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        payment_status: 'confirmed',
        seller_payment_confirmed: true,
        completed_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Transaction update error:', updateError);

      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update transaction',
        },
        { status: 500 }
      );
    }

    // ============================================
    // UPDATE SELLER TRUST SCORE
    // ============================================
    try {
      await supabase.rpc('increment_trust_score', {
        user_id: transaction.seller_id,
        points: 5,
      });

      await supabase.rpc('increment_transaction_count', {
        user_id: transaction.seller_id,
      });
    } catch (error) {
      console.error('Seller trust score update failed:', error);
    }

    // ============================================
    // UPDATE BUYER TRUST SCORE
    // ============================================
    try {
      await supabase.rpc('increment_trust_score', {
        user_id: transaction.buyer_id,
        points: 5,
      });

      await supabase.rpc('increment_transaction_count', {
        user_id: transaction.buyer_id,
      });
    } catch (error) {
      console.error('Buyer trust score update failed:', error);
    }

    // ============================================
    // GET CLIENT IP
    // ============================================
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    const clientIp =
      forwardedFor?.split(',')[0]?.trim() ||
      realIp ||
      '0.0.0.0';

    // ============================================
    // AUDIT LOG
    // ============================================
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        action: 'payment_confirmed',
        admin_id: userId,
        resource_type: 'transaction',
        resource_id: transactionId,
        details: {
          transaction_id: transactionId,
          seller_id: transaction.seller_id,
          buyer_id: transaction.buyer_id,
          amount: transaction.listing_price,
          currency: transaction.listing_currency,
        },
        ip_address: clientIp,
        user_agent: request.headers.get('user-agent') || '',
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    // ============================================
    // SUCCESS RESPONSE
    // ============================================
    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully! Transaction completed.',
      data: {
        transactionId,
        status: 'completed',
      },
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          'Server error: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      },
      {
        status: 500,
      }
    );
  }
}
