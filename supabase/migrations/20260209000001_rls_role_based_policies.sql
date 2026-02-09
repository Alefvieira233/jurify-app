-- Role-Based Access Control policies for core tables.
-- Mirrors the ROLE_PERMISSIONS matrix from src/types/rbac.ts.
-- Replaces tenant-only INSERT/UPDATE/DELETE with role-aware versions.
-- SELECT policies are left untouched.

-- =============================================================================
-- 1. has_permission(uid, resource, action) function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_permission(_uid uuid, _resource text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE coalesce(
    (SELECT p.role FROM public.profiles p WHERE p.id = _uid),
    'viewer'  -- unknown/null role defaults to viewer (read-only, prevents lockout)
  )
    WHEN 'admin' THEN
      CASE _resource
        WHEN 'leads'        THEN _action IN ('create','read','update','delete')
        WHEN 'contratos'    THEN _action IN ('create','read','update','delete')
        WHEN 'agentes_ia'   THEN _action IN ('create','read','update','delete','execute')
        WHEN 'agendamentos' THEN _action IN ('create','read','update','delete')
        WHEN 'notificacoes' THEN _action IN ('read','update','delete')
        WHEN 'usuarios'     THEN _action IN ('create','read','update','delete','manage')
        WHEN 'configuracoes' THEN _action IN ('read','update','manage')
        WHEN 'relatorios'   THEN _action IN ('read','create')
        WHEN 'logs'         THEN _action IN ('read')
        WHEN 'integracoes'  THEN _action IN ('read','update','manage')
        WHEN 'whatsapp'     THEN _action IN ('read','create','update')
        WHEN 'pipeline'     THEN _action IN ('read','update')
        ELSE false
      END

    WHEN 'manager' THEN
      CASE _resource
        WHEN 'leads'        THEN _action IN ('create','read','update','delete')
        WHEN 'contratos'    THEN _action IN ('create','read','update')
        WHEN 'agentes_ia'   THEN _action IN ('read','execute')
        WHEN 'agendamentos' THEN _action IN ('create','read','update','delete')
        WHEN 'notificacoes' THEN _action IN ('read','update')
        WHEN 'usuarios'     THEN _action IN ('read')
        WHEN 'configuracoes' THEN _action IN ('read')
        WHEN 'relatorios'   THEN _action IN ('read','create')
        WHEN 'logs'         THEN _action IN ('read')
        WHEN 'integracoes'  THEN _action IN ('read')
        WHEN 'whatsapp'     THEN _action IN ('read','create')
        WHEN 'pipeline'     THEN _action IN ('read','update')
        ELSE false
      END

    WHEN 'user' THEN
      CASE _resource
        WHEN 'leads'        THEN _action IN ('create','read','update')
        WHEN 'contratos'    THEN _action IN ('read')
        WHEN 'agentes_ia'   THEN _action IN ('read','execute')
        WHEN 'agendamentos' THEN _action IN ('create','read','update')
        WHEN 'notificacoes' THEN _action IN ('read','update')
        WHEN 'usuarios'     THEN _action IN ('read')
        WHEN 'configuracoes' THEN _action IN ('read')
        WHEN 'relatorios'   THEN _action IN ('read')
        WHEN 'whatsapp'     THEN _action IN ('read')
        WHEN 'pipeline'     THEN _action IN ('read')
        ELSE false
      END

    -- viewer (default for unknown roles)
    ELSE
      CASE _resource
        WHEN 'leads'        THEN _action IN ('read')
        WHEN 'contratos'    THEN _action IN ('read')
        WHEN 'agentes_ia'   THEN _action IN ('read')
        WHEN 'agendamentos' THEN _action IN ('read')
        WHEN 'notificacoes' THEN _action IN ('read')
        WHEN 'relatorios'   THEN _action IN ('read')
        WHEN 'whatsapp'     THEN _action IN ('read')
        WHEN 'pipeline'     THEN _action IN ('read')
        ELSE false
      END
  END;
$$;

COMMENT ON FUNCTION public.has_permission IS
  'Role-based permission check mirroring src/types/rbac.ts ROLE_PERMISSIONS matrix. '
  'Unknown/null roles default to viewer (read-only).';

-- =============================================================================
-- 2. Drop conflicting old policies
-- =============================================================================

-- From 20250615170000_enable_rls_all_tables.sql (reference user_permissions table)
DROP POLICY IF EXISTS "secure_leads_insert" ON public.leads;
DROP POLICY IF EXISTS "secure_leads_update" ON public.leads;
DROP POLICY IF EXISTS "secure_leads_delete" ON public.leads;

DROP POLICY IF EXISTS "secure_contratos_insert" ON public.contratos;
DROP POLICY IF EXISTS "secure_contratos_update" ON public.contratos;
DROP POLICY IF EXISTS "secure_contratos_delete" ON public.contratos;

DROP POLICY IF EXISTS "secure_agendamentos_insert" ON public.agendamentos;
DROP POLICY IF EXISTS "secure_agendamentos_update" ON public.agendamentos;
DROP POLICY IF EXISTS "secure_agendamentos_delete" ON public.agendamentos;

DROP POLICY IF EXISTS "secure_agentes_insert" ON public.agentes_ia;
DROP POLICY IF EXISTS "secure_agentes_update" ON public.agentes_ia;
DROP POLICY IF EXISTS "secure_agentes_delete" ON public.agentes_ia;

DROP POLICY IF EXISTS "secure_notificacoes_update" ON public.notificacoes;

-- From 20260301000000_rls_hardening_unrestricted.sql (tenant-only, no role check)
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;

DROP POLICY IF EXISTS "contratos_insert" ON public.contratos;
DROP POLICY IF EXISTS "contratos_update" ON public.contratos;
DROP POLICY IF EXISTS "contratos_delete" ON public.contratos;

DROP POLICY IF EXISTS "agendamentos_insert" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_update" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_delete" ON public.agendamentos;

DROP POLICY IF EXISTS "agentes_ia_insert" ON public.agentes_ia;
DROP POLICY IF EXISTS "agentes_ia_update" ON public.agentes_ia;
DROP POLICY IF EXISTS "agentes_ia_delete" ON public.agentes_ia;

DROP POLICY IF EXISTS "notificacoes_insert" ON public.notificacoes;
DROP POLICY IF EXISTS "notificacoes_update" ON public.notificacoes;
DROP POLICY IF EXISTS "notificacoes_delete" ON public.notificacoes;

-- =============================================================================
-- 3. Create new role-aware policies (tenant isolation + role check)
-- =============================================================================

-- Helper expression reused across policies
-- tenant_match := tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())

-- ---------------------------------------------------------------------------
-- LEADS: INSERT(admin,manager,user) UPDATE(admin,manager,user) DELETE(admin)
-- ---------------------------------------------------------------------------

CREATE POLICY "rls_leads_insert" ON public.leads
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'create')
);

CREATE POLICY "rls_leads_update" ON public.leads
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "rls_leads_delete" ON public.leads
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'leads', 'delete')
);

-- ---------------------------------------------------------------------------
-- CONTRATOS: INSERT(admin,manager) UPDATE(admin,manager) DELETE(admin)
-- ---------------------------------------------------------------------------

CREATE POLICY "rls_contratos_insert" ON public.contratos
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'contratos', 'create')
);

CREATE POLICY "rls_contratos_update" ON public.contratos
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'contratos', 'update')
);

CREATE POLICY "rls_contratos_delete" ON public.contratos
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'contratos', 'delete')
);

-- ---------------------------------------------------------------------------
-- AGENTES_IA: INSERT(admin) UPDATE(admin) DELETE(admin)
-- ---------------------------------------------------------------------------

CREATE POLICY "rls_agentes_ia_insert" ON public.agentes_ia
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'agentes_ia', 'create')
);

CREATE POLICY "rls_agentes_ia_update" ON public.agentes_ia
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'agentes_ia', 'update')
);

CREATE POLICY "rls_agentes_ia_delete" ON public.agentes_ia
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'agentes_ia', 'delete')
);

-- ---------------------------------------------------------------------------
-- AGENDAMENTOS: INSERT(admin,manager,user) UPDATE(admin,manager,user) DELETE(admin)
-- ---------------------------------------------------------------------------

CREATE POLICY "rls_agendamentos_insert" ON public.agendamentos
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'agendamentos', 'create')
);

CREATE POLICY "rls_agendamentos_update" ON public.agendamentos
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'agendamentos', 'update')
);

CREATE POLICY "rls_agendamentos_delete" ON public.agendamentos
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'agendamentos', 'delete')
);

-- ---------------------------------------------------------------------------
-- NOTIFICACOES: INSERT(tenant-only, system-generated) UPDATE(admin,manager,user) DELETE(admin)
-- ---------------------------------------------------------------------------

CREATE POLICY "rls_notificacoes_insert" ON public.notificacoes
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "rls_notificacoes_update" ON public.notificacoes
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'notificacoes', 'update')
);

CREATE POLICY "rls_notificacoes_delete" ON public.notificacoes
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_permission(auth.uid(), 'notificacoes', 'delete')
);
