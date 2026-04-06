-- Migration: Add tenant_id to junction/log tables for tenant isolation
-- Tables: automation_flow_edges, automation_flow_nodes, automation_rule_actions,
--         automation_rule_conditions, departamento_membros, lead_tags,
--         zapsign_logs, notification_templates
-- Idempotent: all operations use IF NOT EXISTS / DO $$ checks

-- ============================================================
-- 1. automation_flow_edges (parent: automation_flows via flow_id)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'automation_flow_edges'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.automation_flow_edges
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

    UPDATE public.automation_flow_edges e
      SET tenant_id = (SELECT f.tenant_id FROM public.automation_flows f WHERE f.id = e.flow_id)
      WHERE e.tenant_id IS NULL;

    ALTER TABLE public.automation_flow_edges
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automation_flow_edges_tenant_id
  ON public.automation_flow_edges(tenant_id);

ALTER TABLE public.automation_flow_edges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_flow_edges'
      AND policyname = 'tenant_isolation_automation_flow_edges'
  ) THEN
    CREATE POLICY tenant_isolation_automation_flow_edges
      ON public.automation_flow_edges
      FOR ALL
      USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 2. automation_flow_nodes (parent: automation_flows via flow_id)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'automation_flow_nodes'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.automation_flow_nodes
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

    UPDATE public.automation_flow_nodes n
      SET tenant_id = (SELECT f.tenant_id FROM public.automation_flows f WHERE f.id = n.flow_id)
      WHERE n.tenant_id IS NULL;

    ALTER TABLE public.automation_flow_nodes
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automation_flow_nodes_tenant_id
  ON public.automation_flow_nodes(tenant_id);

ALTER TABLE public.automation_flow_nodes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_flow_nodes'
      AND policyname = 'tenant_isolation_automation_flow_nodes'
  ) THEN
    CREATE POLICY tenant_isolation_automation_flow_nodes
      ON public.automation_flow_nodes
      FOR ALL
      USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 3. automation_rule_actions (parent: automation_rules via rule_id)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'automation_rule_actions'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.automation_rule_actions
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

    UPDATE public.automation_rule_actions a
      SET tenant_id = (SELECT r.tenant_id FROM public.automation_rules r WHERE r.id = a.rule_id)
      WHERE a.tenant_id IS NULL;

    ALTER TABLE public.automation_rule_actions
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automation_rule_actions_tenant_id
  ON public.automation_rule_actions(tenant_id);

ALTER TABLE public.automation_rule_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_rule_actions'
      AND policyname = 'tenant_isolation_automation_rule_actions'
  ) THEN
    CREATE POLICY tenant_isolation_automation_rule_actions
      ON public.automation_rule_actions
      FOR ALL
      USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 4. automation_rule_conditions (parent: automation_rules via rule_id)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'automation_rule_conditions'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.automation_rule_conditions
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

    UPDATE public.automation_rule_conditions c
      SET tenant_id = (SELECT r.tenant_id FROM public.automation_rules r WHERE r.id = c.rule_id)
      WHERE c.tenant_id IS NULL;

    ALTER TABLE public.automation_rule_conditions
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automation_rule_conditions_tenant_id
  ON public.automation_rule_conditions(tenant_id);

ALTER TABLE public.automation_rule_conditions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_rule_conditions'
      AND policyname = 'tenant_isolation_automation_rule_conditions'
  ) THEN
    CREATE POLICY tenant_isolation_automation_rule_conditions
      ON public.automation_rule_conditions
      FOR ALL
      USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 5. departamento_membros (parent: departamentos via departamento_id)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'departamento_membros'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.departamento_membros
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

    UPDATE public.departamento_membros dm
      SET tenant_id = (SELECT d.tenant_id FROM public.departamentos d WHERE d.id = dm.departamento_id)
      WHERE dm.tenant_id IS NULL;

    ALTER TABLE public.departamento_membros
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_departamento_membros_tenant_id
  ON public.departamento_membros(tenant_id);

ALTER TABLE public.departamento_membros ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'departamento_membros'
      AND policyname = 'tenant_isolation_departamento_membros'
  ) THEN
    CREATE POLICY tenant_isolation_departamento_membros
      ON public.departamento_membros
      FOR ALL
      USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 6. lead_tags (parent: leads via lead_id)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lead_tags'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.lead_tags
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

    UPDATE public.lead_tags lt
      SET tenant_id = (SELECT l.tenant_id FROM public.leads l WHERE l.id = lt.lead_id)
      WHERE lt.tenant_id IS NULL;

    ALTER TABLE public.lead_tags
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_tags_tenant_id
  ON public.lead_tags(tenant_id);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_tags'
      AND policyname = 'tenant_isolation_lead_tags'
  ) THEN
    CREATE POLICY tenant_isolation_lead_tags
      ON public.lead_tags
      FOR ALL
      USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 7. zapsign_logs (parent: contratos via contrato_id)
--    Note: contrato_id is nullable, so we use LEFT JOIN and allow NULL tenant_id
--    only for orphaned rows, then set NOT NULL after backfill
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'zapsign_logs'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.zapsign_logs
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

    UPDATE public.zapsign_logs zl
      SET tenant_id = (SELECT c.tenant_id FROM public.contratos c WHERE c.id = zl.contrato_id)
      WHERE zl.tenant_id IS NULL AND zl.contrato_id IS NOT NULL;

    -- Delete orphaned logs with no parent contrato (cannot determine tenant)
    DELETE FROM public.zapsign_logs WHERE tenant_id IS NULL;

    ALTER TABLE public.zapsign_logs
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_zapsign_logs_tenant_id
  ON public.zapsign_logs(tenant_id);

ALTER TABLE public.zapsign_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'zapsign_logs'
      AND policyname = 'tenant_isolation_zapsign_logs'
  ) THEN
    CREATE POLICY tenant_isolation_zapsign_logs
      ON public.zapsign_logs
      FOR ALL
      USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 8. notification_templates (no direct parent with tenant_id;
--    use created_by -> profiles -> tenant_id)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_templates'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.notification_templates
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

    UPDATE public.notification_templates nt
      SET tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = nt.created_by)
      WHERE nt.tenant_id IS NULL AND nt.created_by IS NOT NULL;

    -- Delete orphaned templates with no creator (cannot determine tenant)
    DELETE FROM public.notification_templates WHERE tenant_id IS NULL;

    ALTER TABLE public.notification_templates
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant_id
  ON public.notification_templates(tenant_id);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_templates'
      AND policyname = 'tenant_isolation_notification_templates'
  ) THEN
    CREATE POLICY tenant_isolation_notification_templates
      ON public.notification_templates
      FOR ALL
      USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;
