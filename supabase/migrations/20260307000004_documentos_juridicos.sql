-- Migration: documentos_juridicos
-- Tabela de Documentos Jurídicos com metadados de arquivo

CREATE TABLE IF NOT EXISTS public.documentos_juridicos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id     UUID REFERENCES public.processos(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  -- Arquivo
  nome_arquivo    TEXT NOT NULL,
  nome_original   TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  url_publica     TEXT,
  tipo_mime       TEXT,
  tamanho_bytes   BIGINT,
  -- Classificação
  tipo_documento  TEXT NOT NULL CHECK (tipo_documento IN (
    'peticao', 'contrato', 'procuracao', 'comprovante', 'sentenca',
    'recurso', 'acordo', 'laudo', 'certidao', 'outro'
  )),
  -- Integridade
  content_hash    TEXT,
  hash_algorithm  TEXT DEFAULT 'SHA-256',
  -- Metadados
  descricao       TEXT,
  tags            TEXT[],
  uploaded_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_tenant
  ON public.documentos_juridicos(tenant_id);

CREATE INDEX IF NOT EXISTS idx_documentos_processo
  ON public.documentos_juridicos(processo_id) WHERE processo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_lead
  ON public.documentos_juridicos(lead_id) WHERE lead_id IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_documentos_juridicos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER documentos_juridicos_updated_at
  BEFORE UPDATE ON public.documentos_juridicos
  FOR EACH ROW EXECUTE FUNCTION public.set_documentos_juridicos_updated_at();

-- RLS
ALTER TABLE public.documentos_juridicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_documentos_all" ON public.documentos_juridicos
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );
