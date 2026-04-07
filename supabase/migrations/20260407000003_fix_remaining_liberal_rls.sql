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

-- 9. LOGS_EXECUCAO_AGENTES
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos logs de execução" ON public.logs_execucao_agentes;

-- 10. GOOGLE_CALENDAR_TOKENS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos tokens Google" ON public.google_calendar_tokens;

-- 11. GOOGLE_CALENDAR_SETTINGS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às configurações Google" ON public.google_calendar_settings;

-- 12. GOOGLE_CALENDAR_SYNC_LOGS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos logs de sincronização" ON public.google_calendar_sync_logs;

-- 13. ZAPSIGN_LOGS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos logs ZapSign" ON public.zapsign_logs;

-- 14. SYSTEM_SETTINGS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às configurações do sistema" ON public.system_settings;

-- 15. NOTIFICATION_TEMPLATES
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos templates de notificação" ON public.notification_templates;

-- 16. API_RATE_LIMITS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos rate limits" ON public.api_rate_limits;

-- 17. PROFILES
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos perfis" ON public.profiles;

-- 18. USER_ROLES
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total aos roles" ON public.user_roles;

-- 19. ROLE_PERMISSIONS
DROP POLICY IF EXISTS "Usuários autenticados têm acesso total às permissões" ON public.role_permissions;
