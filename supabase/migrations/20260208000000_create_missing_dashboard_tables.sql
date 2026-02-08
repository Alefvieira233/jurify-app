-- 🚀 JURIFY - Criar tabelas faltantes para dashboard metrics
-- Criado para resolver erros 400 no console

-- 📊 Criar tabela agent_executions (se não existir)
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  execution_id TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  current_agent TEXT,
  agents_involved TEXT[],
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🔍 Índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_executions_tenant_id ON public.agent_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON public.agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON public.agent_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_lead_id ON public.agent_executions(lead_id) WHERE lead_id IS NOT NULL;

-- 🛡️ Habilitar RLS
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

-- 🔐 Políticas de segurança
CREATE POLICY "Users can view their tenant's agent executions"
  ON public.agent_executions
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

-- 📝 Comentários
COMMENT ON TABLE public.agent_executions IS 'Execuções de agentes IA para rastreamento de processamento multiagente';

-- 📊 Criar tabela logs_execucao_agentes (legacy fallback)
CREATE TABLE IF NOT EXISTS public.logs_execucao_agentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agente_id UUID REFERENCES public.agentes_ia(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  resultado JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🔍 Índices
CREATE INDEX IF NOT EXISTS idx_logs_execucao_tenant_id ON public.logs_execucao_agentes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_execucao_agente_id ON public.logs_execucao_agentes(agente_id);
CREATE INDEX IF NOT EXISTS idx_logs_execucao_created_at ON public.logs_execucao_agentes(created_at DESC);

-- 🛡️ Habilitar RLS
ALTER TABLE public.logs_execucao_agentes ENABLE ROW LEVEL SECURITY;

-- 🔐 Políticas
CREATE POLICY "Users can view their tenant's execution logs"
  ON public.logs_execucao_agentes
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

-- 📝 Comentários
COMMENT ON TABLE public.logs_execucao_agentes IS 'Logs legados de execução de agentes (fallback para métricas)';

-- ✅ Confirmação
SELECT 'Tabelas criadas com sucesso' as status;
