
-- Expandir a tabela agentes_ia para suportar configuração detalhada
ALTER TABLE public.agentes_ia 
ADD COLUMN IF NOT EXISTS descricao_funcao TEXT,
ADD COLUMN IF NOT EXISTS prompt_base TEXT,
ADD COLUMN IF NOT EXISTS tipo_agente TEXT DEFAULT 'chat_interno' CHECK (tipo_agente IN ('chat_interno', 'analise_dados', 'api_externa')),
ADD COLUMN IF NOT EXISTS parametros_avancados JSONB DEFAULT '{"temperatura": 0.7, "top_p": 0.9, "frequency_penalty": 0, "presence_penalty": 0}'::jsonb;

-- Atualizar agentes existentes para compatibilidade
UPDATE public.agentes_ia 
SET 
  descricao_funcao = objetivo,
  prompt_base = script_saudacao,
  tipo_agente = 'chat_interno'
WHERE descricao_funcao IS NULL;

-- Tornar campos obrigatórios após migração
ALTER TABLE public.agentes_ia 
ALTER COLUMN descricao_funcao SET NOT NULL,
ALTER COLUMN prompt_base SET NOT NULL;
