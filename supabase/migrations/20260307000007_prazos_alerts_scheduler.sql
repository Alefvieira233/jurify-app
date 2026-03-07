-- pg_cron scheduler for process-prazos-alerts
-- Runs daily at 12:00 UTC (09:00 BRT) to send WhatsApp deadline alerts.
-- Requires pg_cron and pg_net extensions (both available in Supabase).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily alerts at 09:00 BRT (12:00 UTC)
-- Uses the project anon key — the function creates its own service-role client internally
SELECT cron.schedule(
  'prazos-alerts-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/process-prazos-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeGduY2JvcHZuc2x0anFldHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzIzMTksImV4cCI6MjA2NTUwODMxOX0.NqVjMB81nBlAE4h7jvsHfDBOpMKXohNsquVIvEFH46A'
    ),
    body := '{}'::jsonb
  );
  $$
);
