-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
--
-- Adds missing composite indexes identified in the DB audit.
-- Indexes that already exist (idx_leads_tenant_status, idx_leads_tenant_area,
-- idx_agendamentos_tenant_data) are skipped — they were created in
-- 20260225000001_rls_performance_indexes.sql.
-- ============================================================================

-- Leads: filter by responsavel
CREATE INDEX IF NOT EXISTS idx_leads_tenant_responsavel
  ON public.leads(tenant_id, responsavel_id);

-- Contratos: filter by status_assinatura (different from existing idx_contratos_tenant_status which uses 'status')
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_status_assinatura
  ON public.contratos(tenant_id, status_assinatura);

-- Logs de atividades: timeline queries ordered by date
CREATE INDEX IF NOT EXISTS idx_logs_atividades_tenant_date
  ON public.logs_atividades(tenant_id, created_at DESC);

-- Notificacoes: unread filter
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant_lida
  ON public.notificacoes(tenant_id, lida);

-- WhatsApp conversations: sorted by last update
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_updated
  ON public.whatsapp_conversations(tenant_id, updated_at DESC);
