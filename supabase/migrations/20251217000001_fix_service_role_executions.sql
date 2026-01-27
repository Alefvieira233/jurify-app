-- 🔐 FIX SERVICE ROLE INSERT - agent_executions
-- Permite que Edge Functions (via service role) criem execuções
-- sem precisar de auth.uid()

-- =========================================================================
-- PROBLEMA IDENTIFICADO:
-- =========================================================================
-- A policy "Authenticated users can create executions" requer:
--   auth.uid() IS NOT NULL AND tenant_id = (...)
--
-- Mas Edge Functions usam SERVICE_ROLE_KEY que não tem auth.uid()
-- Isso impede Mission Control de registrar execuções em tempo real
--
-- SOLUÇÃO:
-- Adicionar policy que permite service role inserir com CHECK (true)
-- =========================================================================

-- Verificar se a policy já existe e dropar se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'agent_executions'
        AND policyname = 'service_role_insert_executions'
    ) THEN
        DROP POLICY "service_role_insert_executions" ON public.agent_executions;
    END IF;
END $$;

-- Criar policy para service role
CREATE POLICY "service_role_insert_executions"
  ON public.agent_executions
  FOR INSERT
  WITH CHECK (true);

-- Comentário para documentação
COMMENT ON POLICY "service_role_insert_executions" ON public.agent_executions IS
  'Permite que Edge Functions (usando service_role_key) criem registros de execução de agentes sem contexto de auth.uid(). Necessário para Mission Control funcionar em tempo real.';

-- Também permitir UPDATE para service role (para atualizar status)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'agent_executions'
        AND policyname = 'service_role_update_executions'
    ) THEN
        DROP POLICY "service_role_update_executions" ON public.agent_executions;
    END IF;
END $$;

CREATE POLICY "service_role_update_executions"
  ON public.agent_executions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_update_executions" ON public.agent_executions IS
  'Permite que Edge Functions atualizem o status e métricas das execuções enquanto os agentes processam.';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Policies criadas com sucesso';
  RAISE NOTICE '   Tabela: agent_executions';
  RAISE NOTICE '   Ações: INSERT e UPDATE permitidos para service role';
END $$;
