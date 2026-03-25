-- Tarefas (Task Management)
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prazo TIMESTAMPTZ,
  pontos INT CHECK (pontos IN (1, 2, 3, 5, 8, 13)),
  responsavel_id UUID REFERENCES profiles(id),
  criador_id UUID NOT NULL REFERENCES profiles(id),
  lead_id UUID REFERENCES leads(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON tarefas
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tarefas" ON tarefas
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant tarefas" ON tarefas
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own tenant tarefas" ON tarefas
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_tarefas_tenant ON tarefas(tenant_id);
CREATE INDEX idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX idx_tarefas_status ON tarefas(tenant_id, status);
CREATE INDEX idx_tarefas_prazo ON tarefas(tenant_id, prazo);
