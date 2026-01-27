
-- Criar tabela de contratos jurídicos
CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  nome_cliente TEXT NOT NULL,
  area_juridica TEXT NOT NULL,
  valor_causa DECIMAL(12,2) NOT NULL,
  texto_contrato TEXT NOT NULL,
  clausulas_customizadas TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'assinado', 'cancelado')),
  responsavel TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE,
  data_assinatura TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para segurança
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações
CREATE POLICY "Permitir acesso completo aos contratos" 
  ON public.contratos 
  FOR ALL 
  USING (true);

-- Inserir alguns dados de exemplo para testar o sistema
INSERT INTO public.contratos (lead_id, nome_cliente, area_juridica, valor_causa, texto_contrato, status, responsavel) VALUES
((SELECT id FROM public.leads WHERE nome_completo = 'Maria Silva Santos' LIMIT 1), 'Maria Silva Santos', 'Direito Trabalhista', 25000.00, 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nCONTRATANTE: {nome_cliente}\nÁREA: {area_juridica}\nVALOR: R$ {valor_causa}\n\nO presente contrato tem por objeto a prestação de serviços advocatícios...', 'enviado', 'Dr. Silva'),
((SELECT id FROM public.leads WHERE nome_completo = 'João Carlos Pereira' LIMIT 1), 'João Carlos Pereira', 'Direito de Família', 15000.00, 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nCONTRATANTE: {nome_cliente}\nÁREA: {area_juridica}\nVALOR: R$ {valor_causa}\n\nO presente contrato tem por objeto a prestação de serviços advocatícios...', 'assinado', 'Dra. Oliveira'),
((SELECT id FROM public.leads WHERE nome_completo = 'Ana Paula Costa' LIMIT 1), 'Ana Paula Costa', 'Direito Previdenciário', 40000.00, 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nCONTRATANTE: {nome_cliente}\nÁREA: {area_juridica}\nVALOR: R$ {valor_causa}\n\nO presente contrato tem por objeto a prestação de serviços advocatícios...', 'rascunho', 'Dr. Silva');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
