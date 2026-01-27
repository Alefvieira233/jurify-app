-- =====================================================
-- OTIMIZAÇÕES DE QUERIES DO DASHBOARD
-- =====================================================
-- Cria funções SQL otimizadas para cálculos de métricas
-- do dashboard, reduzindo processamento no client-side.
--
-- @version 1.0.0
-- @created 2025-12-11
-- =====================================================

-- ========================================
-- 1. FUNÇÃO: Leads por Status
-- ========================================
CREATE OR REPLACE FUNCTION get_leads_by_status(
  p_tenant_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.status,
    COUNT(*)::BIGINT
  FROM leads l
  WHERE
    (p_tenant_id IS NULL OR l.tenant_id = p_tenant_id)
    AND (p_start_date IS NULL OR l.created_at >= p_start_date)
  GROUP BY l.status
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_leads_by_status IS 'Retorna contagem de leads agrupados por status';

-- ========================================
-- 2. FUNÇÃO: Leads por Área Jurídica (Top 5)
-- ========================================
CREATE OR REPLACE FUNCTION get_top_legal_areas(
  p_tenant_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  area_juridica TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Calcular total de leads
  SELECT COUNT(*) INTO v_total
  FROM leads
  WHERE p_tenant_id IS NULL OR tenant_id = p_tenant_id;

  RETURN QUERY
  SELECT
    l.area_juridica,
    COUNT(*)::BIGINT AS count,
    ROUND((COUNT(*)::NUMERIC / NULLIF(v_total, 0)) * 100, 2) AS percentage
  FROM leads l
  WHERE p_tenant_id IS NULL OR l.tenant_id = p_tenant_id
  GROUP BY l.area_juridica
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_top_legal_areas IS 'Retorna as top N áreas jurídicas com mais leads';

-- ========================================
-- 3. FUNÇÃO: Métricas de Execuções de Agentes
-- ========================================
CREATE OR REPLACE FUNCTION get_agent_execution_metrics(
  p_tenant_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours'
)
RETURNS TABLE (
  current_agent TEXT,
  total_executions BIGINT,
  completed_count BIGINT,
  failed_count BIGINT,
  avg_duration_ms NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.current_agent,
    COUNT(*)::BIGINT AS total_executions,
    COUNT(*) FILTER (WHERE ae.status = 'completed')::BIGINT AS completed_count,
    COUNT(*) FILTER (WHERE ae.status = 'failed')::BIGINT AS failed_count,
    ROUND(AVG(ae.total_duration_ms)::NUMERIC, 2) AS avg_duration_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE ae.status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate
  FROM agent_executions ae
  WHERE
    (p_tenant_id IS NULL OR ae.tenant_id = p_tenant_id)
    AND ae.started_at >= p_start_date
  GROUP BY ae.current_agent
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_agent_execution_metrics IS 'Retorna métricas agregadas de execuções de agentes';

-- ========================================
-- 4. FUNÇÃO: Métricas Gerais do Dashboard
-- ========================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_leads BIGINT,
  novos_leads_hoje BIGINT,
  leads_qualificados_mes BIGINT,
  contratos_assinados_mes BIGINT,
  propostas_enviadas_mes BIGINT,
  taxa_conversao NUMERIC
) AS $$
DECLARE
  v_inicio_hoje TIMESTAMPTZ := DATE_TRUNC('day', NOW());
  v_inicio_mes TIMESTAMPTZ := DATE_TRUNC('month', NOW());
BEGIN
  RETURN QUERY
  SELECT
    -- Total de leads
    (SELECT COUNT(*)
     FROM leads
     WHERE p_tenant_id IS NULL OR tenant_id = p_tenant_id
    )::BIGINT AS total_leads,

    -- Novos leads hoje
    (SELECT COUNT(*)
     FROM leads
     WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
       AND created_at >= v_inicio_hoje
    )::BIGINT AS novos_leads_hoje,

    -- Leads qualificados este mês
    (SELECT COUNT(*)
     FROM leads
     WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
       AND status IN ('em_qualificacao', 'proposta_enviada', 'contrato_assinado', 'em_atendimento')
       AND created_at >= v_inicio_mes
    )::BIGINT AS leads_qualificados_mes,

    -- Contratos assinados este mês
    (SELECT COUNT(*)
     FROM leads
     WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
       AND status = 'contrato_assinado'
       AND created_at >= v_inicio_mes
    )::BIGINT AS contratos_assinados_mes,

    -- Propostas enviadas este mês
    (SELECT COUNT(*)
     FROM leads
     WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
       AND status = 'proposta_enviada'
       AND created_at >= v_inicio_mes
    )::BIGINT AS propostas_enviadas_mes,

    -- Taxa de conversão (contratos / total qualificados)
    ROUND(
      (SELECT COUNT(*)::NUMERIC
       FROM leads
       WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
         AND status = 'contrato_assinado'
         AND created_at >= v_inicio_mes
      ) / NULLIF(
        (SELECT COUNT(*)::NUMERIC
         FROM leads
         WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
           AND status IN ('em_qualificacao', 'proposta_enviada', 'contrato_assinado')
           AND created_at >= v_inicio_mes
        ), 0
      ) * 100,
      2
    ) AS taxa_conversao;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_dashboard_summary IS 'Retorna resumo completo de métricas do dashboard';

-- ========================================
-- 5. FUNÇÃO: Valor Total da Causa por Status
-- ========================================
CREATE OR REPLACE FUNCTION get_total_value_by_status(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  total_value NUMERIC,
  avg_value NUMERIC,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.status,
    COALESCE(SUM(l.valor_causa), 0)::NUMERIC AS total_value,
    COALESCE(AVG(l.valor_causa), 0)::NUMERIC AS avg_value,
    COUNT(*)::BIGINT AS count
  FROM leads l
  WHERE
    (p_tenant_id IS NULL OR l.tenant_id = p_tenant_id)
    AND l.valor_causa IS NOT NULL
  GROUP BY l.status
  ORDER BY total_value DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_total_value_by_status IS 'Retorna valor total e médio das causas por status';

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índice composto para queries do dashboard
CREATE INDEX IF NOT EXISTS idx_leads_dashboard
ON leads(tenant_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Índice para agrupamento por área jurídica
CREATE INDEX IF NOT EXISTS idx_leads_area_juridica
ON leads(area_juridica, tenant_id)
WHERE deleted_at IS NULL;

-- Índice para execuções de agentes
CREATE INDEX IF NOT EXISTS idx_agent_executions_dashboard
ON agent_executions(tenant_id, current_agent, status, started_at DESC);

-- Índice para valor de causas
CREATE INDEX IF NOT EXISTS idx_leads_valor_causa
ON leads(tenant_id, status, valor_causa)
WHERE valor_causa IS NOT NULL AND deleted_at IS NULL;

COMMENT ON INDEX idx_leads_dashboard IS 'Otimiza queries do dashboard por tenant e status';
COMMENT ON INDEX idx_leads_area_juridica IS 'Otimiza agrupamento por área jurídica';
COMMENT ON INDEX idx_agent_executions_dashboard IS 'Otimiza métricas de execuções de agentes';
COMMENT ON INDEX idx_leads_valor_causa IS 'Otimiza cálculos de valor de causas';

-- ========================================
-- PERMISSÕES RLS
-- ========================================

-- Permitir execução das funções para usuários autenticados
GRANT EXECUTE ON FUNCTION get_leads_by_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_legal_areas TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_execution_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_value_by_status TO authenticated;

-- =====================================================
-- FIM DAS OTIMIZAÇÕES
-- =====================================================

COMMENT ON SCHEMA public IS 'Funções de otimização do dashboard adicionadas em 2025-12-11';
