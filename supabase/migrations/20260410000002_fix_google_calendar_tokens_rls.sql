-- Fix cross-tenant leak on google_calendar_tokens.
--
-- Background: 20260227000000_google_calendar_tokens_profile_fields.sql added a
-- policy "Service role manages tokens" with USING (true) and WITH CHECK (true)
-- applied to ALL roles (no TO clause). Because RLS policies are OR'd, this
-- effectively granted every authenticated user full read/write access to every
-- other user's OAuth tokens — a direct cross-user confidentiality leak.
--
-- The original per-user policy "Usuários podem gerenciar próprios tokens"
-- from 20250614222403 remains correct and is preserved.
--
-- This fix:
--   1. Drops the bad policy.
--   2. Creates a replacement that only grants access to the service_role,
--      so edge functions (google-calendar/oauth, create-drive-folder) still work.
--   3. Verifies the per-user policy exists; recreates it if it went missing.

-- 1. Drop the permissive policy
DROP POLICY IF EXISTS "Service role manages tokens" ON public.google_calendar_tokens;

-- 2. Recreate as service-role-only
CREATE POLICY "Service role manages tokens"
  ON public.google_calendar_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Ensure the per-user policy is present (defense-in-depth for fresh environments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'google_calendar_tokens'
      AND policyname = 'Usuários podem gerenciar próprios tokens'
  ) THEN
    EXECUTE 'CREATE POLICY "Usuários podem gerenciar próprios tokens" ON public.google_calendar_tokens FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- 4. Apply the same fix to google_calendar_settings and google_calendar_sync_logs
-- in case 20260227000000 pattern leaked to sibling tables
DO $$
BEGIN
  -- google_calendar_settings
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'google_calendar_settings'
      AND qual = 'true'
  ) THEN
    RAISE NOTICE 'Found permissive policy on google_calendar_settings — review manually';
  END IF;

  -- google_calendar_sync_logs
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'google_calendar_sync_logs'
      AND qual = 'true'
  ) THEN
    RAISE NOTICE 'Found permissive policy on google_calendar_sync_logs — review manually';
  END IF;
END $$;

COMMENT ON TABLE public.google_calendar_tokens IS
  'OAuth tokens per user. RLS: authenticated users can only access their own (user_id = auth.uid()); edge functions access via service_role. Fixed by migration 20260410000002.';
