
-- Criar tabela de agendamentos de reuniões jurídicas
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  area_juridica TEXT NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'realizado', 'cancelado')),
  observacoes TEXT,
  google_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para segurança
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações
CREATE POLICY "Permitir acesso completo aos agendamentos" 
  ON public.agendamentos 
  FOR ALL 
  USING (true);

-- Inserir alguns dados de exemplo para testar o sistema
INSERT INTO public.agendamentos (lead_id, area_juridica, data_hora, responsavel, status, observacoes) VALUES
((SELECT id FROM public.leads WHERE nome_completo = 'Maria Silva Santos' LIMIT 1), 'Direito Trabalhista', '2025-06-16 14:00:00+00', 'Dr. Silva', 'agendado', 'Primeira consulta sobre processo trabalhista'),
((SELECT id FROM public.leads WHERE nome_completo = 'João Carlos Pereira' LIMIT 1), 'Direito de Família', '2025-06-17 10:30:00+00', 'Dra. Oliveira', 'confirmado', 'Reunião para discussão sobre divórcio'),
((SELECT id FROM public.leads WHERE nome_completo = 'Ana Paula Costa' LIMIT 1), 'Direito Previdenciário', '2025-06-18 16:00:00+00', 'Dr. Silva', 'realizado', 'Consultoria sobre aposentadoria'),
((SELECT id FROM public.leads WHERE nome_completo = 'Carlos Eduardo Mendes' LIMIT 1), 'Direito Civil', '2025-06-19 09:00:00+00', 'Dra. Oliveira', 'agendado', 'Análise de contrato de compra e venda');

-- Trigger para atualizar updated_at nos agendamentos
CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON public.agendamentos 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
