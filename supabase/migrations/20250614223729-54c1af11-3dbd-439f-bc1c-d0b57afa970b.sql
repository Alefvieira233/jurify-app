
-- Criar enum para tipos de ação
CREATE TYPE public.tipo_acao AS ENUM ('criacao', 'edicao', 'exclusao', 'login', 'logout', 'erro', 'outro');

-- Criar tabela de logs de atividades
CREATE TABLE public.logs_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.profiles(id) NOT NULL,
  nome_usuario TEXT NOT NULL,
  tipo_acao public.tipo_acao NOT NULL,
  modulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_usuario TEXT,
  detalhes_adicionais JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para otimizar consultas
CREATE INDEX idx_logs_atividades_usuario_id ON public.logs_atividades(usuario_id);
CREATE INDEX idx_logs_atividades_data_hora ON public.logs_atividades(data_hora DESC);
CREATE INDEX idx_logs_atividades_tipo_acao ON public.logs_atividades(tipo_acao);
CREATE INDEX idx_logs_atividades_modulo ON public.logs_atividades(modulo);

-- Habilitar RLS
ALTER TABLE public.logs_atividades ENABLE ROW LEVEL SECURITY;

-- Política para leitura - apenas administradores podem ver logs
CREATE POLICY "Apenas admins podem ver logs" 
  ON public.logs_atividades 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'administrador'));

-- Política para criação - qualquer usuário autenticado pode criar logs
CREATE POLICY "Usuários podem criar logs" 
  ON public.logs_atividades 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para atualização e exclusão - apenas administradores
CREATE POLICY "Apenas admins podem modificar logs" 
  ON public.logs_atividades 
  FOR UPDATE 
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Apenas admins podem excluir logs" 
  ON public.logs_atividades 
  FOR DELETE 
  USING (public.has_role(auth.uid(), 'administrador'));

-- Função para registrar log de atividade
CREATE OR REPLACE FUNCTION public.registrar_log_atividade(
  _usuario_id UUID,
  _nome_usuario TEXT,
  _tipo_acao public.tipo_acao,
  _modulo TEXT,
  _descricao TEXT,
  _ip_usuario TEXT DEFAULT NULL,
  _detalhes_adicionais JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.logs_atividades (
    usuario_id,
    nome_usuario,
    tipo_acao,
    modulo,
    descricao,
    ip_usuario,
    detalhes_adicionais
  ) VALUES (
    _usuario_id,
    _nome_usuario,
    _tipo_acao,
    _modulo,
    _descricao,
    _ip_usuario,
    _detalhes_adicionais
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Função para buscar logs com filtros
CREATE OR REPLACE FUNCTION public.buscar_logs_atividades(
  _limite INTEGER DEFAULT 50,
  _offset INTEGER DEFAULT 0,
  _usuario_id UUID DEFAULT NULL,
  _tipo_acao public.tipo_acao DEFAULT NULL,
  _modulo TEXT DEFAULT NULL,
  _data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  _data_fim TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  usuario_id UUID,
  nome_usuario TEXT,
  tipo_acao public.tipo_acao,
  modulo TEXT,
  descricao TEXT,
  data_hora TIMESTAMP WITH TIME ZONE,
  ip_usuario TEXT,
  detalhes_adicionais JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.usuario_id,
    la.nome_usuario,
    la.tipo_acao,
    la.modulo,
    la.descricao,
    la.data_hora,
    la.ip_usuario,
    la.detalhes_adicionais,
    COUNT(*) OVER() as total_count
  FROM public.logs_atividades la
  WHERE 
    (_usuario_id IS NULL OR la.usuario_id = _usuario_id) AND
    (_tipo_acao IS NULL OR la.tipo_acao = _tipo_acao) AND
    (_modulo IS NULL OR la.modulo ILIKE '%' || _modulo || '%') AND
    (_data_inicio IS NULL OR la.data_hora >= _data_inicio) AND
    (_data_fim IS NULL OR la.data_hora <= _data_fim)
  ORDER BY la.data_hora DESC
  LIMIT _limite
  OFFSET _offset;
END;
$$;
