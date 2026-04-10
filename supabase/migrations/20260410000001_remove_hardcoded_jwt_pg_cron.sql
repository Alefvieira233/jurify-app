-- Remove hardcoded JWT from pg_cron schedule and reschedule via Supabase Vault.
--
-- Background: 20260307000007_prazos_alerts_scheduler.sql committed a full anon JWT
-- in the Authorization header of a pg_cron job. This is a P0 security issue because
-- the token is visible in git history forever, and the migration file is readable
-- by anyone with repo access.
--
-- Fix: unschedule the insecure job and reschedule using vault.decrypted_secrets.
-- The secret 'supabase_anon_key' must be created via Supabase dashboard or CLI
-- (see docs/audit/2026-04-10/SETUP-REQUIRED.md for setup instructions).
--
-- Idempotent and safe to run whether pg_cron is installed or not.

DO $$
BEGIN
  -- Unschedule the old hardcoded job if it exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'prazos-alerts-daily';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not installed — nothing to unschedule
    RAISE NOTICE 'pg_cron not installed, skipping unschedule';
END $$;

-- Reschedule using Vault secret if available
-- Only runs if: pg_cron is installed AND vault secret 'supabase_anon_key' exists
DO $$
DECLARE
  v_anon_key text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed — alert scheduler must be configured via external cron (Vercel Cron, GitHub Actions)';
    RETURN;
  END IF;

  -- Try to read anon key from vault
  BEGIN
    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_anon_key'
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'vault schema not available or secret not set — skipping reschedule';
      RETURN;
  END;

  IF v_anon_key IS NULL THEN
    RAISE NOTICE 'Secret supabase_anon_key not found in vault — create it via: SELECT vault.create_secret(''NEW_ANON_KEY'', ''supabase_anon_key'')';
    RETURN;
  END IF;

  -- Reschedule using vault-sourced key
  PERFORM cron.schedule(
    'prazos-alerts-daily',
    '0 12 * * *',
    format(
      $cron$
      SELECT net.http_post(
        url := 'https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/process-prazos-alerts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer %s'
        ),
        body := '{}'::jsonb
      );
      $cron$,
      v_anon_key
    )
  );

  RAISE NOTICE 'prazos-alerts-daily rescheduled using vault secret';
END $$;
