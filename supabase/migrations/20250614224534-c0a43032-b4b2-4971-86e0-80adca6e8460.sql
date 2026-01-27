
-- Criar enum para status das integrações
CREATE TYPE public.status_integracao AS ENUM ('ativa', 'inativa', 'erro');

-- Criar tabela de configurações de integrações
CREATE TABLE public.configuracoes_integracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_integracao TEXT NOT NULL,
  status public.status_integracao NOT NULL DEFAULT 'inativa',
  api_key TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  data_ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para otimizar consultas
CREATE INDEX idx_configuracoes_integracoes_status ON public.configuracoes_integracoes(status);
CREATE INDEX idx_configuracoes_integracoes_nome ON public.configuracoes_integracoes(nome_integracao);
CREATE INDEX idx_configuracoes_integracoes_criado_em ON public.configuracoes_integracoes(criado_em DESC);

-- Trigger para atualizar automaticamente o campo atualizado_em
CREATE TRIGGER update_configuracoes_integracoes_updated_at
  BEFORE UPDATE ON public.configuracoes_integracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.configuracoes_integracoes ENABLE ROW LEVEL SECURITY;

-- Política para leitura - apenas administradores podem ver configurações
CREATE POLICY "Apenas admins podem ver configurações de integrações" 
  ON public.configuracoes_integracoes 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'administrador'));

-- Política para criação - apenas administradores podem criar
CREATE POLICY "Apenas admins podem criar configurações de integrações" 
  ON public.configuracoes_integracoes 
  FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Política para atualização - apenas administradores podem atualizar
CREATE POLICY "Apenas admins podem atualizar configurações de integrações" 
  ON public.configuracoes_integracoes 
  FOR UPDATE 
  USING (public.has_role(auth.uid(), 'administrador'));

-- Política para exclusão - apenas administradores podem excluir
CREATE POLICY "Apenas admins podem excluir configurações de integrações" 
  ON public.configuracoes_integracoes 
  FOR DELETE 
  USING (public.has_role(auth.uid(), 'administrador'));
