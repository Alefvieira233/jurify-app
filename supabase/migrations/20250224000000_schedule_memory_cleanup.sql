-- Schedule daily cleanup of expired agent_memory rows
-- Requires pg_cron extension (available on Supabase Pro+)
-- Run this migration once after deploying the cleanup-agent-memory Edge Function

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing schedule if it exists (idempotent)
SELECT cron.unschedule('cleanup-agent-memory') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-agent-memory'
);

-- Schedule daily at 02:00 UTC
SELECT cron.schedule(
  'cleanup-agent-memory',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/cleanup-agent-memory',
    headers := json_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    )::text,
    body := '{}'::text
  )
  $$
);

-- Also clean up inline (belt-and-suspenders) for any SQL-capable environments
-- This policy-safe delete runs at migration time to clear existing expired rows
DELETE FROM agent_memory
WHERE expires_at IS NOT NULL
  AND expires_at < NOW();
