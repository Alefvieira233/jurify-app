-- =============================================================================
-- P0-7 — Close remaining cross-tenant leak (auditoria 2026-05-25)
--
-- Contexto: a migration 20260507000017_drop_legacy_for_all_policies_rbac_bypass
-- fechou as policies legacy "Acesso total autenticado" em 4 tabelas (agentes_ia,
-- whatsapp_conversations, whatsapp_messages, conversation_state). Mas 2 tabelas
-- ainda tinham policies residuais com USING (auth.role() = 'authenticated') —
-- e como o Postgres faz OR de policies PERMISSIVE, qualquer authenticated user
-- de qualquer tenant podia SELECT logs IA + execuções de agentes (com CPF/CNPJ
-- no payload) dos outros 16 tenants em prod.
--
-- Esta migration:
--   1. DROP policy legacy em agent_ai_logs ("Acesso total autenticado logs")
--   2. DROP policy legacy em agent_executions ("Acesso total autenticado execucoes")
--
-- As policies tenant-aware (agent_ai_logs_select, agent_executions_select, etc.)
-- já existem e restringem corretamente via profiles.tenant_id.
-- =============================================================================

DROP POLICY IF EXISTS "Acesso total autenticado logs" ON public.agent_ai_logs;
DROP POLICY IF EXISTS "Acesso total autenticado execucoes" ON public.agent_executions;

-- Mantemos a policy "Users can view their tenant's agent executions" (que já é
-- tenant-aware) e as 4 policies CRUD tenant-aware criadas pela migration de
-- RBAC. Resultado final: somente users autenticados do mesmo tenant_id podem
-- ler/escrever; cross-tenant fica IMPOSSÍVEL.

-- Sanity check: garantir que ainda há policies SELECT tenant-aware nas tabelas
-- (se alguém rodar essa migration em ambiente sem as policies novas, falha
-- explicitamente em vez de deixar tabelas sem leitura)
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'agent_ai_logs'
    AND cmd = 'SELECT';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'agent_ai_logs sem policy SELECT após cleanup — abortar';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'agent_executions'
    AND cmd = 'SELECT';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'agent_executions sem policy SELECT após cleanup — abortar';
  END IF;
END $$;
