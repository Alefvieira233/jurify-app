-- Migration: DEB-019 — Retention policy configuration
-- Story: 3.1 — Database Normalization & LGPD Compliance
--
-- Documents the TTL configuration for the data-retention-cleanup Edge Function.
-- The Edge Function already exists at supabase/functions/data-retention-cleanup/index.ts
-- and uses per-tenant `data_retention_days` from the tenants table.
--
-- This migration adds fixed-TTL cleanup for log tables that are NOT tenant-scoped
-- in their retention (they follow LGPD fixed retention periods regardless of tenant config).
--
-- TTL configuration:
--   agent_ai_logs:          90 days
--   logs_execucao_agentes:  90 days
--   audit_log:             365 days

BEGIN;

-- ==========================================================================
-- 1. Create a cleanup function for fixed-TTL log tables
--    This can be called by pg_cron or an Edge Function on a schedule.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.cleanup_retention_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_ai_logs integer;
  deleted_exec_logs integer;
  deleted_audit_logs integer;
BEGIN
  -- agent_ai_logs: 90-day retention
  DELETE FROM public.agent_ai_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_ai_logs = ROW_COUNT;

  -- logs_execucao_agentes: 90-day retention
  DELETE FROM public.logs_execucao_agentes
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_exec_logs = ROW_COUNT;

  -- audit_log: 365-day retention
  DELETE FROM public.audit_log
  WHERE created_at < NOW() - INTERVAL '365 days';
  GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;

  RETURN jsonb_build_object(
    'agent_ai_logs_deleted', deleted_ai_logs,
    'logs_execucao_agentes_deleted', deleted_exec_logs,
    'audit_log_deleted', deleted_audit_logs,
    'executed_at', NOW()
  );
END;
$$;

-- ==========================================================================
-- 2. Add indexes to support efficient cleanup on created_at
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_created_at
  ON public.agent_ai_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_logs_execucao_agentes_created_at
  ON public.logs_execucao_agentes(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log(created_at);

COMMIT;
