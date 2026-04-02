-- ============================================
-- Add missing FK constraints to leaf tables
-- ============================================
-- Analysis:
--   lead_notas.lead_id    → leads(id) ON DELETE CASCADE — already exists (inline)
--   lead_historico.lead_id → leads(id) ON DELETE CASCADE — already exists (inline)
--   lead_tags.lead_id     → leads(id) ON DELETE CASCADE — already exists (inline)
--   lead_tags.tag_id      → tags(id)  ON DELETE CASCADE — already exists (inline)
--   crm_lead_tags.*       → already has FKs (inline)
--
-- Only gap found: agendamentos has no responsavel_id UUID column.
-- It only has `responsavel TEXT` (free-text). Add the FK column.
-- ============================================

-- Add responsavel_id UUID FK column to agendamentos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agendamentos'
      AND column_name = 'responsavel_id'
  ) THEN
    ALTER TABLE public.agendamentos
      ADD COLUMN responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_agendamentos_responsavel_id
      ON public.agendamentos(responsavel_id);
  END IF;
END $$;
