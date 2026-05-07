-- RBAC hardening (P1.10 da auditoria 2026-05-07):
-- A policy `rls_honorarios_all` permitia INSERT/UPDATE/DELETE pra qualquer
-- usuário autenticado do tenant — sem checar role. Frontend (`/honorarios`)
-- exige admin/manager via React `requiredRoles`, mas viewer/user podia
-- bater direto na API supabase-js e burlar.
-- Fix: separa policies de write pra exigir role admin/manager. SELECT
-- continua aberto pra todos os autenticados do tenant.

DROP POLICY IF EXISTS rls_honorarios_all ON public.honorarios;

CREATE POLICY rls_honorarios_insert ON public.honorarios
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.tenant_id = public.honorarios.tenant_id
         AND ur.ativo = true
         AND ur.role IN ('admin', 'administrador', 'manager', 'gerente')
    )
  );

CREATE POLICY rls_honorarios_update ON public.honorarios
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.tenant_id = public.honorarios.tenant_id
         AND ur.ativo = true
         AND ur.role IN ('admin', 'administrador', 'manager', 'gerente')
    )
  );

CREATE POLICY rls_honorarios_delete ON public.honorarios
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.tenant_id = public.honorarios.tenant_id
         AND ur.ativo = true
         AND ur.role IN ('admin', 'administrador')
    )
  );

COMMENT ON POLICY rls_honorarios_insert ON public.honorarios IS 'P1.10 RBAC: requer admin/manager — frontend já exigia';
COMMENT ON POLICY rls_honorarios_update ON public.honorarios IS 'P1.10 RBAC: requer admin/manager';
COMMENT ON POLICY rls_honorarios_delete ON public.honorarios IS 'P1.10 RBAC: requer admin (não manager)';
