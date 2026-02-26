-- ⚖️ JURIFY TRUST ENGINE — Legal Knowledge Base (RAG + pgvector)
-- Tabela dedicada para jurisprudência, súmulas, leis e acórdãos
-- Separada da tabela `documents` (que é multi-tenant por tenant_id)
-- Esta tabela é PÚBLICA (conhecimento jurídico compartilhado) — sem tenant_id

-- 1. Garantir extensão vector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 2. Tabela principal
CREATE TABLE IF NOT EXISTS public.legal_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,                          -- 'sumula' | 'lei' | 'acordao' | 'enunciado'
  source_id TEXT NOT NULL,                            -- ex: 'STJ_SUM_54', 'CF88_ART5'
  content TEXT NOT NULL,                              -- chunk de texto
  content_hash TEXT NOT NULL,                         -- sha256(normalized content) para dedup
  embedding VECTOR(1536) NOT NULL,                    -- text-embedding-3-small
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,        -- { url, tags, tribunal, year, ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dedup: mesmo source_id + mesmo conteúdo = não duplicar
  CONSTRAINT legal_knowledge_dedup UNIQUE (source_id, content_hash)
);

-- 3. Índices para performance
-- ivfflat para busca vetorial rápida (cosine similarity)
CREATE INDEX IF NOT EXISTS legal_knowledge_embedding_ivfflat
  ON public.legal_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- btree para filtros comuns
CREATE INDEX IF NOT EXISTS legal_knowledge_source_type_idx
  ON public.legal_knowledge (source_type);

CREATE INDEX IF NOT EXISTS legal_knowledge_tribunal_idx
  ON public.legal_knowledge ((metadata->>'tribunal'));

CREATE INDEX IF NOT EXISTS legal_knowledge_year_idx
  ON public.legal_knowledge ((metadata->>'year'));

-- 4. RLS — conhecimento jurídico público, mas write apenas service_role
ALTER TABLE public.legal_knowledge ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler (é conhecimento público)
CREATE POLICY "Authenticated users can read legal knowledge"
  ON public.legal_knowledge FOR SELECT
  TO authenticated
  USING (true);

-- Apenas service_role pode inserir/atualizar/deletar
CREATE POLICY "Service role manages legal knowledge"
  ON public.legal_knowledge FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. RPC: match_legal_documents — busca vetorial com filtros dinâmicos
CREATE OR REPLACE FUNCTION public.match_legal_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 6,
  filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lk.id,
    lk.source_type,
    lk.source_id,
    lk.content,
    lk.metadata,
    (1 - (lk.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.legal_knowledge lk
  WHERE
    -- Threshold mínimo de similaridade
    (1 - (lk.embedding <=> query_embedding)) >= match_threshold
    -- Filtro por source_type (se fornecido)
    AND (
      filter->>'source_type' IS NULL
      OR lk.source_type = filter->>'source_type'
    )
    -- Filtro por tribunal (se fornecido)
    AND (
      filter->>'tribunal' IS NULL
      OR lk.metadata->>'tribunal' = filter->>'tribunal'
    )
    -- Filtro por ano mínimo (se fornecido)
    AND (
      filter->>'year_min' IS NULL
      OR (lk.metadata->>'year')::INT >= (filter->>'year_min')::INT
    )
    -- Filtro por ano máximo (se fornecido)
    AND (
      filter->>'year_max' IS NULL
      OR (lk.metadata->>'year')::INT <= (filter->>'year_max')::INT
    )
    -- Filtro por tags (se fornecido — ANY match)
    AND (
      filter->'tags' IS NULL
      OR lk.metadata->'tags' ?| ARRAY(SELECT jsonb_array_elements_text(filter->'tags'))
    )
  ORDER BY lk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
