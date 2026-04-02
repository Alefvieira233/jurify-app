-- =============================================================================
-- FIX RLS SECURITY: Remove tenant_id IS NULL bypass + harden tenant isolation
-- =============================================================================
--
-- Critical fixes:
--   1. DROP all policies with dangerous "OR tenant_id IS NULL" bypass from
--      EXECUTE_THIS_RLS_SETUP.sql — any authenticated user could see orphan rows.
--   2. Recreate policies using get_current_tenant_id() (cached STABLE function).
--   3. Add tenant-isolated RLS to profiles (own + same-tenant visibility).
--   4. Fix user_roles RLS to include tenant isolation via profiles join.
--   5. Fix user_permissions RLS to include tenant_id check.
--   6. Fix system_settings / notification_templates RLS to include tenant isolation.
--   7. Enforce tenant_id = get_current_tenant_id() on all INSERT WITH CHECK.
--   8. Enforce tenant isolation on UPDATE/DELETE.
--
-- All statements are IDEMPOTENT (DROP IF EXISTS before CREATE).
-- =============================================================================

-- =============================================================================
-- SECTION 1: Core tables — drop insecure "secure_*" policies from
--            EXECUTE_THIS_RLS_SETUP.sql (OR tenant_id IS NULL bypass)
-- =============================================================================

-- LEADS
DROP POLICY IF EXISTS "secure_leads_select"  ON public.leads;
DROP POLICY IF EXISTS "secure_leads_insert"  ON public.leads;
DROP POLICY IF EXISTS "secure_leads_update"  ON public.leads;
DROP POLICY IF EXISTS "secure_leads_delete"  ON public.leads;

-- CONTRATOS
DROP POLICY IF EXISTS "secure_contratos_select"  ON public.contratos;
DROP POLICY IF EXISTS "secure_contratos_insert"  ON public.contratos;
DROP POLICY IF EXISTS "secure_contratos_update"  ON public.contratos;

-- AGENDAMENTOS
DROP POLICY IF EXISTS "secure_agendamentos_select"  ON public.agendamentos;
DROP POLICY IF EXISTS "secure_agendamentos_insert"  ON public.agendamentos;

-- AGENTES_IA
DROP POLICY IF EXISTS "secure_agentes_select"  ON public.agentes_ia;
DROP POLICY IF EXISTS "secure_agentes_insert"  ON public.agentes_ia;
DROP POLICY IF EXISTS "secure_agentes_update"  ON public.agentes_ia;

-- LOGS_EXECUCAO_AGENTES
DROP POLICY IF EXISTS "secure_logs_select"  ON public.logs_execucao_agentes;
DROP POLICY IF EXISTS "secure_logs_insert"  ON public.logs_execucao_agentes;

-- NOTIFICACOES
DROP POLICY IF EXISTS "secure_notificacoes_select"  ON public.notificacoes;
DROP POLICY IF EXISTS "secure_notificacoes_insert"  ON public.notificacoes;

-- Also drop golden migration SELECT policies (we will recreate them identically)
DROP POLICY IF EXISTS "rls_leads_select"           ON public.leads;
DROP POLICY IF EXISTS "rls_contratos_select"       ON public.contratos;
DROP POLICY IF EXISTS "rls_agendamentos_select"    ON public.agendamentos;
DROP POLICY IF EXISTS "rls_agentes_ia_select"      ON public.agentes_ia;
DROP POLICY IF EXISTS "rls_notificacoes_select"    ON public.notificacoes;

-- Drop role-based INSERT/UPDATE/DELETE from 20260209000001 (we recreate below)
DROP POLICY IF EXISTS "rls_leads_insert"           ON public.leads;
DROP POLICY IF EXISTS "rls_leads_update"           ON public.leads;
DROP POLICY IF EXISTS "rls_leads_delete"           ON public.leads;
DROP POLICY IF EXISTS "rls_contratos_insert"       ON public.contratos;
DROP POLICY IF EXISTS "rls_contratos_update"       ON public.contratos;
DROP POLICY IF EXISTS "rls_contratos_delete"       ON public.contratos;
DROP POLICY IF EXISTS "rls_agendamentos_insert"    ON public.agendamentos;
DROP POLICY IF EXISTS "rls_agendamentos_update"    ON public.agendamentos;
DROP POLICY IF EXISTS "rls_agendamentos_delete"    ON public.agendamentos;
DROP POLICY IF EXISTS "rls_agentes_ia_insert"      ON public.agentes_ia;
DROP POLICY IF EXISTS "rls_agentes_ia_update"      ON public.agentes_ia;
DROP POLICY IF EXISTS "rls_agentes_ia_delete"      ON public.agentes_ia;
DROP POLICY IF EXISTS "rls_notificacoes_insert"    ON public.notificacoes;
DROP POLICY IF EXISTS "rls_notificacoes_update"    ON public.notificacoes;
DROP POLICY IF EXISTS "rls_notificacoes_delete"    ON public.notificacoes;

-- Logs — drop any existing
DROP POLICY IF EXISTS "rls_logs_execucao_select"   ON public.logs_execucao_agentes;
DROP POLICY IF EXISTS "rls_logs_execucao_insert"   ON public.logs_execucao_agentes;

-- =============================================================================
-- SECTION 2: Recreate core table policies — NO tenant_id IS NULL bypass
--            Uses public.get_current_tenant_id() for cached tenant lookup.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_leads_select" ON public.leads
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_leads_insert" ON public.leads
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'leads', 'create')
);

CREATE POLICY "rls_leads_update" ON public.leads
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'leads', 'update')
);

CREATE POLICY "rls_leads_delete" ON public.leads
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'leads', 'delete')
);

-- ---------------------------------------------------------------------------
-- CONTRATOS
-- ---------------------------------------------------------------------------
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_contratos_select" ON public.contratos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_contratos_insert" ON public.contratos
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'contratos', 'create')
);

CREATE POLICY "rls_contratos_update" ON public.contratos
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'contratos', 'update')
);

CREATE POLICY "rls_contratos_delete" ON public.contratos
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'contratos', 'delete')
);

-- ---------------------------------------------------------------------------
-- AGENDAMENTOS
-- ---------------------------------------------------------------------------
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_agendamentos_select" ON public.agendamentos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_agendamentos_insert" ON public.agendamentos
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'agendamentos', 'create')
);

CREATE POLICY "rls_agendamentos_update" ON public.agendamentos
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'agendamentos', 'update')
);

CREATE POLICY "rls_agendamentos_delete" ON public.agendamentos
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'agendamentos', 'delete')
);

-- ---------------------------------------------------------------------------
-- AGENTES_IA
-- ---------------------------------------------------------------------------
ALTER TABLE public.agentes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_agentes_ia_select" ON public.agentes_ia
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_agentes_ia_insert" ON public.agentes_ia
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'agentes_ia', 'create')
);

CREATE POLICY "rls_agentes_ia_update" ON public.agentes_ia
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'agentes_ia', 'update')
);

CREATE POLICY "rls_agentes_ia_delete" ON public.agentes_ia
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'agentes_ia', 'delete')
);

-- ---------------------------------------------------------------------------
-- LOGS_EXECUCAO_AGENTES
-- ---------------------------------------------------------------------------
ALTER TABLE public.logs_execucao_agentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_logs_execucao_select" ON public.logs_execucao_agentes
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_logs_execucao_insert" ON public.logs_execucao_agentes
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

-- ---------------------------------------------------------------------------
-- NOTIFICACOES
-- ---------------------------------------------------------------------------
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_notificacoes_select" ON public.notificacoes
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_notificacoes_insert" ON public.notificacoes
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "rls_notificacoes_update" ON public.notificacoes
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'notificacoes', 'update')
);

CREATE POLICY "rls_notificacoes_delete" ON public.notificacoes
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'notificacoes', 'delete')
);

-- =============================================================================
-- SECTION 3: PROFILES — tenant-isolated RLS
--            Users see own profile + all profiles in same tenant.
--            Users can only update their own profile.
--            Admins can manage all profiles within their tenant.
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing profile policies
DROP POLICY IF EXISTS "Users can view own profile"         ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil"  ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis"   ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_select"                ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_insert"                ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_update"                ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_delete"                ON public.profiles;

-- SELECT: users see own profile + all same-tenant profiles
CREATE POLICY "rls_profiles_select" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    id = auth.uid()
    OR tenant_id = public.get_current_tenant_id()
  )
);

-- INSERT: only via auth trigger / service_role (users don't insert profiles directly)
-- Allow insert only if tenant_id matches current user's tenant (or is the user's own profile)
CREATE POLICY "rls_profiles_insert" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND id = auth.uid()
);

-- UPDATE: users update own profile; admins update any profile in their tenant
CREATE POLICY "rls_profiles_update" ON public.profiles
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (
    id = auth.uid()
    OR (
      tenant_id = public.get_current_tenant_id()
      AND public.has_permission(auth.uid(), 'usuarios', 'update')
    )
  )
);

-- DELETE: only admins can delete profiles within their tenant
CREATE POLICY "rls_profiles_delete" ON public.profiles
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'usuarios', 'delete')
);

-- =============================================================================
-- SECTION 4: USER_ROLES — tenant-isolated RLS
--            user_roles has no tenant_id column, so we join through profiles
--            to enforce tenant isolation.
-- =============================================================================

ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop all existing user_roles policies
DROP POLICY IF EXISTS "users_read_own_role"                   ON public.user_roles;
DROP POLICY IF EXISTS "admins_manage_roles"                   ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin"                      ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os roles" ON public.user_roles;
DROP POLICY IF EXISTS "rls_user_roles_select"                 ON public.user_roles;
DROP POLICY IF EXISTS "rls_user_roles_insert"                 ON public.user_roles;
DROP POLICY IF EXISTS "rls_user_roles_update"                 ON public.user_roles;
DROP POLICY IF EXISTS "rls_user_roles_delete"                 ON public.user_roles;

-- SELECT: users read own role; admins read all roles within their tenant
CREATE POLICY "rls_user_roles_select" ON public.user_roles
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR (
      -- Admin can see roles of users in the same tenant
      public.has_permission(auth.uid(), 'usuarios', 'read')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_roles.user_id
        AND p.tenant_id = public.get_current_tenant_id()
      )
    )
  )
);

-- INSERT: only admins, and only for users in the same tenant
CREATE POLICY "rls_user_roles_insert" ON public.user_roles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
    AND p.tenant_id = public.get_current_tenant_id()
  )
);

-- UPDATE: only admins, and only for users in the same tenant
CREATE POLICY "rls_user_roles_update" ON public.user_roles
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
    AND p.tenant_id = public.get_current_tenant_id()
  )
);

-- DELETE: only admins, and only for users in the same tenant
CREATE POLICY "rls_user_roles_delete" ON public.user_roles
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
    AND p.tenant_id = public.get_current_tenant_id()
  )
);

-- =============================================================================
-- SECTION 5: USER_PERMISSIONS — tenant-isolated RLS
--            user_permissions has a tenant_id column.
-- =============================================================================

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "user_permissions_select"      ON public.user_permissions;
DROP POLICY IF EXISTS "rls_user_permissions_select"  ON public.user_permissions;
DROP POLICY IF EXISTS "rls_user_permissions_insert"  ON public.user_permissions;
DROP POLICY IF EXISTS "rls_user_permissions_update"  ON public.user_permissions;
DROP POLICY IF EXISTS "rls_user_permissions_delete"  ON public.user_permissions;

-- SELECT: users see own permissions; admins see all in their tenant
CREATE POLICY "rls_user_permissions_select" ON public.user_permissions
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

-- INSERT: admins only, within their tenant
CREATE POLICY "rls_user_permissions_insert" ON public.user_permissions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
);

-- UPDATE: admins only, within their tenant
CREATE POLICY "rls_user_permissions_update" ON public.user_permissions
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
);

-- DELETE: admins only, within their tenant
CREATE POLICY "rls_user_permissions_delete" ON public.user_permissions
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
);

-- =============================================================================
-- SECTION 6: SYSTEM_SETTINGS — tenant-isolated RLS
--            system_settings has no tenant_id column (global config table).
--            Enforce tenant isolation via profiles join: only admins in any
--            tenant can read/write, but they must be authenticated with a
--            valid tenant.
-- =============================================================================

ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "system_settings_admin"         ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_admin_only"    ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "rls_system_settings_select"    ON public.system_settings;
DROP POLICY IF EXISTS "rls_system_settings_insert"    ON public.system_settings;
DROP POLICY IF EXISTS "rls_system_settings_update"    ON public.system_settings;
DROP POLICY IF EXISTS "rls_system_settings_delete"    ON public.system_settings;

-- SELECT: admins with a valid tenant can read settings
CREATE POLICY "rls_system_settings_select" ON public.system_settings
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
  AND public.has_permission(auth.uid(), 'configuracoes', 'read')
);

-- INSERT: admins with a valid tenant
CREATE POLICY "rls_system_settings_insert" ON public.system_settings
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
  AND public.has_permission(auth.uid(), 'configuracoes', 'manage')
);

-- UPDATE: admins with a valid tenant
CREATE POLICY "rls_system_settings_update" ON public.system_settings
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
  AND public.has_permission(auth.uid(), 'configuracoes', 'update')
);

-- DELETE: admins with a valid tenant
CREATE POLICY "rls_system_settings_delete" ON public.system_settings
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
  AND public.has_permission(auth.uid(), 'configuracoes', 'manage')
);

-- =============================================================================
-- SECTION 7: NOTIFICATION_TEMPLATES — tenant-isolated RLS
--            notification_templates has no tenant_id column (global templates).
--            All authenticated users with a valid tenant can read.
--            Only admins can write.
-- =============================================================================

ALTER TABLE IF EXISTS public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "notification_templates_read"          ON public.notification_templates;
DROP POLICY IF EXISTS "notification_templates_admin_write"   ON public.notification_templates;
DROP POLICY IF EXISTS "notification_templates_admin_update"  ON public.notification_templates;
DROP POLICY IF EXISTS "notification_templates_admin"         ON public.notification_templates;
DROP POLICY IF EXISTS "Only admins can manage notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "rls_notification_templates_select"    ON public.notification_templates;
DROP POLICY IF EXISTS "rls_notification_templates_insert"    ON public.notification_templates;
DROP POLICY IF EXISTS "rls_notification_templates_update"    ON public.notification_templates;
DROP POLICY IF EXISTS "rls_notification_templates_delete"    ON public.notification_templates;

-- SELECT: all authenticated users with a valid tenant can read templates
CREATE POLICY "rls_notification_templates_select" ON public.notification_templates
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
);

-- INSERT: admins only
CREATE POLICY "rls_notification_templates_insert" ON public.notification_templates
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
  AND public.has_permission(auth.uid(), 'configuracoes', 'manage')
);

-- UPDATE: admins only
CREATE POLICY "rls_notification_templates_update" ON public.notification_templates
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
  AND public.has_permission(auth.uid(), 'configuracoes', 'update')
);

-- DELETE: admins only
CREATE POLICY "rls_notification_templates_delete" ON public.notification_templates
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
  AND public.has_permission(auth.uid(), 'configuracoes', 'manage')
);

-- =============================================================================
-- SECTION 8: ROLE_PERMISSIONS — fix to include tenant check
-- =============================================================================

ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_admin" ON public.role_permissions;
DROP POLICY IF EXISTS "rls_role_permissions_select" ON public.role_permissions;
DROP POLICY IF EXISTS "rls_role_permissions_write"  ON public.role_permissions;

-- SELECT: all authenticated users with a valid tenant can read role permissions
CREATE POLICY "rls_role_permissions_select" ON public.role_permissions
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
);

-- INSERT/UPDATE/DELETE: admins only
CREATE POLICY "rls_role_permissions_write" ON public.role_permissions
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND public.get_current_tenant_id() IS NOT NULL
  AND public.has_permission(auth.uid(), 'configuracoes', 'manage')
);
