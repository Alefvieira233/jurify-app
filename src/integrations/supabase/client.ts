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

const rawUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');

// Filter out placeholder values from .env.example or empty strings
const supabaseUrl = rawUrl && rawUrl !== 'your_supabase_url' && rawUrl.startsWith('http') ? rawUrl : '';
const supabaseAnonKey = rawKey && rawKey !== 'your_supabase_anon_key' && rawKey.startsWith('eyJ') ? rawKey : '';

if (!supabaseUrl || !supabaseAnonKey) {
  // If we are in a test environment, don't throw, just log warning.
  // setup.ts will provide dummy values.
  const isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || !!process.env.VITEST);
  if (isTest) {
    console.warn('[supabase] Supabase environment variables are missing or placeholders. Using fallback for tests.');
  } else {
    throw new Error(
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

/** @deprecated Use `supabase` directly — it is now fully typed. */
export const supabaseTyped = supabase;

/**
 * @deprecated Use `supabase` directly — types were regenerated and cover all tables.
 * This alias now points to the TYPED client. It exists only for backwards compatibility
 * and will be removed in a future cleanup pass.
 */
export const supabaseUntyped = supabase;

/** Re-export Database type for consumers that need it */
export type { Database };
export type { Json } from './types';

