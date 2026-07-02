import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

interface QRScanRequest {
  transactionId: string;
  userId: string;
  userType: 'buyer' | 'seller';
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔧 API Route called');
    console.log('SUPABASE_URL exists:', !!supabaseUrl);
    console.log('SERVICE_ROLE_KEY exists:', !!serviceRoleKey);

    if (!supabaseUrl) {
      console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not configured");
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL environment variable" },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not configured");
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Add it to .env.local" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('✅ Supabase client created');

    let body: QRScanRequest;
    try {
      body = await request.json();
    } catch (err) {
      console.error('❌ Invalid JSON body:', err);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { transactionId, userId, userType } = body;

    if (!transactionId || typeof transactionId !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid transactionId" },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid userId" },
        { status: 400 }
      );
    }

    if (!userType || !['buyer', 'seller'].includes(userType)) {
      return NextResponse.json(
        { error: "Invalid userType - must be 'buyer' or 'seller'" },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(transactionId)) {
      return NextResponse.json(
        { error: "Invalid transactionId format" },
        { status: 400 }
      );
    }

    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      );
    }

    console.log('📝 Verifying transaction exists...');

    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id, status')
      .eq('id', transactionId)
      .single();

    if (txError) {
      console.error('❌ Transaction query error:', txError);
      return NextResponse.json(
        { error: "Failed to find transaction: " + txError.message },
        { status: 500 }
      );
    }

    if (!transaction) {
      console.error('❌ Transaction not found:', transactionId);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    console.log('✅ Transaction found:', transaction.id);
    console.log('📝 Inserting QR scan record...');

    // Insert QR scan - WITHOUT the 'confirmed' column since it doesn't exist in the schema
    const { data: scanData, error: scanError } = await supabaseAdmin
      .from('qr_scans')
      .insert([
        {
          transaction_id: transactionId,
          user_id: userId,
          scan_type: userType + '_scan',
          scanned_at: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          // REMOVED: confirmed: true, (this column doesn't exist in your qr_scans table)
        },
      ])
      .select()
      .single();

    if (scanError) {
      console.error('❌ QR scan insert error:', scanError);
      return NextResponse.json(
        { 
          error: "Failed to log QR scan",
          details: scanError.message,
        },
        { status: 500 }
      );
    }

    console.log('✅ QR scan logged successfully:', scanData.id);

    return NextResponse.json(
      {
        success: true,
        message: "QR scan logged successfully",
        scanId: scanData.id,
      },
      { status: 200 }
    );

  } catch (err) {
    console.error('❌ QR scan API error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: "Internal server error: " + errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}