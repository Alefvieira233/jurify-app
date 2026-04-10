-- DEPRECATED: This migration originally contained a hardcoded Supabase anon JWT
-- in the Authorization header of a pg_cron job. The JWT has been redacted and
-- the scheduler was replaced by 20260410000001_remove_hardcoded_jwt_pg_cron.sql,
-- which sources the token from Supabase Vault instead.
--
-- For new environments, apply both migrations and create the vault secret:
--   SELECT vault.create_secret('<new-anon-key>', 'supabase_anon_key');
--
-- See docs/audit/2026-04-10/99-REMEDIATION-PLAN.md for full context.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- No-op: scheduling moved to 20260410000001_remove_hardcoded_jwt_pg_cron.sql
SELECT 1;
