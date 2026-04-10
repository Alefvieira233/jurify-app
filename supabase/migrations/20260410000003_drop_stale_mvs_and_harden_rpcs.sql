-- Drop stale materialized views (mv_leads_metrics etc.) that reference the
-- pre-unify lead status values (novo_lead, em_qualificacao, contrato_assinado)
-- which were renamed by 20260323000001_unify_lead_status_system.sql.
--
-- Also harden SECURITY DEFINER RPCs that accept _tenant_id as a parameter by
-- validating it against the caller's actual tenant. Without this check, any
-- authenticated user could pass another tenant's UUID and read data across tenants.
--
-- Covers audit tasks P2-9 (stale MVs) and P2-10 (RPC tenant validation).

-- ----------------------------------------------------------------------------
-- PART 1: Drop stale materialized views
-- ----------------------------------------------------------------------------
-- Order matters: mv_dashboard depends on the others.
DROP FUNCTION IF EXISTS public.refresh_dashboard_views();
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_agentes_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_agendamentos_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_contratos_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_leads_por_area CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_leads_metrics CASCADE;

-- Drop the stale get_leads_metrics RPC (from 20260405000001) that read from the
-- dropped mv_leads_metrics. The active metrics RPC is get_dashboard_metrics,
-- which queries leads/contratos/agendamentos directly and has the correct status
-- values. Frontend never called get_leads_metrics (verified by grep).
DROP FUNCTION IF EXISTS public.get_leads_metrics(uuid);

-- ----------------------------------------------------------------------------
-- PART 2: Harden SECURITY DEFINER RPCs with tenant validation
-- ----------------------------------------------------------------------------
-- get_user_tenant_id() already exists (defined in 20260308000002_fix_leads_rls.sql).
-- We reuse it to validate caller tenant vs supplied parameter.

-- get_dashboard_metrics: verify caller owns the requested tenant
DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid);

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(_tenant_id uuid)
RETURNS TABLE(
  total_leads bigint,
  leads_novo_mes bigint,
  total_contratos bigint,
  contratos_assinados bigint,
  total_agendamentos bigint,
  agendamentos_hoje bigint,
  agendamentos_semana bigint,
  agentes_ativos bigint,
  execucoes_hoje bigint,
  total_execucoes bigint,
  execucoes_sucesso bigint,
  execucoes_erro bigint,
  status_novo bigint,
  status_em_contato bigint,
  status_em_qualificacao bigint,
  status_proposta bigint,
  status_negociacao bigint,
  status_ganho bigint,
  status_perdido bigint,
  refreshed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_tenant uuid;
  _now timestamptz := now();
  _start_of_month timestamptz := date_trunc('month', _now);
  _start_of_today timestamptz := date_trunc('day', _now);
  _start_of_week timestamptz := date_trunc('week', _now);
BEGIN
  -- Tenant isolation: caller must belong to the requested tenant.
  -- Service role is trusted and bypasses this check.
  IF auth.role() != 'service_role' THEN
    _caller_tenant := public.get_user_tenant_id(auth.uid());
    IF _caller_tenant IS NULL OR _caller_tenant != _tenant_id THEN
      RAISE EXCEPTION 'unauthorized: cannot access metrics for tenant %', _tenant_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id)::bigint AS total_leads,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND created_at >= _start_of_month)::bigint AS leads_novo_mes,
    (SELECT count(*) FROM contratos WHERE tenant_id = _tenant_id)::bigint AS total_contratos,
    (SELECT count(*) FROM contratos WHERE tenant_id = _tenant_id AND status = 'assinado')::bigint AS contratos_assinados,
    (SELECT count(*) FROM agendamentos WHERE tenant_id = _tenant_id)::bigint AS total_agendamentos,
    (SELECT count(*) FROM agendamentos WHERE tenant_id = _tenant_id AND data_hora::date = _now::date)::bigint AS agendamentos_hoje,
    (SELECT count(*) FROM agendamentos WHERE tenant_id = _tenant_id AND data_hora >= _start_of_week AND data_hora < _start_of_week + interval '7 days')::bigint AS agendamentos_semana,
    (SELECT count(*) FROM agentes_ia WHERE tenant_id = _tenant_id AND ativo = true)::bigint AS agentes_ativos,
    (SELECT count(*) FROM agent_executions WHERE tenant_id = _tenant_id AND created_at >= _start_of_today)::bigint AS execucoes_hoje,
    (SELECT count(*) FROM agent_executions WHERE tenant_id = _tenant_id)::bigint AS total_execucoes,
    (SELECT count(*) FROM agent_executions WHERE tenant_id = _tenant_id AND status IN ('success', 'completed', 'sucesso'))::bigint AS execucoes_sucesso,
    (SELECT count(*) FROM agent_executions WHERE tenant_id = _tenant_id AND status IN ('error', 'failed', 'erro'))::bigint AS execucoes_erro,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND status = 'novo')::bigint AS status_novo,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND status = 'em_contato')::bigint AS status_em_contato,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND status = 'qualificado')::bigint AS status_em_qualificacao,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND status = 'proposta')::bigint AS status_proposta,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND status = 'negociacao')::bigint AS status_negociacao,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND status = 'ganho')::bigint AS status_ganho,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND status = 'perdido')::bigint AS status_perdido,
    _now AS refreshed_at;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics IS
  'Aggregated dashboard metrics. Validates caller tenant before returning data. Hardened 2026-04-10.';

-- get_leads_por_area: verify caller owns the requested tenant
DROP FUNCTION IF EXISTS public.get_leads_por_area(uuid);

CREATE OR REPLACE FUNCTION public.get_leads_por_area(_tenant_id uuid)
RETURNS TABLE(area text, total bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_tenant uuid;
BEGIN
  IF auth.role() != 'service_role' THEN
    _caller_tenant := public.get_user_tenant_id(auth.uid());
    IF _caller_tenant IS NULL OR _caller_tenant != _tenant_id THEN
      RAISE EXCEPTION 'unauthorized: cannot access leads for tenant %', _tenant_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(l.area_juridica, 'Não definida') AS area,
    count(*)::bigint AS total
  FROM leads l
  WHERE l.tenant_id = _tenant_id
  GROUP BY l.area_juridica
  ORDER BY total DESC
  LIMIT 20;
END;
$$;

COMMENT ON FUNCTION public.get_leads_por_area IS
  'Leads grouped by area_juridica. Validates caller tenant before returning data. Hardened 2026-04-10.';

-- Re-grant execute to authenticated role (dropping the function also dropped grants)
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leads_por_area(uuid) TO authenticated;
