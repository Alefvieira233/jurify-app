-- 🔒 SCRIPT SEGURO: Habilitar RLS apenas em tabelas que NÃO precisam de tenant_id
-- Execute este script no Supabase SQL Editor

-- ========================================
-- TABELAS QUE NÃO USAM TENANT_ID
-- (Tabelas globais ou de sistema)
-- ========================================

-- API Rate Limits (global, não precisa de tenant)
ALTER TABLE IF EXISTS public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_rate_limits_policy" ON public.api_rate_limits;
CREATE POLICY "api_rate_limits_policy" ON public.api_rate_limits
FOR ALL USING (auth.uid() IS NOT NULL);

-- System Settings (apenas admins)
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_admin_only" ON public.system_settings;
CREATE POLICY "system_settings_admin_only" ON public.system_settings
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Notification Templates (apenas admins podem modificar, todos podem ler)
ALTER TABLE IF EXISTS public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_templates_read" ON public.notification_templates;
CREATE POLICY "notification_templates_read" ON public.notification_templates
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notification_templates_admin_write" ON public.notification_templates;
CREATE POLICY "notification_templates_admin_write" ON public.notification_templates
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "notification_templates_admin_update" ON public.notification_templates;
CREATE POLICY "notification_templates_admin_update" ON public.notification_templates
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Role Permissions (apenas admins)
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_admin_only" ON public.role_permissions;
CREATE POLICY "role_permissions_admin_only" ON public.role_permissions
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- User Roles (apenas admins)
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_admin_only" ON public.user_roles
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ========================================
-- VERIFICAÇÃO: Listar tabelas ainda sem RLS
-- ========================================

SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Habilitado'
        ELSE '❌ SEM RLS'
    END as status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
ORDER BY rowsecurity, tablename;
