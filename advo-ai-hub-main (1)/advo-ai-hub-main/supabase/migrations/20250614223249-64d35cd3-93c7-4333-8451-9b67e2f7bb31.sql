
-- Criar enum para tipos de notificação
CREATE TYPE public.notification_type AS ENUM ('info', 'alerta', 'sucesso', 'erro');

-- Criar tabela de notificações
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo public.notification_type NOT NULL DEFAULT 'info',
  lido_por UUID[] DEFAULT ARRAY[]::UUID[],
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Política para leitura - todos os usuários autenticados podem ver notificações ativas
CREATE POLICY "Usuários podem ver notificações ativas" 
  ON public.notificacoes 
  FOR SELECT 
  USING (ativo = true);

-- Política para criação - qualquer usuário autenticado pode criar notificações
CREATE POLICY "Usuários podem criar notificações" 
  ON public.notificacoes 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para atualização - apenas administradores ou criador da notificação
CREATE POLICY "Admins e criadores podem atualizar notificações" 
  ON public.notificacoes 
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR 
    public.has_role(auth.uid(), 'administrador')
  );

-- Política para exclusão - apenas administradores
CREATE POLICY "Apenas admins podem excluir notificações" 
  ON public.notificacoes 
  FOR DELETE 
  USING (public.has_role(auth.uid(), 'administrador'));

-- Trigger para updated_at
CREATE TRIGGER update_notificacoes_updated_at 
  BEFORE UPDATE ON public.notificacoes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION public.marcar_notificacao_lida(notificacao_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notificacoes 
  SET lido_por = array_append(lido_por, user_id)
  WHERE id = notificacao_id 
    AND NOT (user_id = ANY(lido_por));
  
  RETURN FOUND;
END;
$$;

-- Função para marcar todas as notificações como lidas para um usuário
CREATE OR REPLACE FUNCTION public.marcar_todas_lidas(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_updated INTEGER;
BEGIN
  UPDATE public.notificacoes 
  SET lido_por = array_append(lido_por, user_id)
  WHERE ativo = true 
    AND NOT (user_id = ANY(lido_por));
  
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RETURN count_updated;
END;
$$;

-- Função para contar notificações não lidas de um usuário
CREATE OR REPLACE FUNCTION public.contar_nao_lidas(user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.notificacoes 
  WHERE ativo = true 
    AND NOT (user_id = ANY(lido_por))
$$;
