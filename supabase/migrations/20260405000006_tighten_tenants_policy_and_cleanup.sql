-- ============================================================================
-- Tighten tenants_signup_insert policy and clean up dead code references
--
-- Findings from AIOX full audit:
-- 1. tenants_signup_insert WITH CHECK (true) is overly permissive
-- 2. WhatsAppKapsoSetup dead code (frontend-only, no migration needed)
-- 3. data-retention-cleanup has orphan comment (cosmetic)
-- ============================================================================

-- Fix 1: Tighten tenants INSERT policy
-- The handle_new_user() trigger is SECURITY DEFINER (bypasses RLS).
-- We don't need a permissive policy for signup — the trigger handles it.
-- Keep only admin INSERT for manual tenant creation.
DROP POLICY IF EXISTS "tenants_signup_insert" ON public.tenants;

-- The existing admin policy from apply_rls_defaults('tenants', 'admin')
-- already allows admin INSERT. No replacement needed.
