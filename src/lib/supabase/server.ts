import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseConfig } from "@/lib/supabase/config";

export function createServerSupabaseClient(): SupabaseClient {
  const { url, key } = getServerSupabaseConfig();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
