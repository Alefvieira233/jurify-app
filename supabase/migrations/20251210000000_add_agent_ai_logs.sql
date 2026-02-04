-- 🚀 JURIFY - TABELA DE LOGS DE IA DOS AGENTES
-- Criado para rastrear todas as chamadas de IA dos agentes multiagentes
-- Segurança: Enterprise Grade com RLS

-- 📊 Criar tabela de logs de IA
CREATE TABLE IF NOT EXISTS public.agent_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  agent_name TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Informações da requisição
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- Resultado (preview)
  result_preview TEXT,

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Índices para queries eficientes
  CONSTRAINT agent_ai_logs_tokens_check CHECK (
    prompt_tokens >= 0 AND
    completion_tokens >= 0 AND
    total_tokens >= 0
  )
);

-- 🔍 Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_agent_name
  ON public.agent_ai_logs(agent_name);

CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_lead_id
  ON public.agent_ai_logs(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_tenant_id
  ON public.agent_ai_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_created_at
  ON public.agent_ai_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_user_id
  ON public.agent_ai_logs(user_id)
  WHERE user_id IS NOT NULL;

-- Índice composto para analytics
CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_tenant_agent_date
  ON public.agent_ai_logs(tenant_id, agent_name, created_at DESC);

-- 🛡️ Habilitar RLS
ALTER TABLE public.agent_ai_logs ENABLE ROW LEVEL SECURITY;

-- 🔐 Políticas de segurança

-- SELECT: Usuários podem ver logs do seu tenant
CREATE POLICY "Users can view their tenant's AI logs"
  ON public.agent_ai_logs
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- INSERT: Apenas service role pode inserir (Edge Functions)
CREATE POLICY "Service role can insert AI logs"
  ON public.agent_ai_logs
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Ninguém atualiza logs (imutável)
-- DELETE: Apenas admins do tenant podem deletar

CREATE POLICY "Admins can delete their tenant's AI logs"
  ON public.agent_ai_logs
  FOR DELETE
  USING (
    tenant_id = (
      SELECT tenant_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 📊 Criar view materializada para analytics rápido
CREATE MATERIALIZED VIEW IF NOT EXISTS public.agent_ai_logs_stats AS
SELECT
  tenant_id,
  agent_name,
  model,
  DATE_TRUNC('day', created_at) AS date,
  COUNT(*) AS total_calls,
  SUM(total_tokens) AS total_tokens_used,
  AVG(total_tokens) AS avg_tokens_per_call,
  SUM(prompt_tokens) AS total_prompt_tokens,
  SUM(completion_tokens) AS total_completion_tokens
FROM public.agent_ai_logs
GROUP BY tenant_id, agent_name, model, DATE_TRUNC('day', created_at);

-- Índice na materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_ai_logs_stats_unique
  ON public.agent_ai_logs_stats(tenant_id, agent_name, model, date);

CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_stats_tenant_date
  ON public.agent_ai_logs_stats(tenant_id, date DESC);

-- 🔄 Trigger para refresh automático da view (daily)
CREATE OR REPLACE FUNCTION refresh_agent_ai_logs_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.agent_ai_logs_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger após inserção
CREATE TRIGGER trigger_refresh_agent_ai_logs_stats
  AFTER INSERT ON public.agent_ai_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_agent_ai_logs_stats();

-- 🧹 Política de retenção de dados (LGPD compliance)
-- Logs de IA são mantidos por 90 dias
CREATE OR REPLACE FUNCTION cleanup_old_agent_ai_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.agent_ai_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📝 Comentários para documentação
COMMENT ON TABLE public.agent_ai_logs IS
  'Logs de todas as chamadas de IA realizadas pelos agentes multiagentes. Usado para auditoria, analytics e otimização de custos.';

COMMENT ON COLUMN public.agent_ai_logs.agent_name IS
  'Nome do agente que fez a requisição (Coordenador, Qualificador, Juridico, etc)';

COMMENT ON COLUMN public.agent_ai_logs.result_preview IS
  'Preview (primeiros 200 caracteres) do resultado da IA para auditoria rápida';

COMMENT ON MATERIALIZED VIEW public.agent_ai_logs_stats IS
  'View materializada com estatísticas agregadas de uso de IA por agente, tenant e dia. Refreshada automaticamente após inserções.';

