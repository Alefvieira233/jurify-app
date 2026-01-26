
-- Criar tabela para API Keys
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  key_value TEXT NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para logs de execução dos agentes
CREATE TABLE public.logs_execucao_agentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID REFERENCES public.agentes_ia(id),
  input_recebido TEXT NOT NULL,
  resposta_ia TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('success', 'error', 'processing')),
  tempo_execucao INTEGER, -- em milissegundos
  erro_detalhes TEXT,
  api_key_usado TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para otimização
CREATE INDEX idx_api_keys_key_value ON public.api_keys(key_value);
CREATE INDEX idx_api_keys_ativo ON public.api_keys(ativo);
CREATE INDEX idx_logs_execucao_agente_id ON public.logs_execucao_agentes(agente_id);
CREATE INDEX idx_logs_execucao_status ON public.logs_execucao_agentes(status);
CREATE INDEX idx_logs_execucao_created_at ON public.logs_execucao_agentes(created_at DESC);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para API Keys (apenas admins)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem gerenciar API keys" 
  ON public.api_keys 
  FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- RLS para logs de execução (podem ser vistos por todos usuários autenticados)
ALTER TABLE public.logs_execucao_agentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver logs de execução" 
  ON public.logs_execucao_agentes 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode inserir logs de execução" 
  ON public.logs_execucao_agentes 
  FOR INSERT 
  WITH CHECK (true);

-- Função para validar API Key
CREATE OR REPLACE FUNCTION public.validar_api_key(_key_value TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.api_keys 
    WHERE key_value = _key_value 
      AND ativo = true
  )
$$;

-- Função para buscar agente por ID
CREATE OR REPLACE FUNCTION public.buscar_agente_para_execucao(_agente_id UUID)
RETURNS TABLE(
  id UUID,
  nome TEXT,
  descricao_funcao TEXT,
  prompt_base TEXT,
  tipo_agente TEXT,
  status TEXT,
  parametros_avancados JSONB
)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT 
    a.id,
    a.nome,
    a.descricao_funcao,
    a.prompt_base,
    a.tipo_agente,
    a.status,
    a.parametros_avancados
  FROM public.agentes_ia a
  WHERE a.id = _agente_id 
    AND a.status = 'ativo'
$$;
