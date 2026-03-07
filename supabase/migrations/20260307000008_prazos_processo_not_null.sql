-- Enforce processo_id NOT NULL on prazos_processuais
-- A "prazo processual" without a linked processo is semantically invalid.
-- We delete any orphan rows (NULL processo_id) before adding the constraint.

-- Remove orphan prazos that have no processo linked
DELETE FROM public.prazos_processuais WHERE processo_id IS NULL;

-- Enforce the NOT NULL constraint going forward
ALTER TABLE public.prazos_processuais
  ALTER COLUMN processo_id SET NOT NULL;
