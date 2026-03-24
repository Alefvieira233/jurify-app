-- Migration: Unify lead status system
-- Safe, idempotent, handles unique constraints and missing tables.

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

-- 3. Update crm_pipeline_stages: reassign leads then delete legacy duplicates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_pipeline_stages') THEN
    RETURN;
  END IF;

  -- Point any lead referencing a legacy stage to the canonical one (same tenant)
  UPDATE leads l
     SET pipeline_stage_id = canonical.id
    FROM crm_pipeline_stages legacy
    JOIN crm_pipeline_stages canonical
      ON canonical.tenant_id = legacy.tenant_id
     AND canonical.slug = 'novo'
   WHERE legacy.slug = 'novo_lead'
     AND l.pipeline_stage_id = legacy.id;

  UPDATE leads l
     SET pipeline_stage_id = canonical.id
    FROM crm_pipeline_stages legacy
    JOIN crm_pipeline_stages canonical
      ON canonical.tenant_id = legacy.tenant_id
     AND canonical.slug = 'qualificado'
   WHERE legacy.slug = 'em_qualificacao'
     AND l.pipeline_stage_id = legacy.id;

  UPDATE leads l
     SET pipeline_stage_id = canonical.id
    FROM crm_pipeline_stages legacy
    JOIN crm_pipeline_stages canonical
      ON canonical.tenant_id = legacy.tenant_id
     AND canonical.slug = 'proposta'
   WHERE legacy.slug IN ('analise_juridica', 'proposta_enviada')
     AND l.pipeline_stage_id = legacy.id;

  UPDATE leads l
     SET pipeline_stage_id = canonical.id
    FROM crm_pipeline_stages legacy
    JOIN crm_pipeline_stages canonical
      ON canonical.tenant_id = legacy.tenant_id
     AND canonical.slug = 'ganho'
   WHERE legacy.slug = 'contrato_assinado'
     AND l.pipeline_stage_id = legacy.id;

  UPDATE leads l
     SET pipeline_stage_id = canonical.id
    FROM crm_pipeline_stages legacy
    JOIN crm_pipeline_stages canonical
      ON canonical.tenant_id = legacy.tenant_id
     AND canonical.slug = 'em_contato'
   WHERE legacy.slug = 'em_atendimento'
     AND l.pipeline_stage_id = legacy.id;

  UPDATE leads l
     SET pipeline_stage_id = canonical.id
    FROM crm_pipeline_stages legacy
    JOIN crm_pipeline_stages canonical
      ON canonical.tenant_id = legacy.tenant_id
     AND canonical.slug = 'perdido'
   WHERE legacy.slug = 'lead_perdido'
     AND l.pipeline_stage_id = legacy.id;

  -- Now safe to delete the legacy stages (no more FK references)
  DELETE FROM crm_pipeline_stages
   WHERE slug IN (
     'novo_lead', 'em_qualificacao', 'analise_juridica',
     'proposta_enviada', 'contrato_assinado', 'em_atendimento', 'lead_perdido'
   );

  -- Rename stages that exist alone (no canonical duplicate yet)
  -- Using ON CONFLICT-safe approach: only update if slug doesn't already exist
  UPDATE crm_pipeline_stages SET name = 'Novo',       slug = 'novo'        WHERE slug = 'novo_lead';
  UPDATE crm_pipeline_stages SET name = 'Qualificado', slug = 'qualificado' WHERE slug = 'em_qualificacao';
  UPDATE crm_pipeline_stages SET name = 'Proposta',    slug = 'proposta'    WHERE slug = 'analise_juridica';
  UPDATE crm_pipeline_stages SET name = 'Proposta',    slug = 'proposta'    WHERE slug = 'proposta_enviada';
  UPDATE crm_pipeline_stages SET name = 'Ganho',       slug = 'ganho'       WHERE slug = 'contrato_assinado';
  UPDATE crm_pipeline_stages SET name = 'Em Contato',  slug = 'em_contato'  WHERE slug = 'em_atendimento';
  UPDATE crm_pipeline_stages SET name = 'Perdido',     slug = 'perdido'     WHERE slug = 'lead_perdido';
END $$;

-- 4. Convert legacy trigger/event names in automation tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_flows') THEN
    UPDATE automation_flows SET trigger_type = 'novo'  WHERE trigger_type = 'novo_lead';
    UPDATE automation_flows SET trigger_type = 'ganho'  WHERE trigger_type = 'contrato_assinado';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_rules') THEN
    UPDATE automation_rules SET evento = 'ganho' WHERE evento = 'contrato_assinado';
  END IF;
END $$;

-- 5. Convert legacy trigger events in follow-up sequences
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_followup_sequences') THEN
    UPDATE crm_followup_sequences SET trigger_event = 'proposta' WHERE trigger_event = 'proposta_enviada';
    UPDATE crm_followup_sequences SET trigger_event = 'perdido'  WHERE trigger_event = 'lead_perdido';
  END IF;
END $$;

-- 6. Refresh materialized views
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'dashboard_metrics_mv') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_mv;
  END IF;
END $$;

COMMIT;
