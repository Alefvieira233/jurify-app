-- =====================================================================
-- P1 follow-ups da auditoria 2026-05-07 (defense-in-depth)
-- =====================================================================
-- 1) UNIQUE parcial em agendamentos via função wrapper IMMUTABLE — defense-
--    in-depth pra race condition (RPC try_acquire_schedule_slot é a 1ª linha).
-- 2) UNIQUE parcial em conexoes_whatsapp.instance_name — mitiga risco residual
--    do fallback 1b no tenant resolution (P0 #1).

-- 1) Função IMMUTABLE pra bucket de minutos.
-- date_trunc/extract direto em timestamptz são STABLE (dependem de timezone).
-- Trabalhando com diferença timestamptz - timestamptz constante UTC, o
-- resultado é interval, e extract(epoch from interval) é IMMUTABLE.
CREATE OR REPLACE FUNCTION public.minute_bucket_immutable(_ts TIMESTAMPTZ)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path TO 'pg_catalog'
AS $$
  SELECT (EXTRACT(EPOCH FROM (_ts - '2000-01-01 00:00:00+00'::TIMESTAMPTZ))::BIGINT) / 60
$$;

COMMENT ON FUNCTION public.minute_bucket_immutable(TIMESTAMPTZ) IS
  'Retorna minuto-bucket UTC (BIGINT) determinístico de um timestamptz. IMMUTABLE — apto pra uso em índice expression.';

-- 2) UNIQUE parcial em agendamentos (tenant_id, lead_id, minuto) ativos
CREATE UNIQUE INDEX IF NOT EXISTS uq_agendamentos_lead_active_future
  ON public.agendamentos (
    tenant_id,
    lead_id,
    public.minute_bucket_immutable(data_hora)
  )
  WHERE status IN ('agendado', 'confirmado');

COMMENT ON INDEX public.uq_agendamentos_lead_active_future IS
  'Defense-in-depth pra race condition (P0 #2). Garante que mesmo com bypass da RPC try_acquire_schedule_slot, INSERTs duplicados (mesmo lead, mesmo minuto, status ativo) são rejeitados pelo banco.';

-- 3) UNIQUE parcial em conexoes_whatsapp.instance_name
CREATE UNIQUE INDEX IF NOT EXISTS uq_conexoes_whatsapp_instance_name
  ON public.conexoes_whatsapp (instance_name)
  WHERE instance_name IS NOT NULL AND instance_name <> '';

COMMENT ON INDEX public.uq_conexoes_whatsapp_instance_name IS
  'Mitiga risco residual do fallback 1b em tenant resolution (P0 #1). Garante que cada instance_name (phone_number_id Kapso/Meta) pertence a no máximo 1 tenant.';
