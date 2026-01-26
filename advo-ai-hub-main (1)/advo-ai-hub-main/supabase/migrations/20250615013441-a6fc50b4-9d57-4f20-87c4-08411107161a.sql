
-- Criar tabela para configurações do sistema
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  category TEXT NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Criar tabela para templates de notificações
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  template TEXT NOT NULL,
  event_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  roles_enabled TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Criar tabela para configurações de rate limiting
CREATE TABLE public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  daily_limit INTEGER DEFAULT 1000,
  current_usage INTEGER DEFAULT 0,
  reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem acessar
CREATE POLICY "Only admins can manage system settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'administrador' 
      AND ur.ativo = true
    )
  );

CREATE POLICY "Only admins can manage notification templates" ON public.notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'administrador' 
      AND ur.ativo = true
    )
  );

CREATE POLICY "Only admins can manage rate limits" ON public.api_rate_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'administrador' 
      AND ur.ativo = true
    )
  );

-- Inserir configurações padrão do sistema
INSERT INTO public.system_settings (key, value, category, description, is_sensitive) VALUES
('session_timeout', '3600', 'sistema', 'Tempo de expiração da sessão em segundos', false),
('smtp_host', '', 'email', 'Servidor SMTP para envio de emails', false),
('smtp_port', '587', 'email', 'Porta do servidor SMTP', false),
('smtp_user', '', 'email', 'Usuário SMTP', false),
('smtp_password', '', 'email', 'Senha SMTP', true),
('google_client_id', '', 'integracoes', 'Client ID do Google Calendar', true),
('google_client_secret', '', 'integracoes', 'Client Secret do Google Calendar', true),
('zapsign_token', '', 'integracoes', 'Token da API ZapSign', true),
('whatsapp_endpoint', '', 'integracoes', 'Endpoint da API WhatsApp', false),
('whatsapp_token', '', 'integracoes', 'Token da API WhatsApp', true),
('openai_model', 'gpt-4o-mini', 'ai', 'Modelo padrão da OpenAI', false),
('anthropic_model', 'claude-3-haiku-20240307', 'ai', 'Modelo padrão da Anthropic', false);

-- Inserir templates padrão de notificações
INSERT INTO public.notification_templates (name, title, template, event_type, roles_enabled) VALUES
('novo_lead', 'Novo Lead Cadastrado', 'Um novo lead foi cadastrado: {nome_lead}. Responsável: {responsavel}', 'lead_created', ARRAY['administrador', 'comercial']),
('novo_contrato', 'Novo Contrato Gerado', 'Um novo contrato foi gerado para o cliente {cliente}. Valor: R$ {valor}', 'contract_created', ARRAY['administrador', 'advogado', 'pos_venda']),
('novo_agendamento', 'Novo Agendamento', 'Novo agendamento criado para {data_hora} com {responsavel}', 'appointment_created', ARRAY['administrador', 'advogado', 'pos_venda']);

-- Triggers para updated_at
CREATE TRIGGER update_system_settings_updated_at 
  BEFORE UPDATE ON public.system_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
  BEFORE UPDATE ON public.notification_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_rate_limits_updated_at 
  BEFORE UPDATE ON public.api_rate_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para buscar configurações do sistema
CREATE OR REPLACE FUNCTION public.get_system_setting(_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value
  FROM system_settings
  WHERE key = _key
$$;

-- Função para atualizar configurações do sistema
CREATE OR REPLACE FUNCTION public.update_system_setting(_key TEXT, _value TEXT, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE system_settings 
  SET value = _value, updated_by = _user_id, updated_at = now()
  WHERE key = _key;
  
  RETURN FOUND;
END;
$$;
