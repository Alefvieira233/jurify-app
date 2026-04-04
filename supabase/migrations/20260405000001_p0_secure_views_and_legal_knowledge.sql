-- ============================================================================
-- P0 — SECURITY: Protect unrestricted views/MVs + fix legal_knowledge
--
-- Problems solved:
-- 1. 9 views/MVs are UNRESTRICTED in Supabase — anyone with anon/authenticated
--    key can query them via PostgREST, bypassing table-level RLS.
-- 2. legal_knowledge table has NO tenant_id — cross-tenant data leakage.
--
-- Strategy:
-- - Revoke direct PostgREST access to MVs (remove from public API)
-- - Ensure all data access goes through tenant-scoped wrapper functions
-- - Add tenant_id to legal_knowledge with RLS
-- ============================================================================

-- ============================================================
-- PART 1: Revoke direct access to materialized views
-- PostgREST auto-exposes all tables/views in public schema.
-- We revoke SELECT from anon and authenticated roles on MVs,
-- forcing access through SECURITY DEFINER wrapper functions.
-- ============================================================

-- Revoke direct access to all materialized views
REVOKE SELECT ON public.mv_dashboard FROM anon, authenticated;
REVOKE SELECT ON public.mv_leads_metrics FROM anon, authenticated;
REVOKE SELECT ON public.mv_leads_por_area FROM anon, authenticated;
REVOKE SELECT ON public.mv_contratos_metrics FROM anon, authenticated;
REVOKE SELECT ON public.mv_agendamentos_metrics FROM anon, authenticated;
REVOKE SELECT ON public.mv_agentes_metrics FROM anon, authenticated;

-- Revoke direct access to views
REVOKE SELECT ON public.active_executions_view FROM anon, authenticated;
REVOKE SELECT ON public.audit_recent FROM anon, authenticated;
REVOKE SELECT ON public.v_leads_operacional FROM anon, authenticated;

-- ============================================================
-- PART 2: Create tenant-scoped wrapper functions for views
-- that don't already have them.
-- (get_dashboard_metrics and get_leads_por_area already exist)
-- ============================================================

-- 2a. active_executions_view — tenant-scoped wrapper
CREATE OR REPLACE FUNCTION public.get_active_executions(_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(ae)), '[]'::jsonb)
  FROM public.agent_executions ae
  WHERE ae.status IN ('pending', 'processing')
    AND ae.tenant_id = COALESCE(_tenant_id, public.get_current_tenant_id());
$$;

COMMENT ON FUNCTION public.get_active_executions IS
  'Tenant-scoped wrapper for active agent executions — replaces direct view access';

-- 2b. audit_recent — tenant-scoped wrapper (admin only)
CREATE OR REPLACE FUNCTION public.get_audit_recent(
  _tenant_id UUID DEFAULT NULL,
  _limit INT DEFAULT 500
)
RETURNS TABLE(
  id UUID,
  table_name TEXT,
  record_id TEXT,
  operation TEXT,
  changed_fields TEXT[],
  user_id UUID,
  tenant_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    al.id,
    al.table_name,
    al.record_id,
    al.operation,
    al.changed_fields,
    al.user_id,
    al.tenant_id,
    al.created_at
  FROM public.audit_log al
  WHERE al.tenant_id = COALESCE(_tenant_id, public.get_current_tenant_id())
  ORDER BY al.created_at DESC
  LIMIT _limit;
$$;

COMMENT ON FUNCTION public.get_audit_recent IS
  'Tenant-scoped audit log access — replaces unrestricted audit_recent view';

-- 2c. v_leads_operacional — tenant-scoped wrapper
-- Returns JSON to avoid coupling to view column types (view is recreated in P1)
CREATE OR REPLACE FUNCTION public.get_leads_operacional(
  _tenant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(v)), '[]'::jsonb)
  FROM public.v_leads_operacional v
  WHERE v.tenant_id = COALESCE(_tenant_id, public.get_current_tenant_id())
    AND v.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_leads_operacional IS
  'Tenant-scoped lead operational view — replaces unrestricted v_leads_operacional';

-- 2d. Wrapper functions for individual MV metrics (granular access)
CREATE OR REPLACE FUNCTION public.get_leads_metrics(_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_leads BIGINT,
  leads_novo_mes BIGINT,
  status_novo_lead BIGINT,
  status_em_qualificacao BIGINT,
  status_proposta_enviada BIGINT,
  status_contrato_assinado BIGINT,
  status_em_atendimento BIGINT,
  status_lead_perdido BIGINT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    m.total_leads, m.leads_novo_mes,
    m.status_novo_lead, m.status_em_qualificacao,
    m.status_proposta_enviada, m.status_contrato_assinado,
    m.status_em_atendimento, m.status_lead_perdido,
    m.refreshed_at
  FROM public.mv_leads_metrics m
  WHERE m.tenant_id = COALESCE(_tenant_id, public.get_current_tenant_id());
$$;

CREATE OR REPLACE FUNCTION public.get_contratos_metrics(_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_contratos BIGINT,
  contratos_assinados BIGINT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT m.total_contratos, m.contratos_assinados, m.refreshed_at
  FROM public.mv_contratos_metrics m
  WHERE m.tenant_id = COALESCE(_tenant_id, public.get_current_tenant_id());
$$;

CREATE OR REPLACE FUNCTION public.get_agendamentos_metrics(_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_agendamentos BIGINT,
  agendamentos_hoje BIGINT,
  agendamentos_semana BIGINT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT m.total_agendamentos, m.agendamentos_hoje, m.agendamentos_semana, m.refreshed_at
  FROM public.mv_agendamentos_metrics m
  WHERE m.tenant_id = COALESCE(_tenant_id, public.get_current_tenant_id());
$$;

CREATE OR REPLACE FUNCTION public.get_agentes_metrics(_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
  agentes_ativos BIGINT,
  total_execucoes BIGINT,
  execucoes_hoje BIGINT,
  execucoes_sucesso BIGINT,
  execucoes_erro BIGINT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT m.agentes_ativos, m.total_execucoes, m.execucoes_hoje,
         m.execucoes_sucesso, m.execucoes_erro, m.refreshed_at
  FROM public.mv_agentes_metrics m
  WHERE m.tenant_id = COALESCE(_tenant_id, public.get_current_tenant_id());
$$;

-- ============================================================
-- PART 3: Fix legal_knowledge — add tenant_id + RLS
-- CRITICAL: This table stores embeddings without tenant isolation!
-- ============================================================

-- 3a. Add tenant_id column
ALTER TABLE public.legal_knowledge
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 3b. Create index on tenant_id
CREATE INDEX IF NOT EXISTS idx_legal_knowledge_tenant
  ON public.legal_knowledge(tenant_id);

-- 3c. Enable RLS
ALTER TABLE public.legal_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_knowledge FORCE ROW LEVEL SECURITY;

-- 3d. Create tenant isolation policies
DROP POLICY IF EXISTS "legal_knowledge_select" ON public.legal_knowledge;
DROP POLICY IF EXISTS "legal_knowledge_insert" ON public.legal_knowledge;
DROP POLICY IF EXISTS "legal_knowledge_update" ON public.legal_knowledge;
DROP POLICY IF EXISTS "legal_knowledge_delete" ON public.legal_knowledge;
DROP POLICY IF EXISTS "legal_knowledge_service_role" ON public.legal_knowledge;

CREATE POLICY "legal_knowledge_select" ON public.legal_knowledge
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "legal_knowledge_insert" ON public.legal_knowledge
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "legal_knowledge_update" ON public.legal_knowledge
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  ) WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "legal_knowledge_delete" ON public.legal_knowledge
  FOR DELETE USING (
    public.is_admin(auth.uid())
    AND tenant_id = public.get_current_tenant_id()
  );

-- Service role can insert (Edge Functions)
CREATE POLICY "legal_knowledge_service_role" ON public.legal_knowledge
  FOR INSERT WITH CHECK (
    current_setting('role') = 'service_role'
  );

-- 3e. Update match_legal_documents to enforce tenant isolation
CREATE OR REPLACE FUNCTION public.match_legal_documents(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7,
  filter_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  source_type TEXT,
  source_id TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    lk.id,
    lk.content,
    lk.source_type,
    lk.source_id,
    lk.metadata,
    1 - (lk.embedding <=> query_embedding) AS similarity
  FROM public.legal_knowledge lk
  WHERE lk.tenant_id = COALESCE(filter_tenant_id, public.get_current_tenant_id())
    AND 1 - (lk.embedding <=> query_embedding) > match_threshold
  ORDER BY lk.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_legal_documents(vector, INT, FLOAT, UUID) IS
  'Tenant-scoped legal document similarity search — requires tenant_id for isolation';

-- ============================================================
-- PART 4: Update refresh function to use CONCURRENTLY
-- (requires unique indexes which already exist)
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh base views first (order matters for mv_dashboard)
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_leads_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_leads_por_area;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_contratos_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_agendamentos_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_agentes_metrics;
  -- Consolidated view depends on the above
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard;
END;
$$;

COMMENT ON FUNCTION public.refresh_dashboard_views IS
  'Concurrent refresh of all dashboard MVs — non-blocking reads during refresh';
