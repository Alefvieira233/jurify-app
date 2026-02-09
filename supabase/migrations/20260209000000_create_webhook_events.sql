-- Webhook idempotency table
-- Prevents duplicate processing of webhook events from Stripe, WhatsApp, etc.
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint ensures each event is processed only once per source
ALTER TABLE public.webhook_events
  ADD CONSTRAINT webhook_events_event_id_source_unique UNIQUE (event_id, source);

-- Index for cleanup queries (delete old events)
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events (created_at);

-- Auto-cleanup: remove events older than 7 days
-- (Can be called via pg_cron or a scheduled edge function)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.webhook_events
  WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- RLS: webhook_events should only be accessed by service role (edge functions)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service_role can access (which is what we want)
