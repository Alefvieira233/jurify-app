-- Tickets de Suporte
CREATE TABLE IF NOT EXISTS tickets_suporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  criador_id UUID NOT NULL REFERENCES profiles(id),
  tipo TEXT NOT NULL DEFAULT 'duvida' CHECK (tipo IN ('duvida', 'bug', 'sugestao', 'outro')),
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'fechado')),
  avaliacao INT CHECK (avaliacao BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON tickets_suporte
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tickets" ON tickets_suporte
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant tickets" ON tickets_suporte
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_tickets_suporte_tenant ON tickets_suporte(tenant_id);
CREATE INDEX idx_tickets_suporte_status ON tickets_suporte(tenant_id, status);
