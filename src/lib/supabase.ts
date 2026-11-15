import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Not throwing: allows the static build to complete before env is set.
  // The auth UI will surface a message if these are missing at runtime.
  console.warn('[twopia] Supabase env not set — auth will be disabled.');
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
