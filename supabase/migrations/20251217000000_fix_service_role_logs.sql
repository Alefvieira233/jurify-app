-- 🔐 FIX SERVICE ROLE INSERT - logs_execucao_agentes
-- Permite que Edge Functions (via service role) insiram logs
-- sem precisar de auth.uid()

-- =========================================================================
-- PROBLEMA IDENTIFICADO:
-- =========================================================================
-- A policy "secure_logs_insert" em logs_execucao_agentes requer:
--   auth.uid() IS NOT NULL
--
-- Mas Edge Functions usam SERVICE_ROLE_KEY que não tem auth.uid()
-- Isso causa erro 401 ao tentar inserir logs
--
-- SOLUÇÃO:
-- Adicionar policy que permite service role inserir com CHECK (true)
-- =========================================================================

-- Verificar se a policy já existe e dropar se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'logs_execucao_agentes'
        AND policyname = 'service_role_insert_logs'
    ) THEN
        DROP POLICY "service_role_insert_logs" ON public.logs_execucao_agentes;
    END IF;
END $$;

-- Criar policy para service role
CREATE POLICY "service_role_insert_logs"
  ON public.logs_execucao_agentes
  FOR INSERT
  WITH CHECK (true);

-- Comentário para documentação
COMMENT ON POLICY "service_role_insert_logs" ON public.logs_execucao_agentes IS
  'Permite que Edge Functions (usando service_role_key) insiram logs de execução sem contexto de auth.uid(). Essencial para funcionamento dos agentes IA.';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Policy "service_role_insert_logs" criada com sucesso';
  RAISE NOTICE '   Tabela: logs_execucao_agentes';
  RAISE NOTICE '   Ação: INSERT permitido para service role';
END $$;
