-- ============================================
-- CRM Operacional: Tags System
-- ============================================

-- Tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  categoria TEXT,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nome)
);

-- Lead-Tag junction
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(lead_id, tag_id)
);

-- RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select ON public.tags FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY tags_insert ON public.tags FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY tags_update ON public.tags FOR UPDATE USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY tags_delete ON public.tags FOR DELETE USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY lead_tags_select ON public.lead_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_tags.lead_id AND leads.tenant_id = public.get_current_tenant_id())
);
CREATE POLICY lead_tags_insert ON public.lead_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_tags.lead_id AND leads.tenant_id = public.get_current_tenant_id())
);
CREATE POLICY lead_tags_delete ON public.lead_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_tags.lead_id AND leads.tenant_id = public.get_current_tenant_id())
);

-- Indexes
CREATE INDEX idx_tags_tenant ON public.tags(tenant_id);
CREATE INDEX idx_tags_categoria ON public.tags(categoria);
CREATE INDEX idx_lead_tags_lead ON public.lead_tags(lead_id);
CREATE INDEX idx_lead_tags_tag ON public.lead_tags(tag_id);

-- Seed default tags for existing tenants
INSERT INTO public.tags (tenant_id, nome, cor, categoria, ordem)
SELECT t.id, v.nome, v.cor, v.categoria, v.ordem
FROM public.tenants t
CROSS JOIN (VALUES
  ('Urgente',             '#ef4444', 'prioridade',     1),
  ('Quente',              '#f97316', 'temperatura',    2),
  ('Morno',               '#eab308', 'temperatura',    3),
  ('Frio',                '#3b82f6', 'temperatura',    4),
  ('Documento Pendente',  '#8b5cf6', 'operacional',    5),
  ('Em Análise',          '#6366f1', 'operacional',    6),
  ('Alto Potencial',      '#10b981', 'qualificacao',   7),
  ('Baixo Fit',           '#6b7280', 'qualificacao',   8),
  ('Retornar Depois',     '#f59e0b', 'acompanhamento', 9),
  ('Cliente Recorrente',  '#14b8a6', 'relacionamento', 10)
) AS v(nome, cor, categoria, ordem)
ON CONFLICT (tenant_id, nome) DO NOTHING;
