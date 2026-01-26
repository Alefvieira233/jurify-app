
-- Criar tabela de leads com todas as informações necessárias
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  area_juridica TEXT NOT NULL,
  origem TEXT NOT NULL,
  valor_causa DECIMAL(12,2),
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo_lead',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para segurança
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (ajustar conforme necessário quando implementar autenticação)
CREATE POLICY "Permitir acesso completo aos leads" 
  ON public.leads 
  FOR ALL 
  USING (true);

-- Inserir alguns dados de exemplo para testar o pipeline
INSERT INTO public.leads (nome_completo, telefone, email, area_juridica, origem, valor_causa, responsavel, status) VALUES
('Maria Silva Santos', '(11) 99999-1234', 'maria.silva@email.com', 'Direito Trabalhista', 'Facebook Ads', 25000.00, 'IA Jurídica', 'novo_lead'),
('João Carlos Pereira', '(11) 99999-5678', 'joao.carlos@email.com', 'Direito de Família', 'Google Ads', 15000.00, 'Dr. Silva', 'em_qualificacao'),
('Ana Paula Costa', '(11) 99999-9012', 'ana.paula@email.com', 'Direito Previdenciário', 'Instagram', 40000.00, 'Dra. Oliveira', 'proposta_enviada'),
('Carlos Eduardo Mendes', '(11) 99999-3456', 'carlos.mendes@email.com', 'Direito Civil', 'Site', 60000.00, 'Dr. Silva', 'contrato_assinado'),
('Fernanda Lima', '(11) 99999-7890', 'fernanda.lima@email.com', 'Direito Trabalhista', 'Facebook Ads', 30000.00, 'IA Jurídica', 'em_atendimento'),
('Roberto Santos', '(11) 99999-2468', 'roberto.santos@email.com', 'Direito Civil', 'Google Ads', 20000.00, 'Dr. Silva', 'lead_perdido');
