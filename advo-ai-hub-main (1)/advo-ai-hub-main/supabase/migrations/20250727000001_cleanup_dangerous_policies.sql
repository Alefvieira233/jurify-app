-- 🚨 LIMPEZA CRÍTICA: Remover políticas RLS perigosas que permitem acesso total
-- Esta migração remove políticas inseguras que usam "USING (true)" ou "FOR ALL" sem restrições

-- Remover políticas perigosas da tabela n8n_workflows
DROP POLICY IF EXISTS "Users can view n8n workflows" ON public.n8n_workflows;
DROP POLICY IF EXISTS "Users can update n8n workflows" ON public.n8n_workflows;
DROP POLICY IF EXISTS "Users can delete n8n workflows" ON public.n8n_workflows;

-- Criar políticas seguras para n8n_workflows
CREATE POLICY "secure_n8n_workflows_select" ON public.n8n_workflows
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
);

CREATE POLICY "secure_n8n_workflows_insert" ON public.n8n_workflows
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

CREATE POLICY "secure_n8n_workflows_update" ON public.n8n_workflows
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

CREATE POLICY "secure_n8n_workflows_delete" ON public.n8n_workflows
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Remover outras políticas perigosas encontradas
-- Estas serão substituídas pelas políticas seguras já criadas em 20250615170000_enable_rls_all_tables.sql

-- Comentário: As políticas seguras tenant-based já foram implementadas na migração 20250615170000_enable_rls_all_tables.sql
-- Esta migração apenas remove as políticas conflitantes e perigosas das migrações anteriores
