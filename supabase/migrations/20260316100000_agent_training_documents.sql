-- =============================================================================
-- Agent Training Documents - Tracking table for knowledge base uploads
-- The actual embeddings are stored in the existing `documents` table (pgvector)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_training_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,          -- 'pdf', 'docx', 'txt', 'csv'
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT,                -- Path in Supabase Storage bucket
  status TEXT NOT NULL DEFAULT 'uploading',  -- 'uploading', 'extracting', 'embedding', 'ready', 'error'
  error_message TEXT,
  chunks_count INT DEFAULT 0,       -- Number of chunks generated
  extracted_text_preview TEXT,       -- First 500 chars of extracted text
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_atd_tenant_id ON agent_training_documents(tenant_id);
CREATE INDEX idx_atd_status ON agent_training_documents(status);
CREATE INDEX idx_atd_created_at ON agent_training_documents(created_at DESC);

-- RLS
ALTER TABLE agent_training_documents ENABLE ROW LEVEL SECURITY;

-- Tenant users can read their own training documents
CREATE POLICY "atd_select_own_tenant" ON agent_training_documents
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Tenant users can insert training documents for their tenant
CREATE POLICY "atd_insert_own_tenant" ON agent_training_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Tenant users can update their own tenant's training documents
CREATE POLICY "atd_update_own_tenant" ON agent_training_documents
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Tenant users can delete their own tenant's training documents
CREATE POLICY "atd_delete_own_tenant" ON agent_training_documents
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "atd_service_role_all" ON agent_training_documents
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_atd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atd_updated_at
  BEFORE UPDATE ON agent_training_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_atd_updated_at();
