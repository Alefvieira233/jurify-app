-- Migration: Unify lead status system
-- Converts all legacy status values to the canonical system:
--   novo_lead        → novo
--   em_qualificacao  → qualificado
--   analise_juridica → proposta  (merged into proposta stage)
--   proposta_enviada → proposta
--   contrato_assinado → ganho
--   em_atendimento   → em_contato
--   lead_perdido     → perdido
--   convertido       → ganho
--
-- Safe: only updates rows that still have old values.
-- Idempotent: running twice has no effect.

BEGIN;

-- 1. Convert legacy status values in leads table
UPDATE leads SET status = 'novo'       WHERE status = 'novo_lead';
UPDATE leads SET status = 'qualificado' WHERE status = 'em_qualificacao';
UPDATE leads SET status = 'proposta'   WHERE status = 'analise_juridica';
UPDATE leads SET status = 'proposta'   WHERE status = 'proposta_enviada';
UPDATE leads SET status = 'ganho'      WHERE status = 'contrato_assinado';
UPDATE leads SET status = 'em_contato' WHERE status = 'em_atendimento';
UPDATE leads SET status = 'perdido'    WHERE status = 'lead_perdido';
UPDATE leads SET status = 'ganho'      WHERE status = 'convertido';

-- 2. Update the default value for new leads
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'novo';

-- 3. Update pipeline_stages table if it still has old stage identifiers
UPDATE pipeline_stages SET nome = 'novo'        WHERE nome = 'novo_lead';
UPDATE pipeline_stages SET nome = 'qualificado' WHERE nome = 'em_qualificacao';
UPDATE pipeline_stages SET nome = 'proposta'    WHERE nome = 'analise_juridica';
UPDATE pipeline_stages SET nome = 'proposta'    WHERE nome = 'proposta_enviada';
UPDATE pipeline_stages SET nome = 'ganho'       WHERE nome = 'contrato_assinado';
UPDATE pipeline_stages SET nome = 'em_contato'  WHERE nome = 'em_atendimento';
UPDATE pipeline_stages SET nome = 'perdido'     WHERE nome = 'lead_perdido';

-- 4. Refresh materialized views that cache status counts (if they exist)
-- These views use old column names (status_novo_lead etc.) so they need to be
-- recreated. However, since the materialized view definition is in an older
-- migration and may or may not exist, we do this conditionally.
DO $$
BEGIN
  -- Try to refresh; if the view doesn't exist, just skip
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'dashboard_metrics_mv'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_mv;
  END IF;
END $$;

COMMIT;
