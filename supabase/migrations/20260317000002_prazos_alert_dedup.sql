-- Add anti-spam fields to prazos_processuais
-- Prevents sending duplicate alerts for the same prazo within 24h

ALTER TABLE public.prazos_processuais
  ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_alert_dias INT DEFAULT NULL;

COMMENT ON COLUMN public.prazos_processuais.last_alert_sent_at IS 'Timestamp of the last WhatsApp alert sent for this prazo';
COMMENT ON COLUMN public.prazos_processuais.last_alert_dias IS 'The dias_restantes value when the last alert was sent';

-- Index for the cron query: pending prazos within 30 days that need alert check
CREATE INDEX IF NOT EXISTS idx_prazos_alert_pending
  ON public.prazos_processuais(status, data_prazo)
  WHERE status = 'pendente';
