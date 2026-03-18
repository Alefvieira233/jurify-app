-- ============================================
-- CRM Operacional: Leads Expansion + Notas + Histórico
-- ============================================

-- Lead internal notes
CREATE TABLE IF NOT EXISTS public.lead_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(id),
  autor_nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  fixada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lead change history (operational audit)
CREATE TABLE IF NOT EXISTS public.lead_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id),
  usuario_nome TEXT,
  tipo_evento TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  descricao TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expand leads with operational columns
DO $$
BEGIN
  -- Only add columns that don't exist yet (some may exist from prior migrations)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'prioridade') THEN
    ALTER TABLE public.leads ADD COLUMN prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'assigned_at') THEN
    ALTER TABLE public.leads ADD COLUMN assigned_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'inactive_since') THEN
    ALTER TABLE public.leads ADD COLUMN inactive_since TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'ultima_interacao') THEN
    ALTER TABLE public.leads ADD COLUMN ultima_interacao TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'proxima_acao') THEN
    ALTER TABLE public.leads ADD COLUMN proxima_acao TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'proxima_acao_data') THEN
    ALTER TABLE public.leads ADD COLUMN proxima_acao_data TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'conexao_id') THEN
    ALTER TABLE public.leads ADD COLUMN conexao_id UUID;
  END IF;
END $$;

-- RLS for lead_notas
ALTER TABLE public.lead_notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_notas_select ON public.lead_notas FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY lead_notas_insert ON public.lead_notas FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY lead_notas_update ON public.lead_notas FOR UPDATE USING (tenant_id = public.get_current_tenant_id() AND autor_id = auth.uid());
CREATE POLICY lead_notas_delete ON public.lead_notas FOR DELETE USING (tenant_id = public.get_current_tenant_id() AND autor_id = auth.uid());

-- RLS for lead_historico (insert-only for app, read for all)
ALTER TABLE public.lead_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_historico_select ON public.lead_historico FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY lead_historico_insert ON public.lead_historico FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_notas_lead ON public.lead_notas(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notas_tenant ON public.lead_notas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_historico_lead ON public.lead_historico(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_historico_tenant ON public.lead_historico(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_historico_created ON public.lead_historico(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_prioridade ON public.leads(prioridade);
CREATE INDEX IF NOT EXISTS idx_leads_ultima_interacao ON public.leads(ultima_interacao DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leads_departamento_id ON public.leads(departamento_id);

-- Auto-record lead changes to lead_historico
CREATE OR REPLACE FUNCTION public.record_lead_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Department change
  IF OLD.departamento_id IS DISTINCT FROM NEW.departamento_id THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'departamento_alterado', 'departamento_id',
      OLD.departamento_id::TEXT, NEW.departamento_id::TEXT);
  END IF;

  -- Responsavel change
  IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'responsavel_alterado', 'responsavel_id',
      OLD.responsavel_id::TEXT, NEW.responsavel_id::TEXT);
    NEW.assigned_at := now();
  END IF;

  -- Status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'status_alterado', 'status', OLD.status, NEW.status);
  END IF;

  -- Priority change
  IF OLD.prioridade IS DISTINCT FROM NEW.prioridade THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'prioridade_alterada', 'prioridade', OLD.prioridade, NEW.prioridade);
  END IF;

  -- Archive
  IF OLD.arquivado_em IS NULL AND NEW.arquivado_em IS NOT NULL THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, descricao, metadata)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'arquivado', NEW.motivo_arquivamento,
      jsonb_build_object('motivo', NEW.motivo_arquivamento, 'data_reativacao', NEW.data_reativacao_prevista));
  END IF;

  -- Unarchive
  IF OLD.arquivado_em IS NOT NULL AND NEW.arquivado_em IS NULL THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'reativado');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_history ON public.leads;
CREATE TRIGGER trg_lead_history
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.record_lead_history();
