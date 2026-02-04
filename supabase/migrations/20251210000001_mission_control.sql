-- 🚀 JURIFY MISSION CONTROL - INFRAESTRUTURA DE DADOS EM TEMPO REAL
-- Criado para monitoramento ao vivo dos agentes multiagentes
-- SpaceX/NASA Grade Real-time Dashboard

-- =========================================================================
-- 1. TABELA DE EXECUÇÕES DE AGENTES (Sessions)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação da execução
  execution_id TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status da execução
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status possíveis: pending, processing, completed, failed, cancelled

  -- Agente atual
  current_agent TEXT,
  current_stage TEXT,

  -- Métricas de performance
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_duration_ms INTEGER,

  -- Agentes envolvidos
  agents_involved TEXT[] DEFAULT ARRAY[]::TEXT[],
  total_agents_used INTEGER DEFAULT 0,

  -- Contadores de tokens
  total_prompt_tokens INTEGER DEFAULT 0,
  total_completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0.0,

  -- Resultado final
  final_result JSONB,
  error_message TEXT,

  -- Metadados
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_executions_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_executions_execution_id
  ON public.agent_executions(execution_id);

CREATE INDEX IF NOT EXISTS idx_agent_executions_lead_id
  ON public.agent_executions(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_executions_tenant_id
  ON public.agent_executions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_agent_executions_status
  ON public.agent_executions(status);

CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at
  ON public.agent_executions(created_at DESC);

-- Índice composto para queries do dashboard
CREATE INDEX IF NOT EXISTS idx_agent_executions_tenant_status_date
  ON public.agent_executions(tenant_id, status, created_at DESC);

-- =========================================================================
-- 2. ATUALIZAR agent_ai_logs COM COLUNAS PARA REALTIME
-- =========================================================================

-- Adicionar execution_id para relacionar com agent_executions
ALTER TABLE public.agent_ai_logs
  ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES public.agent_executions(id) ON DELETE CASCADE;

-- Adicionar status e latência
ALTER TABLE public.agent_ai_logs
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS input_preview TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- Constraint para status
ALTER TABLE public.agent_ai_logs
  ADD CONSTRAINT IF NOT EXISTS agent_ai_logs_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Índice para execution_id
CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_execution_id
  ON public.agent_ai_logs(execution_id)
  WHERE execution_id IS NOT NULL;

-- =========================================================================
-- 3. HABILITAR SUPABASE REALTIME
-- =========================================================================

-- Habilitar realtime para agent_executions
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_executions;

-- Habilitar realtime para agent_ai_logs (se ainda não estiver)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'agent_ai_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_ai_logs;
  END IF;
END $$;

-- =========================================================================
-- 4. RLS POLICIES PARA agent_executions
-- =========================================================================

ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários podem ver execuções do seu tenant
CREATE POLICY "Users can view their tenant's executions"
  ON public.agent_executions
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- INSERT: Apenas service role e usuários autenticados
CREATE POLICY "Authenticated users can create executions"
  ON public.agent_executions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    tenant_id = (
      SELECT tenant_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- UPDATE: Apenas service role e owner
CREATE POLICY "Users can update their tenant's executions"
  ON public.agent_executions
  FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- DELETE: Apenas admins
CREATE POLICY "Admins can delete their tenant's executions"
  ON public.agent_executions
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

-- =========================================================================
-- 5. TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- =========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_executions_updated_at
  BEFORE UPDATE ON public.agent_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 6. FUNCTION PARA CALCULAR CUSTO ESTIMADO
-- =========================================================================

CREATE OR REPLACE FUNCTION calculate_execution_cost(
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER,
  p_model TEXT DEFAULT 'gpt-4o'
)
RETURNS DECIMAL AS $$
DECLARE
  v_prompt_cost DECIMAL := 0.01;  -- $0.01 per 1K tokens
  v_completion_cost DECIMAL := 0.03;  -- $0.03 per 1K tokens
BEGIN
  -- GPT-4 Turbo pricing (ajustar conforme modelo)
  IF p_model LIKE 'gpt-4%' THEN
    v_prompt_cost := 0.01;
    v_completion_cost := 0.03;
  ELSIF p_model LIKE 'gpt-3.5%' THEN
    v_prompt_cost := 0.0005;
    v_completion_cost := 0.0015;
  END IF;

  RETURN (
    (p_prompt_tokens::DECIMAL / 1000.0) * v_prompt_cost +
    (p_completion_tokens::DECIMAL / 1000.0) * v_completion_cost
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =========================================================================
-- 7. TRIGGER PARA ATUALIZAR MÉTRICAS EM agent_executions
-- =========================================================================

CREATE OR REPLACE FUNCTION update_execution_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_execution RECORD;
BEGIN
  -- Busca a execução relacionada
  SELECT * INTO v_execution
  FROM public.agent_executions
  WHERE id = NEW.execution_id;

  IF FOUND THEN
    -- Atualiza métricas agregadas
    UPDATE public.agent_executions
    SET
      total_prompt_tokens = total_prompt_tokens + COALESCE(NEW.prompt_tokens, 0),
      total_completion_tokens = total_completion_tokens + COALESCE(NEW.completion_tokens, 0),
      total_tokens = total_tokens + COALESCE(NEW.total_tokens, 0),
      estimated_cost_usd = calculate_execution_cost(
        total_prompt_tokens + COALESCE(NEW.prompt_tokens, 0),
        total_completion_tokens + COALESCE(NEW.completion_tokens, 0),
        NEW.model
      ),
      agents_involved = ARRAY(
        SELECT DISTINCT unnest(agents_involved || ARRAY[NEW.agent_name])
      ),
      total_agents_used = (
        SELECT COUNT(DISTINCT agent_name)
        FROM public.agent_ai_logs
        WHERE execution_id = NEW.execution_id
      ),
      updated_at = NOW()
    WHERE id = NEW.execution_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_execution_metrics
  AFTER INSERT ON public.agent_ai_logs
  FOR EACH ROW
  WHEN (NEW.execution_id IS NOT NULL)
  EXECUTE FUNCTION update_execution_metrics();

-- =========================================================================
-- 8. VIEW PARA DASHBOARD - EXECUÇÕES ATIVAS
-- =========================================================================

CREATE OR REPLACE VIEW public.active_executions AS
SELECT
  e.id,
  e.execution_id,
  e.lead_id,
  e.tenant_id,
  e.status,
  e.current_agent,
  e.current_stage,
  e.started_at,
  e.total_duration_ms,
  e.agents_involved,
  e.total_agents_used,
  e.total_tokens,
  e.estimated_cost_usd,
  l.name AS lead_name,
  l.email AS lead_email,
  COUNT(al.id) AS log_count,
  MAX(al.created_at) AS last_activity
FROM public.agent_executions e
LEFT JOIN public.leads l ON e.lead_id = l.id
LEFT JOIN public.agent_ai_logs al ON e.id = al.execution_id
WHERE e.status IN ('pending', 'processing')
GROUP BY e.id, e.execution_id, e.lead_id, e.tenant_id, e.status,
         e.current_agent, e.current_stage, e.started_at, e.total_duration_ms,
         e.agents_involved, e.total_agents_used, e.total_tokens,
         e.estimated_cost_usd, l.name, l.email
ORDER BY e.started_at DESC;

-- =========================================================================
-- 9. VIEW PARA DASHBOARD - MÉTRICAS EM TEMPO REAL
-- =========================================================================

CREATE OR REPLACE VIEW public.realtime_agent_metrics AS
SELECT
  tenant_id,
  agent_name,
  status,
  COUNT(*) AS execution_count,
  AVG(latency_ms) AS avg_latency_ms,
  SUM(total_tokens) AS total_tokens_used,
  MAX(created_at) AS last_execution
FROM public.agent_ai_logs
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY tenant_id, agent_name, status
ORDER BY agent_name, status;

-- =========================================================================
-- 10. COMENTÁRIOS DE DOCUMENTAÇÃO
-- =========================================================================

COMMENT ON TABLE public.agent_executions IS
  'Sessões de execução dos agentes multiagentes. Agrupa múltiplos logs de IA em uma execução completa de processamento de lead.';

COMMENT ON COLUMN public.agent_executions.execution_id IS
  'ID único da execução no formato exec_TIMESTAMP_RANDOM';

COMMENT ON COLUMN public.agent_executions.status IS
  'Status da execução: pending, processing, completed, failed, cancelled';

COMMENT ON COLUMN public.agent_executions.estimated_cost_usd IS
  'Custo estimado da execução baseado em tokens usados e modelo de IA';

COMMENT ON VIEW public.active_executions IS
  'View otimizada para o Mission Control Dashboard mostrando apenas execuções ativas';

COMMENT ON VIEW public.realtime_agent_metrics IS
  'Métricas em tempo real dos agentes (última 1 hora) para o dashboard';

-- =========================================================================
-- 11. FUNÇÃO HELPER PARA CRIAR NOVA EXECUÇÃO
-- =========================================================================

CREATE OR REPLACE FUNCTION create_agent_execution(
  p_lead_id UUID,
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_execution_id TEXT;
  v_id UUID;
BEGIN
  -- Gera execution_id único
  v_execution_id := 'exec_' ||
                    EXTRACT(EPOCH FROM NOW())::BIGINT || '_' ||
                    substr(md5(random()::text), 1, 8);

  -- Insere nova execução
  INSERT INTO public.agent_executions (
    execution_id,
    lead_id,
    tenant_id,
    user_id,
    status
  ) VALUES (
    v_execution_id,
    p_lead_id,
    p_tenant_id,
    COALESCE(p_user_id, auth.uid()),
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_agent_execution IS
  'Helper function para criar uma nova execução de agente. Retorna o UUID da execução criada.';

