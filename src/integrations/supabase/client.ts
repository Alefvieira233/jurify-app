/**
 * Supabase client - Production Ready
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Missing environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY.'
  );
}

console.log('[supabase] Initializing client...', {
  url: supabaseUrl,
  hasEnvUrl: true,
  hasEnvKey: true,
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'jurify-auth',
    storage: window.localStorage,
  },
  global: {
    headers: { 'x-application-name': 'jurify' },
  },
});

console.log('[supabase] Client ready ✓');
