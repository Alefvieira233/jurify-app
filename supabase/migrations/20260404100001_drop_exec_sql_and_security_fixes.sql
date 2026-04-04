-- ============================================================================
-- Migration: Drop exec_sql + Security hardening
-- Date: 2026-04-04
-- Purpose: Remove dangerous exec_sql function, add model whitelist for AI
-- ============================================================================

-- 1. Drop exec_sql — accepts arbitrary SQL, critical security risk
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.exec_sql(sql_query text);

-- 2. Ensure allowed_columns has RLS enabled
ALTER TABLE IF EXISTS public.allowed_columns ENABLE ROW LEVEL SECURITY;

-- 3. Restrict allowed_columns to service_role only
DO $$
BEGIN
  DROP POLICY IF EXISTS "allowed_columns_service_role_only" ON public.allowed_columns;
  CREATE POLICY "allowed_columns_service_role_only" ON public.allowed_columns
    FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  NULL; -- Table may not exist in all environments
END $$;
