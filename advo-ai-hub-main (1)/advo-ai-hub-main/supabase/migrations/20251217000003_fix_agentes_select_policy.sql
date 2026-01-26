-- ========================================
-- FIX: Permitir leitura de agentes ativos
-- ========================================
-- Problema: Policy exige auth.uid() mas agentes precisam ser visíveis
-- para usuários sem login (para seleção inicial)
-- Solução: Criar policy que permite leitura de agentes ativos

-- Remover policy restritiva antiga
DROP POLICY IF EXISTS "secure_agentes_select" ON public.agentes_ia;

-- Nova policy: Permite leitura de agentes ativos
CREATE POLICY "agentes_read_active"
  ON public.agentes_ia
  FOR SELECT
  USING (ativo = true);

-- Policy para usuários autenticados verem todos os agentes do seu tenant
CREATE POLICY "agentes_read_own_tenant"
  ON public.agentes_ia
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Comentário explicativo
COMMENT ON POLICY "agentes_read_active" ON public.agentes_ia IS
  'Permite leitura de agentes ativos para todos os usuários (necessário para seleção de agentes)';

COMMENT ON POLICY "agentes_read_own_tenant" ON public.agentes_ia IS
  'Permite usuários autenticados verem todos os agentes do próprio tenant (incluindo inativos)';
