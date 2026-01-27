-- 🔒 SCRIPT DE SEGURANÇA: Habilitar RLS em TODAS as tabelas
-- Execute este script no Supabase SQL Editor para proteger seu banco de dados

-- ========================================
-- TABELAS DE SISTEMA E CONFIGURAÇÃO
-- ========================================

-- API Rate Limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_rate_limits_policy" ON public.api_rate_limits
FOR ALL USING (auth.uid() IS NOT NULL);

-- Configurações de Integrações
ALTER TABLE public.configuracoes_integracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "configuracoes_integracoes_policy" ON public.configuracoes_integracoes
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Google Calendar Settings
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_calendar_settings_policy" ON public.google_calendar_settings
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Google Calendar Sync Logs
ALTER TABLE public.google_calendar_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_calendar_sync_logs_policy" ON public.google_calendar_sync_logs
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- ========================================
-- TABELAS DE LOGS
-- ========================================

-- Logs de Atividades
ALTER TABLE public.logs_atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_atividades_select" ON public.logs_atividades
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "logs_atividades_insert" ON public.logs_atividades
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Logs de Execução de Agentes (já tem RLS, mas vamos garantir)
ALTER TABLE public.logs_execucao_agentes ENABLE ROW LEVEL SECURITY;

-- Webhook Logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_logs_policy" ON public.webhook_logs
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- ZapSign Logs
ALTER TABLE public.zapsign_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zapsign_logs_policy" ON public.zapsign_logs
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- ========================================
-- TABELAS DE PERMISSÕES E ROLES
-- ========================================

-- Role Permissions (apenas admins)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
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
-- TABELAS DE NOTIFICAÇÕES
-- ========================================

-- Notificações (já tem RLS, mas vamos garantir)
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Notification Templates (apenas admins)
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_templates_admin" ON public.notification_templates
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ========================================
-- TABELAS DE ASSINATURAS
-- ========================================

-- Subscription Plans (apenas admins podem modificar, todos podem ler)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_plans_read" ON public.subscription_plans
FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "subscription_plans_admin_write" ON public.subscription_plans
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ========================================
-- CONFIGURAÇÕES DO SISTEMA
-- ========================================

-- System Settings (apenas admins)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_settings_admin_only" ON public.system_settings
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- Listar todas as tabelas SEM RLS (deve retornar vazio após executar este script)
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE c.relrowsecurity = true
  AND t.schemaname = 'public'
)
ORDER BY tablename;
