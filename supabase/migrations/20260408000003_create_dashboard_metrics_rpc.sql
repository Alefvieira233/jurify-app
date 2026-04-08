-- Dashboard metrics RPC — single optimized query for all dashboard data.
-- Replaces multiple client-side queries with one server-side aggregation.
-- Drop existing function first (return type may differ from previous version)
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
  _now timestamptz := now();
  _start_of_month timestamptz := date_trunc('month', _now);
  _start_of_today timestamptz := date_trunc('day', _now);
  _start_of_week timestamptz := date_trunc('week', _now);
BEGIN
  RETURN QUERY
  SELECT
    -- Leads
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id)::bigint AS total_leads,
    (SELECT count(*) FROM leads WHERE tenant_id = _tenant_id AND created_at >= _start_of_month)::bigint AS leads_novo_mes,

    -- Contratos
    (SELECT count(*) FROM contratos WHERE tenant_id = _tenant_id)::bigint AS total_contratos,
    (SELECT count(*) FROM contratos WHERE tenant_id = _tenant_id AND status = 'assinado')::bigint AS contratos_assinados,

    -- Agendamentos
    (SELECT count(*) FROM agendamentos WHERE tenant_id = _tenant_id)::bigint AS total_agendamentos,
    (SELECT count(*) FROM agendamentos WHERE tenant_id = _tenant_id AND data_hora::date = _now::date)::bigint AS agendamentos_hoje,
    (SELECT count(*) FROM agendamentos WHERE tenant_id = _tenant_id AND data_hora >= _start_of_week AND data_hora < _start_of_week + interval '7 days')::bigint AS agendamentos_semana,

    -- Agentes IA
    (SELECT count(*) FROM agentes_ia WHERE tenant_id = _tenant_id AND ativo = true)::bigint AS agentes_ativos,
    (SELECT count(*) FROM agent_executions WHERE tenant_id = _tenant_id AND created_at >= _start_of_today)::bigint AS execucoes_hoje,
    (SELECT count(*) FROM agent_executions WHERE tenant_id = _tenant_id)::bigint AS total_execucoes,
    (SELECT count(*) FROM agent_executions WHERE tenant_id = _tenant_id AND status IN ('success', 'completed', 'sucesso'))::bigint AS execucoes_sucesso,
    (SELECT count(*) FROM agent_executions WHERE tenant_id = _tenant_id AND status IN ('error', 'failed', 'erro'))::bigint AS execucoes_erro,

    -- Leads por status (pipeline)
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

-- Also create the leads_por_area RPC used by the dashboard
DROP FUNCTION IF EXISTS public.get_leads_por_area(uuid);

CREATE OR REPLACE FUNCTION public.get_leads_por_area(_tenant_id uuid)
RETURNS TABLE(area text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(area_juridica, 'Não definida') AS area,
    count(*)::bigint AS total
  FROM leads
  WHERE tenant_id = _tenant_id
  GROUP BY area_juridica
  ORDER BY total DESC
  LIMIT 20;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics IS
  'Aggregated dashboard metrics in a single RPC call — replaces N+1 client queries.';
COMMENT ON FUNCTION public.get_leads_por_area IS
  'Leads grouped by area_juridica for dashboard chart.';
