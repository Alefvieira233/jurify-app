
-- Criar tabela de agentes de IA jurídicos
CREATE TABLE public.agentes_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  area_juridica TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  script_saudacao TEXT NOT NULL,
  perguntas_qualificacao TEXT[], -- Array de perguntas
  keywords_acao TEXT[], -- Array de keywords separadas por vírgulas
  delay_resposta INTEGER DEFAULT 3, -- Em segundos
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para segurança
ALTER TABLE public.agentes_ia ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações
CREATE POLICY "Permitir acesso completo aos agentes IA" 
  ON public.agentes_ia 
  FOR ALL 
  USING (true);

-- Inserir alguns agentes de exemplo
INSERT INTO public.agentes_ia (nome, area_juridica, objetivo, script_saudacao, perguntas_qualificacao, keywords_acao, delay_resposta, status) VALUES
(
  'Sofia - Especialista Trabalhista',
  'Direito Trabalhista',
  'Captar leads e qualificar casos trabalhistas',
  'Olá! Sou a Sofia, assistente jurídica especializada em Direito Trabalhista. Estou aqui para ajudá-lo com questões relacionadas ao seu trabalho. Como posso ajudá-lo hoje?',
  ARRAY[
    'Você está enfrentando problemas no seu trabalho atual?',
    'Há quanto tempo você trabalha ou trabalhou na empresa?',
    'Você tem registro em carteira?',
    'Recebeu todas as verbas rescisórias?',
    'Qual é o valor aproximado que você acredita ter direito?'
  ],
  ARRAY['demissão', 'rescisão', 'horas extras', 'FGTS', 'verbas trabalhistas', 'assédio moral'],
  2,
  'ativo'
),
(
  'Carlos - Consultor Previdenciário',
  'Direito Previdenciário',
  'Orientar sobre aposentadorias e benefícios do INSS',
  'Oi! Eu sou o Carlos, especialista em Direito Previdenciário. Posso ajudá-lo com questões sobre aposentadoria, pensões e benefícios do INSS. Em que posso ajudá-lo?',
  ARRAY[
    'Você já contribuiu para o INSS?',
    'Por quanto tempo contribuiu?',
    'Qual sua idade atual?',
    'Já tentou se aposentar alguma vez?',
    'Tem algum benefício negado pelo INSS?'
  ],
  ARRAY['aposentadoria', 'INSS', 'benefício', 'pensão', 'auxílio-doença', 'revisão'],
  3,
  'ativo'
),
(
  'Ana - Advogada de Família',
  'Direito de Família',
  'Auxiliar em questões familiares e divórcio',
  'Olá! Sou a Ana, especialista em Direito de Família. Entendo que questões familiares podem ser delicadas. Estou aqui para orientá-lo da melhor forma. Como posso ajudá-lo?',
  ARRAY[
    'Você está passando por um processo de separação?',
    'Vocês têm filhos menores?',
    'Há bens a serem divididos?',
    'Existe acordo sobre pensão alimentícia?',
    'O processo será consensual ou litigioso?'
  ],
  ARRAY['divórcio', 'separação', 'pensão alimentícia', 'guarda', 'partilha', 'união estável'],
  2,
  'ativo'
),
(
  'Roberto - Consultor Civil',
  'Direito Civil',
  'Resolver questões contratuais e indenizações',
  'Olá! Sou o Roberto, especialista em Direito Civil. Posso ajudá-lo com contratos, indenizações e questões patrimoniais. Qual é a sua necessidade jurídica?',
  ARRAY[
    'Você tem algum contrato em disputa?',
    'Sofreu algum dano material ou moral?',
    'Precisa de elaboração de contrato?',
    'Há quanto tempo ocorreu o problema?',
    'Você tem documentos que comprovem os fatos?'
  ],
  ARRAY['contrato', 'indenização', 'danos morais', 'cobrança', 'inadimplência', 'rescisão contratual'],
  3,
  'inativo'
);

-- Trigger para atualizar updated_at nos agentes IA
CREATE TRIGGER update_agentes_ia_updated_at BEFORE UPDATE ON public.agentes_ia 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Criar view para estatísticas de leads por agente (para futura implementação)
CREATE OR REPLACE VIEW public.stats_agentes_leads AS
SELECT 
  ai.id as agente_id,
  ai.nome as agente_nome,
  COUNT(l.id) as total_leads_mes
FROM public.agentes_ia ai
LEFT JOIN public.leads l ON l.area_juridica = ai.area_juridica 
  AND l.created_at >= date_trunc('month', CURRENT_DATE)
WHERE ai.status = 'ativo'
GROUP BY ai.id, ai.nome;
