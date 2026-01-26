-- ==========================================
-- PERFORMANCE OPTIMIZATION - CRITICAL INDEXES
-- ==========================================

-- LEADS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status_tenant 
ON leads(status, tenant_id) WHERE status IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created_at_tenant 
ON leads(created_at DESC, tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_search 
ON leads USING gin(to_tsvector('portuguese', nome || ' ' || COALESCE(email, '') || ' ' || COALESCE(telefone, '')));

-- CONTRATOS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contratos_status_tenant 
ON contratos(status_assinatura, tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contratos_created_at 
ON contratos(created_at DESC, tenant_id);

-- AGENTES IA TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agentes_ia_status_tenant 
ON agentes_ia(status, tenant_id) WHERE status = 'ativo';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agentes_ia_tipo_area 
ON agentes_ia(tipo_agente, area_juridica, tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agentes_ia_search 
ON agentes_ia USING gin(to_tsvector('portuguese', nome || ' ' || COALESCE(descricao_funcao, '') || ' ' || area_juridica));

-- AGENDAMENTOS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_data_tenant 
ON agendamentos(data_agendamento, tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_status_tenant 
ON agendamentos(status, tenant_id);

-- LOGS TABLE INDEXES (for performance monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_execucao_timestamp 
ON logs_execucao_agentes(timestamp DESC, tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_execucao_agente 
ON logs_execucao_agentes(agente_id, tenant_id);

-- USER PERMISSIONS INDEXES (for RBAC performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_lookup 
ON user_permissions(user_id, resource, action, tenant_id);

-- PROFILES TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_tenant_role 
ON profiles(tenant_id, role);

-- ==========================================
-- MATERIALIZED VIEW FOR DASHBOARD METRICS
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_metrics AS
SELECT 
  tenant_id,
  COUNT(*) FILTER (WHERE status = 'novo_lead') as novos_leads,
  COUNT(*) FILTER (WHERE status = 'em_qualificacao') as em_qualificacao,
  COUNT(*) FILTER (WHERE status = 'proposta_enviada') as propostas_enviadas,
  COUNT(*) FILTER (WHERE status = 'contrato_assinado') as contratos_assinados,
  COUNT(*) FILTER (WHERE status = 'em_atendimento') as em_atendimento,
  COUNT(*) FILTER (WHERE status = 'lead_perdido') as leads_perdidos,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as leads_mes_atual,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days') as leads_mes_anterior,
  AVG(CASE WHEN status = 'contrato_assinado' THEN valor_contrato END) as ticket_medio,
  COUNT(*) as total_leads,
  updated_at
FROM leads
GROUP BY tenant_id, updated_at;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_metrics_tenant 
ON mv_dashboard_metrics(tenant_id);

-- ==========================================
-- REFRESH FUNCTION FOR MATERIALIZED VIEW
-- ==========================================
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGER FOR AUTO REFRESH
-- ==========================================
CREATE OR REPLACE FUNCTION trigger_refresh_dashboard()
RETURNS trigger AS $$
BEGIN
  -- Refresh in background to avoid blocking
  PERFORM pg_notify('refresh_dashboard', NEW.tenant_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_refresh_dashboard_leads ON leads;
CREATE TRIGGER trigger_refresh_dashboard_leads
AFTER INSERT OR UPDATE OR DELETE ON leads
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_dashboard();

-- ==========================================
-- PARTITIONING FOR LOGS (High Volume)
-- ==========================================
-- Convert logs table to partitioned table
ALTER TABLE logs_execucao_agentes RENAME TO logs_execucao_agentes_old;

CREATE TABLE logs_execucao_agentes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id uuid REFERENCES agentes_ia(id),
  tenant_id uuid REFERENCES profiles(tenant_id),
  timestamp timestamp with time zone DEFAULT now(),
  status text,
  input_usuario text,
  resposta_agente text,
  tempo_execucao integer,
  detalhes_execucao jsonb
) PARTITION BY RANGE (timestamp);

-- Create partitions for current and next months
CREATE TABLE logs_execucao_agentes_2024_12 PARTITION OF logs_execucao_agentes
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE logs_execucao_agentes_2025_01 PARTITION OF logs_execucao_agentes
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Migrate existing data
INSERT INTO logs_execucao_agentes SELECT * FROM logs_execucao_agentes_old;

-- Drop old table (uncomment when ready)
-- DROP TABLE logs_execucao_agentes_old;
