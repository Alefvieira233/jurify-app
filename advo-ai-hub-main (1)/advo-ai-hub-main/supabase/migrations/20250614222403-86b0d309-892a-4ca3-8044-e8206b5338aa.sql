
-- Tabela para armazenar tokens de autenticação do Google Calendar
CREATE TABLE public.google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para configurações de integração por usuário
CREATE TABLE public.google_calendar_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  calendar_enabled BOOLEAN DEFAULT false,
  auto_sync BOOLEAN DEFAULT true,
  calendar_id TEXT,
  sync_direction TEXT DEFAULT 'jurify_to_google' CHECK (sync_direction IN ('jurify_to_google', 'google_to_jurify', 'bidirectional')),
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para log de sincronizações
CREATE TABLE public.google_calendar_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  google_event_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'sync')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  sync_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tokens (usuários só veem seus próprios tokens)
CREATE POLICY "Usuários podem gerenciar próprios tokens" ON public.google_calendar_tokens
  FOR ALL USING (user_id = auth.uid());

-- Políticas RLS para configurações
CREATE POLICY "Usuários podem gerenciar próprias configurações" ON public.google_calendar_settings
  FOR ALL USING (user_id = auth.uid());

-- Políticas RLS para logs de sincronização
CREATE POLICY "Usuários podem ver próprios logs" ON public.google_calendar_sync_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Sistema pode inserir logs" ON public.google_calendar_sync_logs
  FOR INSERT WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_google_calendar_tokens_updated_at 
  BEFORE UPDATE ON public.google_calendar_tokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendar_settings_updated_at 
  BEFORE UPDATE ON public.google_calendar_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar se token está expirado
CREATE OR REPLACE FUNCTION public.is_google_token_expired(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT expires_at < now() FROM public.google_calendar_tokens WHERE user_id = $1),
    true
  )
$$;

-- Função para obter configurações do usuário
CREATE OR REPLACE FUNCTION public.get_user_calendar_settings(user_id UUID)
RETURNS TABLE(
  calendar_enabled BOOLEAN,
  auto_sync BOOLEAN,
  calendar_id TEXT,
  sync_direction TEXT,
  notification_enabled BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(gcs.calendar_enabled, false),
    COALESCE(gcs.auto_sync, true),
    gcs.calendar_id,
    COALESCE(gcs.sync_direction, 'jurify_to_google'),
    COALESCE(gcs.notification_enabled, true)
  FROM public.google_calendar_settings gcs
  WHERE gcs.user_id = $1
  UNION ALL
  SELECT false, true, NULL, 'jurify_to_google', true
  WHERE NOT EXISTS (SELECT 1 FROM public.google_calendar_settings WHERE user_id = $1)
  LIMIT 1
$$;
