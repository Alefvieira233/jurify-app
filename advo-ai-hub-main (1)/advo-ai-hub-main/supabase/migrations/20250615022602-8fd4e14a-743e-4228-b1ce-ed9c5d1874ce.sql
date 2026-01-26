
-- Remover todas as políticas RLS restritivas existentes e criar novas políticas liberais

-- 1. LEADS - Remover políticas existentes e criar nova política liberal
DROP POLICY IF EXISTS "Permitir acesso completo aos leads" ON public.leads;
CREATE POLICY "Usuários autenticados têm acesso total aos leads" 
  ON public.leads 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. CONTRATOS - Remover políticas existentes e criar nova política liberal
DROP POLICY IF EXISTS "Permitir acesso completo aos contratos" ON public.contratos;
CREATE POLICY "Usuários autenticados têm acesso total aos contratos" 
  ON public.contratos 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. AGENDAMENTOS - Remover políticas existentes e criar nova política liberal
DROP POLICY IF EXISTS "Permitir acesso completo aos agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários autenticados têm acesso total aos agendamentos" 
  ON public.agendamentos 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. AGENTES IA - Remover políticas existentes e criar nova política liberal
DROP POLICY IF EXISTS "Permitir acesso completo aos agentes IA" ON public.agentes_ia;
CREATE POLICY "Usuários autenticados têm acesso total aos agentes IA" 
  ON public.agentes_ia 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. NOTIFICAÇÕES - Remover políticas restritivas
DROP POLICY IF EXISTS "Usuários podem ver notificações ativas" ON public.notificacoes;
DROP POLICY IF EXISTS "Usuários podem criar notificações" ON public.notificacoes;
DROP POLICY IF EXISTS "Admins e criadores podem atualizar notificações" ON public.notificacoes;
DROP POLICY IF EXISTS "Apenas admins podem excluir notificações" ON public.notificacoes;

CREATE POLICY "Usuários autenticados têm acesso total às notificações" 
  ON public.notificacoes 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. LOGS DE ATIVIDADES - Remover políticas restritivas
DROP POLICY IF EXISTS "Apenas admins podem ver logs" ON public.logs_atividades;
DROP POLICY IF EXISTS "Usuários podem criar logs" ON public.logs_atividades;
DROP POLICY IF EXISTS "Apenas admins podem modificar logs" ON public.logs_atividades;
DROP POLICY IF EXISTS "Apenas admins podem excluir logs" ON public.logs_atividades;

CREATE POLICY "Usuários autenticados têm acesso total aos logs" 
  ON public.logs_atividades 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. CONFIGURAÇÕES DE INTEGRAÇÕES - Remover políticas restritivas
DROP POLICY IF EXISTS "Apenas admins podem ver configurações de integrações" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Apenas admins podem criar configurações de integrações" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Apenas admins podem atualizar configurações de integrações" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Apenas admins podem excluir configurações de integrações" ON public.configuracoes_integracoes;

CREATE POLICY "Usuários autenticados têm acesso total às configurações de integrações" 
  ON public.configuracoes_integracoes 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. API KEYS - Remover políticas restritivas
DROP POLICY IF EXISTS "Apenas admins podem gerenciar API keys" ON public.api_keys;
CREATE POLICY "Usuários autenticados têm acesso total às API keys" 
  ON public.api_keys 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 9. LOGS EXECUÇÃO AGENTES - Manter política de leitura mas adicionar acesso total
DROP POLICY IF EXISTS "Usuários autenticados podem ver logs de execução" ON public.logs_execucao_agentes;
DROP POLICY IF EXISTS "Sistema pode inserir logs de execução" ON public.logs_execucao_agentes;

CREATE POLICY "Usuários autenticados têm acesso total aos logs de execução" 
  ON public.logs_execucao_agentes 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 10. GOOGLE CALENDAR TOKENS - Remover políticas restritivas
DROP POLICY IF EXISTS "Usuários podem gerenciar próprios tokens" ON public.google_calendar_tokens;
CREATE POLICY "Usuários autenticados têm acesso total aos tokens Google" 
  ON public.google_calendar_tokens 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 11. GOOGLE CALENDAR SETTINGS - Remover políticas restritivas
DROP POLICY IF EXISTS "Usuários podem gerenciar próprias configurações" ON public.google_calendar_settings;
CREATE POLICY "Usuários autenticados têm acesso total às configurações Google" 
  ON public.google_calendar_settings 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 12. GOOGLE CALENDAR SYNC LOGS - Remover políticas restritivas
DROP POLICY IF EXISTS "Usuários podem ver próprios logs" ON public.google_calendar_sync_logs;
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.google_calendar_sync_logs;

CREATE POLICY "Usuários autenticados têm acesso total aos logs de sincronização" 
  ON public.google_calendar_sync_logs 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 13. ZAPSIGN LOGS - Remover políticas restritivas
DROP POLICY IF EXISTS "Permitir acesso completo aos logs ZapSign" ON public.zapsign_logs;
CREATE POLICY "Usuários autenticados têm acesso total aos logs ZapSign" 
  ON public.zapsign_logs 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 14. SYSTEM SETTINGS - Remover políticas restritivas
DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;
CREATE POLICY "Usuários autenticados têm acesso total às configurações do sistema" 
  ON public.system_settings 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 15. NOTIFICATION TEMPLATES - Remover políticas restritivas
DROP POLICY IF EXISTS "Only admins can manage notification templates" ON public.notification_templates;
CREATE POLICY "Usuários autenticados têm acesso total aos templates de notificação" 
  ON public.notification_templates 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 16. API RATE LIMITS - Remover políticas restritivas
DROP POLICY IF EXISTS "Only admins can manage rate limits" ON public.api_rate_limits;
CREATE POLICY "Usuários autenticados têm acesso total aos rate limits" 
  ON public.api_rate_limits 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 17. PROFILES - Manter acesso liberal mas garantir que funcione
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;

CREATE POLICY "Usuários autenticados têm acesso total aos perfis" 
  ON public.profiles 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 18. USER ROLES - Manter acesso liberal
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver próprios roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os roles" ON public.user_roles;

CREATE POLICY "Usuários autenticados têm acesso total aos roles" 
  ON public.user_roles 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 19. ROLE PERMISSIONS - Acesso total para leitura e modificação
DROP POLICY IF EXISTS "Todos podem ler permissões" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins podem gerenciar permissões" ON public.role_permissions;

CREATE POLICY "Usuários autenticados têm acesso total às permissões" 
  ON public.role_permissions 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
