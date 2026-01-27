
-- Adicionar campo status_assinatura na tabela contratos
ALTER TABLE public.contratos 
ADD COLUMN status_assinatura TEXT DEFAULT 'pendente' CHECK (status_assinatura IN ('pendente', 'assinado', 'cancelado', 'expirado')),
ADD COLUMN link_assinatura_zapsign TEXT,
ADD COLUMN zapsign_document_id TEXT,
ADD COLUMN data_geracao_link TIMESTAMP WITH TIME ZONE,
ADD COLUMN data_envio_whatsapp TIMESTAMP WITH TIME ZONE;

-- Criar tabela para logs de integração ZapSign
CREATE TABLE public.zapsign_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  evento TEXT NOT NULL CHECK (evento IN ('link_gerado', 'enviado_whatsapp', 'assinado', 'cancelado', 'erro')),
  dados_evento JSONB,
  data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para segurança
ALTER TABLE public.zapsign_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso completo aos logs
CREATE POLICY "Permitir acesso completo aos logs ZapSign" 
  ON public.zapsign_logs 
  FOR ALL 
  USING (true);

-- Trigger para atualizar updated_at nos contratos
CREATE TRIGGER update_contratos_updated_at_zapsign BEFORE UPDATE ON public.contratos 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para zapsign_logs
CREATE TRIGGER update_zapsign_logs_updated_at BEFORE UPDATE ON public.zapsign_logs 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
