-- RLS hardening for tables that show as UNRESTRICTED in Supabase UI.
-- This migration enables RLS and adds safe default policies with existence checks.

CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _uid
      AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _uid
      AND ur.role = 'administrador'
      AND ur.ativo = true
    );
$$;

CREATE OR REPLACE FUNCTION public.ensure_policy(
  _table text,
  _policy text,
  _command text,
  _using text,
  _check text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = _table
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = _table
    AND policyname = _policy
  ) THEN
    RETURN;
  END IF;

  IF _command = 'SELECT' THEN
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (%s)',
      _policy, _table, _using
    );
  ELSIF _command = 'INSERT' THEN
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)',
      _policy, _table, _check
    );
  ELSIF _command = 'UPDATE' THEN
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (%s) WITH CHECK (%s)',
      _policy, _table, _using, _check
    );
  ELSIF _command = 'DELETE' THEN
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (%s)',
      _policy, _table, _using
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_rls_defaults(
  _table text,
  _mode text DEFAULT 'auto'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cond text;
  tenant_cond text;
  has_tenant boolean;
  has_user boolean;
  has_owner boolean;
  has_created_by boolean;
  has_profile boolean;
  has_lead boolean;
  has_contrato boolean;
  has_conversation boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = _table
  ) THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _table);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', _table);

  tenant_cond := 'auth.uid() IS NOT NULL AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())';

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = _table
    AND column_name = 'user_id'
  ) INTO has_user;

  IF _mode = 'admin' THEN
    cond := 'public.is_admin(auth.uid())';
  ELSIF _mode = 'tenant' THEN
    cond := tenant_cond;
  ELSIF _mode = 'user' THEN
    IF has_user THEN
      cond := 'auth.uid() IS NOT NULL AND user_id = auth.uid()';
    ELSE
      _mode := 'auto';
    END IF;
  ELSIF _mode = 'public_read' THEN
    PERFORM public.ensure_policy(_table, _table || '_read', 'SELECT', 'true', NULL);
    PERFORM public.ensure_policy(_table, _table || '_insert_admin', 'INSERT', NULL, 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_update_admin', 'UPDATE', 'public.is_admin(auth.uid())', 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_delete_admin', 'DELETE', 'public.is_admin(auth.uid())', NULL);
    RETURN;
  ELSIF _mode = 'subscriptions' THEN
    IF has_user THEN
      PERFORM public.ensure_policy(_table, _table || '_read_own', 'SELECT', 'auth.uid() IS NOT NULL AND user_id = auth.uid()', NULL);
      PERFORM public.ensure_policy(_table, _table || '_insert_admin', 'INSERT', NULL, 'public.is_admin(auth.uid())');
      PERFORM public.ensure_policy(_table, _table || '_update_admin', 'UPDATE', 'public.is_admin(auth.uid())', 'public.is_admin(auth.uid())');
      PERFORM public.ensure_policy(_table, _table || '_delete_admin', 'DELETE', 'public.is_admin(auth.uid())', NULL);
      RETURN;
    ELSE
      _mode := 'auto';
    END IF;
  ELSIF _mode = 'profiles' THEN
    PERFORM public.ensure_policy(_table, _table || '_select_self', 'SELECT', 'auth.uid() = id', NULL);
    PERFORM public.ensure_policy(_table, _table || '_select_admin', 'SELECT', 'public.is_admin(auth.uid())', NULL);
    PERFORM public.ensure_policy(_table, _table || '_insert_admin', 'INSERT', NULL, 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_update_self', 'UPDATE', 'auth.uid() = id', 'auth.uid() = id');
    PERFORM public.ensure_policy(_table, _table || '_update_admin', 'UPDATE', 'public.is_admin(auth.uid())', 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_delete_admin', 'DELETE', 'public.is_admin(auth.uid())', NULL);
    RETURN;
  ELSIF _mode = 'logs_atividades' THEN
    PERFORM public.ensure_policy(_table, _table || '_select_admin', 'SELECT', 'public.is_admin(auth.uid())', NULL);
    PERFORM public.ensure_policy(_table, _table || '_insert_auth', 'INSERT', NULL, 'auth.uid() IS NOT NULL');
    PERFORM public.ensure_policy(_table, _table || '_update_admin', 'UPDATE', 'public.is_admin(auth.uid())', 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_delete_admin', 'DELETE', 'public.is_admin(auth.uid())', NULL);
    RETURN;
  ELSIF _mode = 'user_roles' THEN
    IF has_user THEN
      PERFORM public.ensure_policy(_table, _table || '_select_self', 'SELECT', 'user_id = auth.uid()', NULL);
    END IF;
    PERFORM public.ensure_policy(_table, _table || '_select_admin', 'SELECT', 'public.is_admin(auth.uid())', NULL);
    PERFORM public.ensure_policy(_table, _table || '_insert_admin', 'INSERT', NULL, 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_update_admin', 'UPDATE', 'public.is_admin(auth.uid())', 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_delete_admin', 'DELETE', 'public.is_admin(auth.uid())', NULL);
    RETURN;
  ELSIF _mode = 'user_permissions' THEN
    IF has_user THEN
      PERFORM public.ensure_policy(_table, _table || '_select_self', 'SELECT', 'user_id = auth.uid()', NULL);
    END IF;
    PERFORM public.ensure_policy(_table, _table || '_select_admin', 'SELECT', 'public.is_admin(auth.uid())', NULL);
    PERFORM public.ensure_policy(_table, _table || '_insert_admin', 'INSERT', NULL, 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_update_admin', 'UPDATE', 'public.is_admin(auth.uid())', 'public.is_admin(auth.uid())');
    PERFORM public.ensure_policy(_table, _table || '_delete_admin', 'DELETE', 'public.is_admin(auth.uid())', NULL);
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = _table
    AND column_name = 'tenant_id'
  ) INTO has_tenant;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = _table
    AND column_name = 'owner_id'
  ) INTO has_owner;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = _table
    AND column_name = 'created_by'
  ) INTO has_created_by;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = _table
    AND column_name = 'profile_id'
  ) INTO has_profile;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = _table
    AND column_name = 'lead_id'
  ) INTO has_lead;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = _table
    AND column_name = 'contrato_id'
  ) INTO has_contrato;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = _table
    AND column_name = 'conversation_id'
  ) INTO has_conversation;

  IF has_tenant THEN
    cond := tenant_cond;
  ELSIF has_user THEN
    cond := 'auth.uid() IS NOT NULL AND user_id = auth.uid()';
  ELSIF has_owner THEN
    cond := 'auth.uid() IS NOT NULL AND owner_id = auth.uid()';
  ELSIF has_created_by THEN
    cond := 'auth.uid() IS NOT NULL AND created_by = auth.uid()';
  ELSIF has_profile THEN
    cond := 'auth.uid() IS NOT NULL AND profile_id = auth.uid()';
  ELSIF has_lead THEN
    cond := 'auth.uid() IS NOT NULL AND lead_id IN (SELECT id FROM public.leads WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  ELSIF has_contrato THEN
    cond := 'auth.uid() IS NOT NULL AND contrato_id IN (SELECT id FROM public.contratos WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  ELSIF has_conversation THEN
    cond := 'auth.uid() IS NOT NULL AND conversation_id IN (SELECT id FROM public.whatsapp_conversations WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  ELSE
    cond := 'public.is_admin(auth.uid())';
  END IF;

  PERFORM public.ensure_policy(_table, _table || '_select', 'SELECT', cond, NULL);
  PERFORM public.ensure_policy(_table, _table || '_insert', 'INSERT', NULL, cond);
  PERFORM public.ensure_policy(_table, _table || '_update', 'UPDATE', cond, cond);
  PERFORM public.ensure_policy(_table, _table || '_delete', 'DELETE', cond || ' AND public.is_admin(auth.uid())', NULL);
END;
$$;

-- Apply policies for tables visible in the Supabase UI screenshot.
SELECT public.apply_rls_defaults('agendamentos', 'tenant');
SELECT public.apply_rls_defaults('agent_ai_logs', 'tenant');
SELECT public.apply_rls_defaults('agent_executions', 'tenant');
SELECT public.apply_rls_defaults('agentes_ia', 'tenant');
SELECT public.apply_rls_defaults('allowed_columns', 'auto');
SELECT public.apply_rls_defaults('api_keys', 'admin');
SELECT public.apply_rls_defaults('api_rate_limits', 'admin');
SELECT public.apply_rls_defaults('configuracoes_integracoes', 'admin');
SELECT public.apply_rls_defaults('contratos', 'tenant');
SELECT public.apply_rls_defaults('conversation_logs', 'auto');
SELECT public.apply_rls_defaults('google_calendar_settings', 'user');
SELECT public.apply_rls_defaults('google_calendar_sync_logs', 'user');
SELECT public.apply_rls_defaults('google_calendar_tokens', 'user');
SELECT public.apply_rls_defaults('google_calendar_watches', 'user');
SELECT public.apply_rls_defaults('hitl_requests', 'auto');
SELECT public.apply_rls_defaults('knowledge_base', 'auto');
SELECT public.apply_rls_defaults('lead_interactions', 'auto');
SELECT public.apply_rls_defaults('leads', 'tenant');
SELECT public.apply_rls_defaults('logs_atividades', 'logs_atividades');
SELECT public.apply_rls_defaults('logs_execucao_agentes', 'tenant');
SELECT public.apply_rls_defaults('notificacoes', 'tenant');
SELECT public.apply_rls_defaults('notification_templates', 'admin');
SELECT public.apply_rls_defaults('pagamentos', 'auto');
SELECT public.apply_rls_defaults('profiles', 'profiles');
SELECT public.apply_rls_defaults('role_permissions', 'admin');
SELECT public.apply_rls_defaults('security_audit', 'auto');
SELECT public.apply_rls_defaults('subscription_plans', 'public_read');
SELECT public.apply_rls_defaults('subscriptions', 'subscriptions');
SELECT public.apply_rls_defaults('system_settings', 'admin');
SELECT public.apply_rls_defaults('tenants', 'admin');
SELECT public.apply_rls_defaults('user_permissions', 'user_permissions');
SELECT public.apply_rls_defaults('user_roles', 'user_roles');
SELECT public.apply_rls_defaults('webhook_logs', 'auto');
SELECT public.apply_rls_defaults('whatsapp_conversations', 'tenant');
SELECT public.apply_rls_defaults('whatsapp_messages', 'auto');
SELECT public.apply_rls_defaults('whatsapp_sessions', 'auto');
SELECT public.apply_rls_defaults('zapsign_logs', 'auto');
SELECT public.apply_rls_defaults('plans', 'public_read');
