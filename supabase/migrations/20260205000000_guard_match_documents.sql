-- Guard match_documents against missing tenant_id (Sprint 2 hardening)
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
  IF filter_tenant_id IS NULL THEN
    RAISE EXCEPTION 'filter_tenant_id is required';
  END IF;

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
