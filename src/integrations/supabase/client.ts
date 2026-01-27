/**
 * Supabase client - Production Ready
 */

import { createClient } from '@supabase/supabase-js';

// Fallback values for production (anon key is public by design)
const FALLBACK_URL = 'https://yfxgncbopvnsltjqetxw.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeGduY2JvcHZuc2x0anFldHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzIzMTksImV4cCI6MjA2NTUwODMxOX0.NqVjMB81nBlAE4h7jvsHfDBOpMKXohNsquVIvEFH46A';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

console.log('[supabase] Initializing client...', {
  url: supabaseUrl,
  hasEnvUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasEnvKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  usingFallback: !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY
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
