-- =====================================================================
-- Onda 18.2 — Cron job pra disparar lembretes de reunião 30min antes.
-- Edge function process-meeting-reminders roda a cada 15 minutos.
-- =====================================================================

SELECT cron.schedule(
  'process_meeting_reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-meeting-reminders',
    headers := json_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    )::jsonb,
    body := '{}'::jsonb
  )
  $$
);
