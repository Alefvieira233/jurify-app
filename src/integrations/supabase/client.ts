/**
 * Supabase client defaults.
 * Keeps default config and validates envs early.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast if credentials are missing.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing.');
  console.error('Check your .env file:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - VITE_SUPABASE_ANON_KEY');
  throw new Error('Supabase URL and Anon Key are required in .env');
}

// Note: session persistence enabled for stable auth.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-application-name': 'jurify' },
  },
});

// Init log (always - for debugging production)
console.log('[supabase] client initialized', {
  url: supabaseUrl,
  mode: import.meta.env.MODE,
  hasAnonKey: !!supabaseAnonKey,
  anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
});
