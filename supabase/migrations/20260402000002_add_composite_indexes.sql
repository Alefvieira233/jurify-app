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

-- Logs de atividades: timeline queries ordered by date (only if tenant_id column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'logs_atividades' AND column_name = 'tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_logs_atividades_tenant_date ON public.logs_atividades(tenant_id, created_at DESC);
  END IF;
END $$;

-- Notificacoes: unread filter (only if 'lida' column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notificacoes' AND column_name = 'lida') THEN
    CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant_lida ON public.notificacoes(tenant_id, lida);
  END IF;
END $$;

-- WhatsApp conversations: sorted by last update (only if column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'updated_at') THEN
    CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_updated ON public.whatsapp_conversations(tenant_id, updated_at DESC);
  END IF;
END $$;
