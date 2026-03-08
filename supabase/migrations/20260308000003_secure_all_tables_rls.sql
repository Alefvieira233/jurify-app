-- =============================================================
-- FASE 3: RLS segura em todas as tabelas multi-tenant
-- =============================================================

-- CONTRATOS
DROP POLICY IF EXISTS "Permitir acesso completo aos contratos" ON public.contratos;

CREATE POLICY "contratos_select_tenant" ON public.contratos
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "contratos_insert_tenant" ON public.contratos
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "contratos_update_tenant" ON public.contratos
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "contratos_delete_admin" ON public.contratos
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- AGENDAMENTOS
DROP POLICY IF EXISTS "Permitir acesso completo aos agendamentos" ON public.agendamentos;

CREATE POLICY "agendamentos_select_tenant" ON public.agendamentos
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "agendamentos_insert_tenant" ON public.agendamentos
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "agendamentos_update_tenant" ON public.agendamentos
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "agendamentos_delete_tenant" ON public.agendamentos
  FOR DELETE USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- PROCESSOS
DROP POLICY IF EXISTS "Permitir acesso completo aos processos" ON public.processos;

CREATE POLICY "processos_select_tenant" ON public.processos
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "processos_insert_tenant" ON public.processos
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "processos_update_tenant" ON public.processos
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "processos_delete_admin_manager" ON public.processos
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- HONORARIOS
DROP POLICY IF EXISTS "Permitir acesso completo aos honorarios" ON public.honorarios;

CREATE POLICY "honorarios_select_tenant" ON public.honorarios
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "honorarios_insert_admin_manager" ON public.honorarios
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "honorarios_update_admin_manager" ON public.honorarios
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "honorarios_delete_admin" ON public.honorarios
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- PRAZOS_PROCESSUAIS
CREATE POLICY "prazos_select_tenant" ON public.prazos_processuais
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "prazos_insert_tenant" ON public.prazos_processuais
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "prazos_update_tenant" ON public.prazos_processuais
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "prazos_delete_admin_manager" ON public.prazos_processuais
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- DOCUMENTOS_JURIDICOS
CREATE POLICY "documentos_select_tenant" ON public.documentos_juridicos
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "documentos_insert_tenant" ON public.documentos_juridicos
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "documentos_update_tenant" ON public.documentos_juridicos
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "documentos_delete_admin_manager" ON public.documentos_juridicos
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );
