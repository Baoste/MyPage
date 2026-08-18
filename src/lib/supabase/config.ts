const publicUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export function isPublicSupabaseConfigured() {
  return Boolean(publicUrl() && anonKey());
}

export function isServerSupabaseConfigured() {
  return Boolean(publicUrl() && serviceRoleKey());
}

export function getPublicSupabaseConfig() {
  const url = publicUrl();
  const key = anonKey();

  if (!url || !key) {
    throw new Error("Public Supabase environment is not configured.");
  }

  return { url, key };
}

export function getServerSupabaseConfig() {
  const url = publicUrl();
  const key = serviceRoleKey();

  if (!url || !key) {
    throw new Error("Server Supabase environment is not configured.");
  }

  return { url, key };
}
