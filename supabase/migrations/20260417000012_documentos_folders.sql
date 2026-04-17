-- Migration: documento_folders (hierarquia de pastas) + documentos_juridicos.folder_id
-- Adiciona organização em árvore de pastas aos documentos jurídicos.
-- RLS FORCED + tenant-scoped.

CREATE TABLE IF NOT EXISTS public.documento_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  parent_id  UUID REFERENCES public.documento_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documento_folders_tenant
  ON public.documento_folders(tenant_id);

CREATE INDEX IF NOT EXISTS idx_documento_folders_parent
  ON public.documento_folders(parent_id) WHERE parent_id IS NOT NULL;

-- Prevent duplicate folder names under the same parent within a tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_documento_folders_tenant_parent_name
  ON public.documento_folders(tenant_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::UUID), LOWER(name));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_documento_folders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documento_folders_updated_at ON public.documento_folders;
CREATE TRIGGER documento_folders_updated_at
  BEFORE UPDATE ON public.documento_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_documento_folders_updated_at();

-- RLS FORCED (prevents bypass even by table owner)
ALTER TABLE public.documento_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_folders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_documento_folders_all ON public.documento_folders;
CREATE POLICY rls_documento_folders_all ON public.documento_folders
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Add folder_id column to documentos_juridicos (the existing table, per migration 20260307000004)
ALTER TABLE public.documentos_juridicos
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.documento_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_juridicos_folder
  ON public.documentos_juridicos(folder_id) WHERE folder_id IS NOT NULL;

COMMENT ON TABLE public.documento_folders IS
  'Hierarquia de pastas para organizar documentos jurídicos. Tenant-scoped com RLS FORCED.';
COMMENT ON COLUMN public.documentos_juridicos.folder_id IS
  'Pasta opcional para organização. ON DELETE SET NULL — apagar pasta não apaga documentos.';
