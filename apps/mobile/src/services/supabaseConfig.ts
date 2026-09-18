/**
 * Runtime Supabase configuration for the mobile app.
 * Keys come from Expo public env (never service_role here).
 */

export function getSupabaseUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export function getSupabaseAnonKey(): string | null {
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function isSupabaseConfigured(): boolean {
  return !!(getSupabaseUrl() && getSupabaseAnonKey());
}
