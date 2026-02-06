-- ===================================================
-- JURIFY - DOCUMENT HASH (Blockchain-Ready Integrity)
-- ===================================================
-- Verificação de integridade de documentos via SHA-256.
-- Cada documento/contrato recebe um hash único no upload.
-- Permite verificação de autenticidade e preparação para
-- registro futuro em blockchain.
-- Data: 2026-02-06
-- ===================================================

-- 🔐 Tabela de Hashes de Documentos
CREATE TABLE IF NOT EXISTS document_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'contract',
  -- document_type: 'contract' | 'petition' | 'evidence' | 'power_of_attorney' | 'report' | 'other'
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  content_hash TEXT NOT NULL,
  -- SHA-256 hash do conteúdo do arquivo
  hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  storage_path TEXT,
  -- Caminho no Supabase Storage
  signed_by TEXT,
  -- ID do usuário que fez upload
  verified_at TIMESTAMPTZ,
  -- Quando foi verificado pela última vez
  verification_count INT NOT NULL DEFAULT 0,
  blockchain_tx_id TEXT,
  -- ID da transação em blockchain (futuro)
  blockchain_network TEXT,
  -- Nome da rede blockchain (futuro)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📊 Índices
CREATE INDEX IF NOT EXISTS idx_document_hashes_tenant_id
  ON document_hashes(tenant_id);

CREATE INDEX IF NOT EXISTS idx_document_hashes_content_hash
  ON document_hashes(content_hash);

CREATE INDEX IF NOT EXISTS idx_document_hashes_document_type
  ON document_hashes(document_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_hashes_unique_hash_tenant
  ON document_hashes(tenant_id, content_hash);

-- 🔒 RLS
ALTER TABLE document_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view hashes from their tenant"
  ON document_hashes FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert hashes for their tenant"
  ON document_hashes FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update hashes from their tenant"
  ON document_hashes FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access on document_hashes"
  ON document_hashes FOR ALL
  USING (auth.role() = 'service_role');

-- 🔄 Trigger para updated_at
CREATE OR REPLACE FUNCTION update_document_hashes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_hashes_timestamp
  BEFORE UPDATE ON document_hashes
  FOR EACH ROW
  EXECUTE FUNCTION update_document_hashes_timestamp();

-- 🔍 Função RPC: Verificar integridade de um documento
CREATE OR REPLACE FUNCTION verify_document_hash(
  p_tenant_id UUID,
  p_content_hash TEXT
)
RETURNS TABLE (
  id UUID,
  document_type TEXT,
  original_filename TEXT,
  signed_by TEXT,
  created_at TIMESTAMPTZ,
  verified BOOLEAN
) AS $$
BEGIN
  -- Atualiza contagem de verificações
  UPDATE document_hashes dh
  SET verified_at = NOW(),
      verification_count = dh.verification_count + 1
  WHERE dh.tenant_id = p_tenant_id
    AND dh.content_hash = p_content_hash;

  RETURN QUERY
  SELECT
    dh.id,
    dh.document_type,
    dh.original_filename,
    dh.signed_by,
    dh.created_at,
    TRUE AS verified
  FROM document_hashes dh
  WHERE dh.tenant_id = p_tenant_id
    AND dh.content_hash = p_content_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📝 Comentários
COMMENT ON TABLE document_hashes IS 'Hashes SHA-256 de documentos para verificação de integridade (blockchain-ready)';
COMMENT ON COLUMN document_hashes.content_hash IS 'Hash SHA-256 do conteúdo binário do arquivo';
COMMENT ON COLUMN document_hashes.blockchain_tx_id IS 'ID da transação em blockchain (para registro futuro)';
