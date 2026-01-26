-- 🚀 JURIFY - ENHANCE AI LOGS
-- Adiciona colunas para rastreabilidade completa (estilo LangSmith)

ALTER TABLE public.agent_ai_logs
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS user_prompt TEXT,
ADD COLUMN IF NOT EXISTS full_result TEXT,
ADD COLUMN IF NOT EXISTS context JSONB;

COMMENT ON COLUMN public.agent_ai_logs.system_prompt IS 'Prompt de sistema completo enviado para a IA';
COMMENT ON COLUMN public.agent_ai_logs.user_prompt IS 'Prompt de usuário completo enviado para a IA';
COMMENT ON COLUMN public.agent_ai_logs.full_result IS 'Resposta completa da IA (sem cortes)';
COMMENT ON COLUMN public.agent_ai_logs.context IS 'Contexto adicional injetado no prompt em formato JSON';
