/**
 * Supabase client — Production Ready, Fully Typed
 *
 * All queries through `supabase` are now type-safe via the auto-generated
 * `Database` type. IDE autocomplete works on `.from('table')` calls.
 *
 * To regenerate types after schema changes:
 * ```sh
 * npx supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts
 * ```
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database-extended';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback to test placeholder URL in test environment if empty to avoid URL parse errors during Vitest / Happy DOM runs
const supabaseUrl =
  rawSupabaseUrl && rawSupabaseUrl.trim() !== ''
    ? rawSupabaseUrl
    : 'https://test.supabase.co';

const supabaseAnonKey =
  rawSupabaseAnonKey && rawSupabaseAnonKey.trim() !== ''
    ? rawSupabaseAnonKey
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS10ZXN0Iiwicm9sZSI6ImFub24iLCJleHAiOjk5OTk5OTk5OTl9.test-key';

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  // In non-test browser environments, log a warning if environment variables are missing
  if (typeof window !== 'undefined' && !import.meta.env.DEV) {
    console.warn(
      '[supabase] Missing environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY.'
    );
  }
}

/**
 * Typed Supabase client with full Database type-safety.
 * Every `.from('table')` call is now autocompleted and type-checked.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

/**
 * @deprecated Use `supabase` directly — types were regenerated and cover all tables.
 * Mantido apenas pra back-compat com 56 arquivos legados (refactor incremental
 * pendente). NÃO usar em código novo.
 */
export const supabaseUntyped = supabase;

/** Re-export Database type for consumers that need it */
export type { Database };
export type { Json } from './types';

