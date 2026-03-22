-- ============================================
-- Automation: Flows (React Flow) + Rules Engine
-- ============================================

-- ── 1. Automation Flows (visual workflow definitions) ──

CREATE TABLE IF NOT EXISTS public.automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'pausado', 'arquivado')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'novo_lead', 'status_alterado', 'departamento_alterado',
    'lead_quente', 'agendamento_criado', 'contrato_assinado',
    'webhook', 'manual', 'timer'
  )),
  trigger_config JSONB DEFAULT '{}'::JSONB,
  -- React Flow viewport state
  viewport JSONB DEFAULT '{"x":0,"y":0,"zoom":1}'::JSONB,
  execucoes_total INTEGER DEFAULT 0,
  ultima_execucao TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Flow Nodes (React Flow nodes) ──

CREATE TABLE IF NOT EXISTS public.automation_flow_nodes (
  id TEXT NOT NULL, -- React Flow node ID (e.g., 'trigger-1', 'action-2')
  flow_id UUID NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('trigger', 'condition', 'action', 'delay')),
  label TEXT NOT NULL,
  -- Node-specific configuration
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- React Flow position
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (flow_id, id)
);

-- ── 3. Flow Edges (React Flow connections) ──

CREATE TABLE IF NOT EXISTS public.automation_flow_edges (
  id TEXT NOT NULL, -- React Flow edge ID
  flow_id UUID NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  source_node TEXT NOT NULL,
  target_node TEXT NOT NULL,
  source_handle TEXT, -- 'yes' or 'no' for condition nodes
  label TEXT,
  PRIMARY KEY (flow_id, id)
);

-- ── 4. Automation Rules (if/then logic) ──

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'rascunho')),
  -- When this rule triggers
  evento TEXT NOT NULL CHECK (evento IN (
    'lead_criado', 'lead_atualizado', 'status_alterado',
    'departamento_alterado', 'prioridade_alterada',
    'tag_adicionada', 'tag_removida',
    'lead_arquivado', 'lead_reativado',
    'agendamento_criado', 'contrato_assinado',
    'temperatura_alterada', 'inatividade'
  )),
  -- Match logic: 'todos' (AND) or 'qualquer' (OR)
  match_logic TEXT NOT NULL DEFAULT 'todos' CHECK (match_logic IN ('todos', 'qualquer')),
  prioridade INTEGER DEFAULT 0,
  execucoes_total INTEGER DEFAULT 0,
  ultima_execucao TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. Rule Conditions ──

CREATE TABLE IF NOT EXISTS public.automation_rule_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  campo TEXT NOT NULL, -- e.g., 'status', 'prioridade', 'temperatura', 'area_juridica', 'departamento_id'
  operador TEXT NOT NULL CHECK (operador IN (
    'igual', 'diferente', 'contem', 'nao_contem',
    'maior_que', 'menor_que', 'vazio', 'nao_vazio',
    'mudou_para', 'mudou_de'
  )),
  valor TEXT, -- The value to compare against (null for 'vazio'/'nao_vazio')
  ordem INTEGER DEFAULT 0
);

-- ── 6. Rule Actions ──

CREATE TABLE IF NOT EXISTS public.automation_rule_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'enviar_whatsapp', 'enviar_email', 'atribuir_responsavel',
    'alterar_status', 'alterar_prioridade', 'adicionar_tag',
    'remover_tag', 'mover_departamento', 'criar_agendamento',
    'executar_agente', 'chamar_webhook', 'notificar_equipe'
  )),
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- config examples:
  -- enviar_whatsapp: { "template": "...", "conexao_id": "..." }
  -- alterar_status: { "novo_status": "em_qualificacao" }
  -- chamar_webhook: { "url": "https://n8n.example.com/webhook/...", "method": "POST", "headers": {} }
  -- executar_agente: { "agente_id": "..." }
  ordem INTEGER DEFAULT 0
);

-- ── 7. Automation Executions (audit trail) ──

CREATE TABLE IF NOT EXISTS public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('flow', 'rule')),
  referencia_id UUID NOT NULL, -- flow_id or rule_id
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'executando' CHECK (status IN ('executando', 'sucesso', 'erro', 'cancelado')),
  resultado JSONB DEFAULT '{}'::JSONB,
  erro TEXT,
  duracao_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 8. RLS ──

ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_flow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rule_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- Flows
CREATE POLICY flows_select ON public.automation_flows FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY flows_insert ON public.automation_flows FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY flows_update ON public.automation_flows FOR UPDATE USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY flows_delete ON public.automation_flows FOR DELETE USING (tenant_id = public.get_current_tenant_id());

-- Flow Nodes (through flow ownership)
CREATE POLICY flow_nodes_select ON public.automation_flow_nodes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.automation_flows f WHERE f.id = flow_id AND f.tenant_id = public.get_current_tenant_id()));
CREATE POLICY flow_nodes_insert ON public.automation_flow_nodes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.automation_flows f WHERE f.id = flow_id AND f.tenant_id = public.get_current_tenant_id()));
CREATE POLICY flow_nodes_update ON public.automation_flow_nodes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.automation_flows f WHERE f.id = flow_id AND f.tenant_id = public.get_current_tenant_id()));
CREATE POLICY flow_nodes_delete ON public.automation_flow_nodes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.automation_flows f WHERE f.id = flow_id AND f.tenant_id = public.get_current_tenant_id()));

-- Flow Edges (through flow ownership)
CREATE POLICY flow_edges_select ON public.automation_flow_edges FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.automation_flows f WHERE f.id = flow_id AND f.tenant_id = public.get_current_tenant_id()));
CREATE POLICY flow_edges_insert ON public.automation_flow_edges FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.automation_flows f WHERE f.id = flow_id AND f.tenant_id = public.get_current_tenant_id()));
CREATE POLICY flow_edges_update ON public.automation_flow_edges FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.automation_flows f WHERE f.id = flow_id AND f.tenant_id = public.get_current_tenant_id()));
CREATE POLICY flow_edges_delete ON public.automation_flow_edges FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.automation_flows f WHERE f.id = flow_id AND f.tenant_id = public.get_current_tenant_id()));

-- Rules
CREATE POLICY rules_select ON public.automation_rules FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY rules_insert ON public.automation_rules FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY rules_update ON public.automation_rules FOR UPDATE USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY rules_delete ON public.automation_rules FOR DELETE USING (tenant_id = public.get_current_tenant_id());

-- Rule Conditions (through rule ownership)
CREATE POLICY rule_conds_select ON public.automation_rule_conditions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND r.tenant_id = public.get_current_tenant_id()));
CREATE POLICY rule_conds_insert ON public.automation_rule_conditions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND r.tenant_id = public.get_current_tenant_id()));
CREATE POLICY rule_conds_update ON public.automation_rule_conditions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND r.tenant_id = public.get_current_tenant_id()));
CREATE POLICY rule_conds_delete ON public.automation_rule_conditions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND r.tenant_id = public.get_current_tenant_id()));

-- Rule Actions (through rule ownership)
CREATE POLICY rule_actions_select ON public.automation_rule_actions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND r.tenant_id = public.get_current_tenant_id()));
CREATE POLICY rule_actions_insert ON public.automation_rule_actions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND r.tenant_id = public.get_current_tenant_id()));
CREATE POLICY rule_actions_update ON public.automation_rule_actions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND r.tenant_id = public.get_current_tenant_id()));
CREATE POLICY rule_actions_delete ON public.automation_rule_actions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND r.tenant_id = public.get_current_tenant_id()));

-- Executions
CREATE POLICY execs_select ON public.automation_executions FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY execs_insert ON public.automation_executions FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ── 9. Indexes ──

CREATE INDEX IF NOT EXISTS idx_automation_flows_tenant ON public.automation_flows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_flows_status ON public.automation_flows(status);
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON public.automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_status ON public.automation_rules(status);
CREATE INDEX IF NOT EXISTS idx_automation_rules_evento ON public.automation_rules(evento);
CREATE INDEX IF NOT EXISTS idx_automation_executions_tenant ON public.automation_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_tipo ON public.automation_executions(tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_created ON public.automation_executions(created_at DESC);

-- ── 10. Updated_at triggers ──

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_automation_flows_updated ON public.automation_flows;
CREATE TRIGGER trg_automation_flows_updated BEFORE UPDATE ON public.automation_flows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_automation_rules_updated ON public.automation_rules;
CREATE TRIGGER trg_automation_rules_updated BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
