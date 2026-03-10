-- =============================================================================
-- FIX: app_role enum conflict between DB (Portuguese) and frontend (English)
--
-- Problem: Original migration created app_role with Portuguese values
-- ('administrador','advogado','comercial','pos_venda','suporte') but frontend
-- and newer migrations use English values ('admin','manager','user','viewer').
-- has_role(uid, 'admin') always fails because 'admin' is not a valid enum value.
--
-- Solution:
--   1. Add English values to existing enum
--   2. Update all existing records to use English names
--   3. Recreate has_role() to accept TEXT (avoids enum cast issues)
--   4. Recreate has_permission() to accept TEXT role mapping
--   5. Update handle_new_user() trigger to use 'viewer' instead of 'suporte'
--   6. Drop and recreate RLS policies that hardcode 'administrador'
-- =============================================================================

-- 1. Add new enum values (PostgreSQL 12+ allows ADD VALUE in transactions)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2. Update existing records: map old Portuguese values → new English values
UPDATE public.user_roles SET role = 'admin'   WHERE role = 'administrador';
UPDATE public.user_roles SET role = 'manager' WHERE role = 'advogado';
UPDATE public.user_roles SET role = 'user'    WHERE role = 'comercial';
UPDATE public.user_roles SET role = 'user'    WHERE role = 'pos_venda';
UPDATE public.user_roles SET role = 'viewer'  WHERE role = 'suporte';

-- Update role_permissions table too
UPDATE public.role_permissions SET role = 'admin'   WHERE role = 'administrador';
UPDATE public.role_permissions SET role = 'manager' WHERE role = 'advogado';
UPDATE public.role_permissions SET role = 'user'    WHERE role = 'comercial';
UPDATE public.role_permissions SET role = 'user'    WHERE role = 'pos_venda';
UPDATE public.role_permissions SET role = 'viewer'  WHERE role = 'suporte';

-- 3. Recreate has_role() to accept TEXT — avoids enum cast errors
--    Maps both old and new role names for backwards compatibility
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = (
        CASE _role
          WHEN 'administrador' THEN 'admin'
          WHEN 'advogado'      THEN 'manager'
          WHEN 'comercial'     THEN 'user'
          WHEN 'pos_venda'     THEN 'user'
          WHEN 'suporte'       THEN 'viewer'
          ELSE _role
        END
      )
      AND (ativo IS NULL OR ativo = true)
  )
$$;

-- 4. Recreate get_user_role() for consistency
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles
  WHERE user_id = _user_id AND (ativo IS NULL OR ativo = true)
  LIMIT 1
$$;

-- 5. Recreate has_permission() to work with text roles
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _module app_module,
  _permission app_permission
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND (ur.ativo IS NULL OR ur.ativo = true)
      AND rp.module = _module
      AND (rp.permission = _permission OR rp.permission = 'manage')
      AND (rp.ativo IS NULL OR rp.ativo = true)
  )
$$;

-- 6. Update handle_new_user() trigger to use 'viewer' instead of 'suporte'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );

  -- Assign default role 'viewer' (least privilege)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');

  RETURN NEW;
END;
$$;

-- 7. Drop and recreate RLS policies that hardcode 'administrador'

-- profiles policies (from 20250614221527)
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
CREATE POLICY "Admins podem ver todos os perfis" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND (ur.ativo IS NULL OR ur.ativo = true)
    )
  );

-- user_roles policies (from 20250614221527)
DROP POLICY IF EXISTS "Admins podem gerenciar todos os roles" ON public.user_roles;
CREATE POLICY "Admins podem gerenciar todos os roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND (ur.ativo IS NULL OR ur.ativo = true)
    )
  );

-- role_permissions policies (from 20250614221527)
DROP POLICY IF EXISTS "Admins podem gerenciar permissões" ON public.role_permissions;
CREATE POLICY "Admins podem gerenciar permissões" ON public.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND (ur.ativo IS NULL OR ur.ativo = true)
    )
  );

-- notificacoes policies (from 20250614223249)
DROP POLICY IF EXISTS "Admins podem atualizar notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Admins podem excluir notificacoes" ON public.notificacoes;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notificacoes' AND relkind = 'r') THEN
    EXECUTE 'CREATE POLICY "Admins podem atualizar notificacoes" ON public.notificacoes
      FOR UPDATE USING (
        tenant_id = public.get_current_tenant_id()
        OR public.has_role(auth.uid(), ''admin'')
      )';
    EXECUTE 'CREATE POLICY "Admins podem excluir notificacoes" ON public.notificacoes
      FOR DELETE USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- logs_execucao_agentes policies (from 20250614223729)
DROP POLICY IF EXISTS "Admins podem ver logs" ON public.logs_execucao_agentes;
DROP POLICY IF EXISTS "Admins podem atualizar logs" ON public.logs_execucao_agentes;
DROP POLICY IF EXISTS "Admins podem excluir logs" ON public.logs_execucao_agentes;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'logs_execucao_agentes' AND relkind = 'r') THEN
    EXECUTE 'CREATE POLICY "Admins podem ver logs" ON public.logs_execucao_agentes
      FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "Admins podem atualizar logs" ON public.logs_execucao_agentes
      FOR UPDATE USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "Admins podem excluir logs" ON public.logs_execucao_agentes
      FOR DELETE USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- configuracoes_integracoes policies (from 20250614224534)
DROP POLICY IF EXISTS "Admins podem ver configuracoes" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Admins podem criar configuracoes" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Admins podem atualizar configuracoes" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Admins podem excluir configuracoes" ON public.configuracoes_integracoes;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'configuracoes_integracoes' AND relkind = 'r') THEN
    EXECUTE 'CREATE POLICY "Admins podem ver configuracoes" ON public.configuracoes_integracoes
      FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "Admins podem criar configuracoes" ON public.configuracoes_integracoes
      FOR INSERT WITH CHECK (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "Admins podem atualizar configuracoes" ON public.configuracoes_integracoes
      FOR UPDATE USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "Admins podem excluir configuracoes" ON public.configuracoes_integracoes
      FOR DELETE USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- webhook_events policies (from 20250615001153)
DROP POLICY IF EXISTS "Admins podem gerenciar webhook_events" ON public.webhook_events;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'webhook_events' AND relkind = 'r') THEN
    EXECUTE 'CREATE POLICY "Admins podem gerenciar webhook_events" ON public.webhook_events
      FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- notification_templates policies (from 20250615013441)
DROP POLICY IF EXISTS "Admins podem gerenciar templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Admins podem criar templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Admins podem atualizar templates" ON public.notification_templates;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notification_templates' AND relkind = 'r') THEN
    EXECUTE 'CREATE POLICY "Admins podem gerenciar templates" ON public.notification_templates
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = ''admin''
          AND (ur.ativo IS NULL OR ur.ativo = true)
        )
      )';
  END IF;
END $$;

-- rls_hardening_unrestricted policies (from 20260301000000)
DROP POLICY IF EXISTS "service_or_admin_manage" ON public.configuracoes_integracoes;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'configuracoes_integracoes' AND relkind = 'r') THEN
    EXECUTE 'CREATE POLICY "service_or_admin_manage" ON public.configuracoes_integracoes
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = ''admin''
          AND (ur.ativo IS NULL OR ur.ativo = true)
        )
      )';
  END IF;
END $$;

-- Update notification_templates data: replace old role names in roles_destinatarios arrays
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notification_templates' AND relkind = 'r') THEN
    UPDATE public.notification_templates
    SET roles_destinatarios = ARRAY(
      SELECT CASE v
        WHEN 'administrador' THEN 'admin'
        WHEN 'advogado' THEN 'manager'
        WHEN 'comercial' THEN 'user'
        WHEN 'pos_venda' THEN 'user'
        WHEN 'suporte' THEN 'viewer'
        ELSE v
      END
      FROM unnest(roles_destinatarios) AS v
    )
    WHERE roles_destinatarios IS NOT NULL;
  END IF;
END $$;
