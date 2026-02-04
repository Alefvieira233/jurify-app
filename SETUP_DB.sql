-- 🚀 JURIFY - SETUP COMPLETO DO BANCO DE DADOS
-- Copie e cole todo este conteúdo no SQL Editor do Supabase para deixar o sistema 100%

-- =========================================================================
-- 1. TABELAS DO MISSION CONTROL (Novas)
-- =========================================================================

-- Tabela de Execuções (Sessões)
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_agent TEXT,
  current_stage TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_duration_ms INTEGER,
  agents_involved TEXT[] DEFAULT ARRAY[]::TEXT[],
  total_agents_used INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Logs de IA
CREATE TABLE IF NOT EXISTS public.agent_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES public.agent_executions(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  model TEXT DEFAULT 'gpt-4o',
  status TEXT DEFAULT 'completed',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER,
  result_preview TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- 2. HABILITAR REALTIME (Para o Dashboard funcionar ao vivo)
-- =========================================================================

-- Adicionar tabelas à publicação realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agent_executions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_executions;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agent_ai_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_ai_logs;
  END IF;
END $$;

-- =========================================================================
-- 3. POLÍTICAS DE SEGURANÇA (RLS)
-- =========================================================================

ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_ai_logs ENABLE ROW LEVEL SECURITY;

-- Permitir tudo para usuários autenticados (Modo Desenvolvimento/Teste)
CREATE POLICY "Acesso total autenticado execucoes" ON public.agent_executions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Acesso total autenticado logs" ON public.agent_ai_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- =========================================================================
-- 4. VIEW PARA MÉTRICAS (Opcional, mas bom para performance)
-- =========================================================================

CREATE OR REPLACE VIEW public.active_executions_view AS
SELECT 
  e.*,
  l.nome as lead_nome,
  l.email as lead_email
FROM public.agent_executions e
LEFT JOIN public.leads l ON e.lead_id = l.id
WHERE e.status IN ('pending', 'processing');

