-- =============================================================
-- Fix: Drop all remaining "liberal" RLS policies from migration
-- 20250615022602 that were never replaced by later migrations.
--
-- These policies use `auth.uid() IS NOT NULL` with no tenant
-- scoping, allowing any authenticated user to access any tenant's
-- data. Later migrations added proper tenant-scoped policies but
-- never DROPped these liberal ones. Because PostgreSQL RLS uses
-- OR semantics across policies, the liberal policy overrides all
-- restrictive ones on the same table.
-- =============================================================

-- 1. LEADS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos leads" ON public.leads;

-- 2. CONTRATOS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos contratos" ON public.contratos;

-- 3. AGENDAMENTOS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos agendamentos" ON public.agendamentos;

-- 4. AGENTES_IA
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos agentes IA" ON public.agentes_ia;

-- 5. NOTIFICACOES
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às notificações" ON public.notificacoes;

-- 6. LOGS_ATIVIDADES
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos logs" ON public.logs_atividades;

-- 7. CONFIGURACOES_INTEGRACOES
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às configurações de integrações" ON public.configuracoes_integracoes;

-- 8. API_KEYS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às API keys" ON public.api_keys;

-- 9. LOGS_EXECUCAO_AGENTES (table may not exist — wrapped in DO block)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'logs_execucao_agentes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos logs de execução" ON public.logs_execucao_agentes';
  END IF;
END $$;

-- 10-19: Tables that may or may not exist — use safe DO blocks
DO $$
DECLARE
  _drops text[] := ARRAY[
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos tokens Google" ON public.google_calendar_tokens',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às configurações Google" ON public.google_calendar_settings',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos logs de sincronização" ON public.google_calendar_sync_logs',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos logs ZapSign" ON public.zapsign_logs',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às configurações do sistema" ON public.system_settings',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos templates de notificação" ON public.notification_templates',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos rate limits" ON public.api_rate_limits',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos perfis" ON public.profiles',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos roles" ON public.user_roles',
    'DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às permissões" ON public.role_permissions'
  ];
  _sql text;
BEGIN
  FOREACH _sql IN ARRAY _drops LOOP
    BEGIN
      EXECUTE _sql;
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist, skip silently
    END;
  END LOOP;
END $$;
