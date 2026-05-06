-- ============================================================================
-- Migration: Drop 'evolution' from conexoes_whatsapp.tipo CHECK constraint
-- Date: 2026-05-06
-- ============================================================================
-- Context:
--   Migration 20260329000001_kapso_cleanup.sql already removed 'evolution' from
--   the CHECK constraint after the Kapso migration (20260325000001) re-keyed
--   all rows. However, 20260407000002_fix_integracoes_rls_and_constraints.sql
--   regressed the constraint to include 'evolution' again as part of an
--   unrelated RLS hardening pass.
--
--   The Evolution provider has been fully removed from the codebase
--   (evolution-manager edge function deleted, no callers in src/).
--   Re-allowing 'evolution' rows is dead surface that can hide misconfigured
--   tenants and produce data that no code path serves.
--
-- Action:
--   1. Defensive: re-key any leftover tipo='evolution' rows to 'kapso'
--      (should be zero, but cheap insurance).
--   2. Drop and recreate the CHECK constraint without 'evolution'.
-- ============================================================================

DO $$
BEGIN
  -- 1. Defensive remapping
  UPDATE public.conexoes_whatsapp
  SET tipo = 'kapso',
      provider = 'kapso',
      updated_at = NOW()
  WHERE tipo = 'evolution';

  -- 2. Replace the CHECK constraint
  ALTER TABLE public.conexoes_whatsapp
    DROP CONSTRAINT IF EXISTS conexoes_whatsapp_tipo_check;

  ALTER TABLE public.conexoes_whatsapp
    ADD CONSTRAINT conexoes_whatsapp_tipo_check
    CHECK (tipo IN ('kapso', 'oficial', 'cloud_api'));

EXCEPTION WHEN undefined_table THEN
  -- conexoes_whatsapp may not exist on minimal envs; skip silently
  NULL;
END $$;
