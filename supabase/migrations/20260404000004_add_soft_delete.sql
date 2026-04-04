-- Migration: DEB-015 — Soft-delete infrastructure
-- Story: 3.1 — Database Normalization & LGPD Compliance
--
-- Adds `deleted_at` column to core tables, partial indexes for active records,
-- an audit-logging trigger function, and updates RLS policies to exclude soft-deleted rows.

BEGIN;

-- ==========================================================================
-- 1. Add deleted_at column to core tables
-- ==========================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.honorarios
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ==========================================================================
-- 2. Partial indexes for active (non-deleted) records
-- ==========================================================================

-- leads: most common query is by tenant + status
CREATE INDEX IF NOT EXISTS idx_leads_active_tenant
  ON public.leads(tenant_id, status)
  WHERE deleted_at IS NULL;

-- processos: by tenant + status
CREATE INDEX IF NOT EXISTS idx_processos_active_tenant
  ON public.processos(tenant_id, status)
  WHERE deleted_at IS NULL;

-- contratos: by tenant + status
CREATE INDEX IF NOT EXISTS idx_contratos_active_tenant
  ON public.contratos(tenant_id, status)
  WHERE deleted_at IS NULL;

-- honorarios: by tenant + processo_id
CREATE INDEX IF NOT EXISTS idx_honorarios_active_tenant
  ON public.honorarios(tenant_id, processo_id)
  WHERE deleted_at IS NULL;

-- agendamentos: by tenant + data_hora
CREATE INDEX IF NOT EXISTS idx_agendamentos_active_tenant
  ON public.agendamentos(tenant_id, data_hora)
  WHERE deleted_at IS NULL;

-- ==========================================================================
-- 3. Trigger function: log soft-deletes to audit_log
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.on_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when deleted_at transitions from NULL to a value
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    INSERT INTO public.audit_log (
      operation,
      table_name,
      record_id,
      tenant_id,
      user_id,
      old_data,
      new_data,
      changed_fields
    ) VALUES (
      'SOFT_DELETE',
      TG_TABLE_NAME,
      NEW.id::text,
      NEW.tenant_id,
      auth.uid()::text,
      row_to_json(OLD)::jsonb,
      jsonb_build_object('deleted_at', NEW.deleted_at),
      ARRAY['deleted_at']
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to each table
DROP TRIGGER IF EXISTS trg_soft_delete_leads ON public.leads;
CREATE TRIGGER trg_soft_delete_leads
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.on_soft_delete();

DROP TRIGGER IF EXISTS trg_soft_delete_processos ON public.processos;
CREATE TRIGGER trg_soft_delete_processos
  BEFORE UPDATE ON public.processos
  FOR EACH ROW
  EXECUTE FUNCTION public.on_soft_delete();

DROP TRIGGER IF EXISTS trg_soft_delete_contratos ON public.contratos;
CREATE TRIGGER trg_soft_delete_contratos
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.on_soft_delete();

DROP TRIGGER IF EXISTS trg_soft_delete_honorarios ON public.honorarios;
CREATE TRIGGER trg_soft_delete_honorarios
  BEFORE UPDATE ON public.honorarios
  FOR EACH ROW
  EXECUTE FUNCTION public.on_soft_delete();

DROP TRIGGER IF EXISTS trg_soft_delete_agendamentos ON public.agendamentos;
CREATE TRIGGER trg_soft_delete_agendamentos
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.on_soft_delete();

-- ==========================================================================
-- 4. Update RLS policies to exclude soft-deleted rows
--    Strategy: Drop and recreate SELECT policies with deleted_at IS NULL.
--    Other policies (INSERT/UPDATE/DELETE) don't need the filter since
--    INSERT can't set deleted_at and UPDATE/DELETE operate on visible rows.
-- ==========================================================================

-- --- LEADS ---
DROP POLICY IF EXISTS "rls_leads_select" ON public.leads;
CREATE POLICY "rls_leads_select" ON public.leads
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND deleted_at IS NULL
);

-- --- PROCESSOS ---
-- Drop all known policy names from various migrations
DROP POLICY IF EXISTS "processos_select_tenant" ON public.processos;
DROP POLICY IF EXISTS "rls_processos_select" ON public.processos;
CREATE POLICY "rls_processos_select" ON public.processos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND deleted_at IS NULL
);

-- --- CONTRATOS ---
DROP POLICY IF EXISTS "rls_contratos_select" ON public.contratos;
CREATE POLICY "rls_contratos_select" ON public.contratos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND deleted_at IS NULL
);

-- --- HONORARIOS ---
DROP POLICY IF EXISTS "honorarios_select_tenant" ON public.honorarios;
DROP POLICY IF EXISTS "rls_honorarios_select" ON public.honorarios;
CREATE POLICY "rls_honorarios_select" ON public.honorarios
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND deleted_at IS NULL
);

-- --- AGENDAMENTOS ---
DROP POLICY IF EXISTS "rls_agendamentos_select" ON public.agendamentos;
CREATE POLICY "rls_agendamentos_select" ON public.agendamentos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND deleted_at IS NULL
);

COMMIT;
