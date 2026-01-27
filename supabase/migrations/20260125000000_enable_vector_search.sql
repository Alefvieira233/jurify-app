-- 🚀 JURIFY - RAG SYSTEM (VECTOR SEARCH)
-- Enable pgvector extension and create document stores

-- 1. Enable Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(1536), -- OpenAI Ada-002 dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS documents_tenant_id_idx ON public.documents(tenant_id);

-- 4. RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's documents"
  ON public.documents FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service role can manage all documents"
  ON public.documents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Match Function (Hybrid Search)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  AND d.tenant_id = filter_tenant_id
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
