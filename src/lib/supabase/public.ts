import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export function createPublicSupabaseClient(): SupabaseClient {
  const { url, key } = getPublicSupabaseConfig();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
