const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export function isServerSupabaseConfigured() {
  return Boolean(supabaseUrl() && serviceRoleKey());
}

export function getServerSupabaseConfig() {
  const url = supabaseUrl();
  const key = serviceRoleKey();

  if (!url || !key) {
    throw new Error("Server Supabase environment is not configured.");
  }

  return { url, key };
}
