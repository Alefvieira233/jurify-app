-- =============================================================================
-- P0-6 (revisado) — agent_executions schema fix + cleanup retroativo
--
-- Causa-raiz REAL identificada nesta sessão: o código em handlers/process-message.ts
-- fazia `.update({ status: 'completed', completed_at, error_message, ... })` mas
-- a tabela NÃO TINHA essas duas colunas. PostgREST retornava erro 400 silencioso
-- (porque o código usava `void ... .then(...)`, ignorando a Promise).
-- Resultado: 299 execuções (jan-mai/2026) presas em status='processing'.
--
-- Esta migration:
--   1. Adiciona as colunas `completed_at` (timestamptz) e `error_message` (text).
--   2. Adiciona índice para queries de telemetria (status + tenant_id).
--   3. Marca os 299 stuck como 'failed' com motivo explícito.
--
-- O fix do código (await + try/catch) já foi aplicado na mesma sessão.
-- =============================================================================

-- 1. Schema: adicionar colunas faltantes
ALTER TABLE public.agent_executions
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;

-- 2. Índice para consultas de telemetria (qual tenant tem execuções stuck/erradas)
CREATE INDEX IF NOT EXISTS idx_agent_executions_tenant_status_started
  ON public.agent_executions(tenant_id, status, started_at DESC);

-- 3. Cleanup retroativo: marcar stuck como failed preservando timestamp original
UPDATE public.agent_executions
SET
  status = 'failed',
  error_message = COALESCE(error_message, 'recovered_from_stuck_processing_2026_05_25'),
  completed_at = COALESCE(completed_at, started_at + interval '30 seconds')
WHERE status = 'processing'
  AND started_at < now() - interval '5 minutes';

-- Sanity
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.agent_executions
  WHERE status = 'processing' AND started_at < now() - interval '5 minutes';
  IF v_count > 0 THEN
    RAISE WARNING 'Ainda restam % execuções stuck após cleanup', v_count;
  END IF;
END $$;
