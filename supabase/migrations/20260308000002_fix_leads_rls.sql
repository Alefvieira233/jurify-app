-- =============================================================
-- FASE 2: Corrigir RLS aberta da tabela leads
-- =============================================================

-- Dropar política insegura
DROP POLICY IF EXISTS "Permitir acesso completo aos leads" ON public.leads;

-- Adicionar coluna tenant_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Adicionar coluna user_id se não existir (para tracking do criador)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Função para pegar tenant_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);

-- Policies seguras

-- SELECT: usuários do mesmo tenant podem ver
CREATE POLICY "leads_select_tenant" ON public.leads
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- INSERT: usuários autenticados podem criar no próprio tenant
CREATE POLICY "leads_insert_tenant" ON public.leads
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    user_id = auth.uid()
  );

-- UPDATE: usuários do mesmo tenant podem editar
CREATE POLICY "leads_update_tenant" ON public.leads
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- DELETE: apenas admin/manager podem deletar
CREATE POLICY "leads_delete_admin_manager" ON public.leads
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );
