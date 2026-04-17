-- Migration: contratos — ZapSign webhook fields
-- Adds `signed_file_url` to persist the signed PDF URL returned by ZapSign's
-- webhook, and ensures common signature status values are supported.
-- No backfill required — older rows leave the new column NULL.

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS signed_file_url TEXT;

COMMENT ON COLUMN public.contratos.signed_file_url IS
  'URL do PDF assinado retornado pelo webhook da ZapSign (event doc_signed).';

-- Defensive: if a CHECK constraint exists on status_assinatura, relax it to
-- include the values we emit from the webhook. The constraint is added
-- conditionally to avoid breaking existing deployments that don't have one.
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT con.conname
    INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class cls ON cls.oid = con.conrelid
  WHERE cls.relname = 'contratos'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status_assinatura%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.contratos DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_status_assinatura_check
  CHECK (
    status_assinatura IS NULL
    OR status_assinatura IN (
      'pendente', 'assinado', 'cancelado', 'expirado', 'recusado'
    )
  );

-- Index to speed up webhook lookups by zapsign_document_id.
CREATE INDEX IF NOT EXISTS idx_contratos_zapsign_document_id
  ON public.contratos(zapsign_document_id)
  WHERE zapsign_document_id IS NOT NULL;
