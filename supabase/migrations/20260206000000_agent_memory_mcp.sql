-- ===================================================
-- JURIFY - AGENT MEMORY (MCP - Model Context Protocol)
-- ===================================================
-- Memória de longo prazo para agentes. Permite que agentes
-- "lembrem" de interações anteriores com leads, decisões
-- tomadas e contexto acumulado entre sessões.
-- Data: 2026-02-06
-- ===================================================

-- 🧠 Tabela de Memória dos Agentes
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'conversation',
  -- memory_type: 'conversation' | 'decision' | 'preference' | 'fact' | 'summary'
  content TEXT NOT NULL,
  embedding vector(1536),
  importance SMALLINT NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  -- importance: 1 = trivial, 10 = critical
  access_count INT NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📊 Índices de Performance
CREATE INDEX IF NOT EXISTS idx_agent_memory_tenant_id
  ON agent_memory(tenant_id);

CREATE INDEX IF NOT EXISTS idx_agent_memory_lead_id
  ON agent_memory(lead_id);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_name
  ON agent_memory(agent_name);

CREATE INDEX IF NOT EXISTS idx_agent_memory_type
  ON agent_memory(memory_type);

CREATE INDEX IF NOT EXISTS idx_agent_memory_importance
  ON agent_memory(importance DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_created_at
  ON agent_memory(created_at DESC);

-- Índice vetorial para busca por similaridade
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding
  ON agent_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 🔒 RLS
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memory from their tenant"
  ON agent_memory FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert memory for their tenant"
  ON agent_memory FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update memory from their tenant"
  ON agent_memory FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete memory from their tenant"
  ON agent_memory FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Service role pode acessar tudo (para Edge Functions)
CREATE POLICY "Service role full access on agent_memory"
  ON agent_memory FOR ALL
  USING (auth.role() = 'service_role');

-- 🔄 Trigger para updated_at
CREATE OR REPLACE FUNCTION update_agent_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_memory_timestamp
  BEFORE UPDATE ON agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();

-- 🔍 Função RPC para busca semântica de memórias
CREATE OR REPLACE FUNCTION search_agent_memory(
  query_embedding vector(1536),
  p_tenant_id UUID,
  p_lead_id UUID DEFAULT NULL,
  p_agent_name TEXT DEFAULT NULL,
  p_memory_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  agent_name TEXT,
  memory_type TEXT,
  content TEXT,
  importance SMALLINT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.agent_name,
    am.memory_type,
    am.content,
    am.importance,
    1 - (am.embedding <=> query_embedding) AS similarity,
    am.metadata,
    am.created_at
  FROM agent_memory am
  WHERE am.tenant_id = p_tenant_id
    AND (p_lead_id IS NULL OR am.lead_id = p_lead_id)
    AND (p_agent_name IS NULL OR am.agent_name = p_agent_name)
    AND (p_memory_type IS NULL OR am.memory_type = p_memory_type)
    AND am.embedding IS NOT NULL
    AND 1 - (am.embedding <=> query_embedding) >= p_threshold
    AND (am.expires_at IS NULL OR am.expires_at > NOW())
  ORDER BY similarity DESC, am.importance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📝 Comentários
COMMENT ON TABLE agent_memory IS 'Memória de longo prazo dos agentes (MCP). Permite que agentes lembrem de interações anteriores.';
COMMENT ON COLUMN agent_memory.memory_type IS 'Tipo: conversation, decision, preference, fact, summary';
COMMENT ON COLUMN agent_memory.importance IS 'Importância de 1 (trivial) a 10 (crítico). Memórias mais importantes são priorizadas na busca.';
COMMENT ON COLUMN agent_memory.embedding IS 'Embedding vetorial para busca semântica (text-embedding-3-small, 1536 dims)';
