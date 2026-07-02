import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic (no prerendering for API routes with server-side code)
export const dynamic = "force-dynamic";

// Create Supabase client inside the handler (not at module level)
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured. Check Vercel environment variables."
    );
  }
  if (!supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Check Vercel environment variables."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, paymentProof } = body;

    // Validate input
    if (!transactionId || !paymentProof) {
      return NextResponse.json(
        { error: "Missing transactionId or paymentProof" },
        { status: 400 }
      );
    }

    // Create Supabase client here (at request time, not build time)
    const supabase = createSupabaseClient();

    // Update transaction with payment proof
    const { error } = await supabase
      .from("transactions")
      .update({
        payment_proof_url: paymentProof,
        status: "payment_submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Payment confirmed" },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("API error:", errorMessage);

    return NextResponse.json(
      {
        error: errorMessage,
        hint: "Check Vercel environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
      { status: 500 }
    );
  }
}