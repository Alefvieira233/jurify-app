-- =============================================================================
-- Migration: RLS Missing Policies + Performance Indexes
-- Date: 2026-02-23
-- Issues fixed:
--   1. agendamentos missing UPDATE/DELETE RLS policies
--   2. notificacoes missing UPDATE RLS policy
--   3. 5 missing indexes identified in performance audit
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AGENDAMENTOS — UPDATE policy (tenant-scoped)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'agendamentos'
      AND policyname = 'rls_agendamentos_update'
  ) THEN
    CREATE POLICY rls_agendamentos_update ON public.agendamentos
      FOR UPDATE
      USING (
        auth.uid() IS NOT NULL
        AND tenant_id = public.get_current_tenant_id()
      )
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND tenant_id = public.get_current_tenant_id()
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. AGENDAMENTOS — DELETE policy (admin only, tenant-scoped)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'agendamentos'
      AND policyname = 'rls_agendamentos_delete'
  ) THEN
    CREATE POLICY rls_agendamentos_delete ON public.agendamentos
      FOR DELETE
      USING (
        auth.uid() IS NOT NULL
        AND tenant_id = public.get_current_tenant_id()
        AND public.has_permission(auth.uid(), 'agendamentos', 'delete')
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. NOTIFICACOES — UPDATE policy (owner or admin)
-- Needed for marking notifications as read (lido_em, status)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'notificacoes'
      AND policyname = 'rls_notificacoes_update'
  ) THEN
    CREATE POLICY rls_notificacoes_update ON public.notificacoes
      FOR UPDATE
      USING (
        auth.uid() IS NOT NULL
        AND tenant_id = public.get_current_tenant_id()
        AND public.has_permission(auth.uid(), 'notificacoes', 'update')
      )
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND tenant_id = public.get_current_tenant_id()
      );
  END IF;
END $$;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4. agendamentos — range query by tenant + date
-- Query: "próximos agendamentos do tenant"
-- SELECT * FROM agendamentos WHERE tenant_id = ? AND data_hora > NOW() ORDER BY data_hora
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_data_hora
  ON public.agendamentos (tenant_id, data_hora DESC);

-- -----------------------------------------------------------------------------
-- 5. crm_followups — "Minhas tarefas" query
-- Query: assigned_to + status filter
-- SELECT * FROM crm_followups WHERE assigned_to = ? AND status = 'pending'
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crm_followups_assigned_status
  ON public.crm_followups (assigned_to, status)
  WHERE status != 'completed';

-- -----------------------------------------------------------------------------
-- 6. agent_ai_logs — analytics by day/model
-- Query: "Custos de API por dia"
-- SELECT DATE_TRUNC('day', created_at), model, SUM(total_tokens) FROM agent_ai_logs GROUP BY 1, 2
-- -----------------------------------------------------------------------------
-- DATE_TRUNC is STABLE (not IMMUTABLE) on timestamptz — index on raw column instead
CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_day_model
  ON public.agent_ai_logs (created_at, model, total_tokens);

-- -----------------------------------------------------------------------------
-- 7. whatsapp_conversations — lookup by lead
-- Query: "Histórico WhatsApp deste lead"
-- SELECT * FROM whatsapp_conversations WHERE lead_id = ? ORDER BY created_at DESC
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead_id
      ON public.whatsapp_conversations (lead_id, created_at DESC);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. logs_execucao_agentes — "Execuções falhadas do agente X"
-- Query: agent_id + status filter + recency
-- SELECT * FROM logs_execucao_agentes WHERE agent_id = ? AND status = 'error' ORDER BY created_at DESC
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_logs_execucao_agentes_agent_status
  ON public.logs_execucao_agentes (agente_id, status, created_at DESC);
