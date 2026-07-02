import { createClient } from "@supabase/supabase-js";

// Get environment variables - with safe fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only validate if we're actually trying to use the client
// (this allows the build to succeed even if env vars are missing)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️  Supabase credentials not available. This is expected during build if environment variables aren't set."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      storage:
        typeof window !== "undefined" ? window.sessionStorage : undefined,
      persistSession: true,
    },
  }
);

// Export a validation function for runtime use
export function validateSupabaseConfig() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL environment variable is not set. Please configure it in Vercel settings."
    );
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set. Please configure it in Vercel settings."
    );
  }
}