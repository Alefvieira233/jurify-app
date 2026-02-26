-- ============================================================================
-- RLS PERFORMANCE INDEXES
-- 
-- Índices BTREE otimizados para tenant_id nas tabelas core.
-- Elimina full table scans nas policies RLS.
-- Resultado esperado: queries RLS de O(n) para O(1)
-- ============================================================================

-- 1. Função helper para tenant lookup (cached, sem subquery)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_tenant_id IS 'Cached tenant_id lookup for RLS policies — avoids repeated subqueries';

-- 2. Índices BTREE compostos para tabelas core com tenant_id
-- BTREE é superior a GIN para UUID lookups simples
DO $$
DECLARE
  _tables TEXT[] := ARRAY[
    'leads', 'contratos', 'agendamentos', 'notificacoes',
    'agent_ai_logs', 'agent_executions', 'agentes_ia',
    'logs_execucao_agentes', 'whatsapp_conversations',
    'lead_interactions', 'automation_tasks', 'reminders',
    'recurring_events'
  ];
  _t TEXT;
  _idx_name TEXT;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    -- Só cria se a tabela e coluna existirem
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = _t AND column_name = 'tenant_id'
    ) THEN
      _idx_name := 'idx_' || _t || '_tenant_btree';
      
      -- Drop e recria para garantir índice correto
      EXECUTE format('DROP INDEX IF EXISTS public.%I', _idx_name);
      EXECUTE format(
        'CREATE INDEX %I ON public.%I USING BTREE (tenant_id)',
        _idx_name, _t
      );
    END IF;
  END LOOP;
END;
$$;

-- 3. Índices compostos para queries frequentes do dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_status
  ON public.leads(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_created
  ON public.leads(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_area
  ON public.leads(tenant_id, area_juridica);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contratos_tenant_status
  ON public.contratos(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contratos_tenant_created
  ON public.contratos(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_tenant_data
  ON public.agendamentos(tenant_id, data_hora);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_tenant_status
  ON public.agendamentos(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_tenant_created
  ON public.agent_executions(tenant_id, created_at DESC);

-- 4. Índice para profiles lookup (usado em TODA policy RLS)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id_tenant
  ON public.profiles(id, tenant_id);

-- 5. Índice parcial para leads ativos (dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_active
  ON public.leads(tenant_id, created_at DESC)
  WHERE status NOT IN ('perdido', 'arquivado');

-- 6. Índice parcial para agendamentos futuros
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_future
  ON public.agendamentos(tenant_id, data_hora)
  WHERE data_hora >= now() - interval '1 day';

COMMENT ON FUNCTION public.current_tenant_id IS 'O(1) tenant lookup for RLS — replaces repeated subqueries in policies';
