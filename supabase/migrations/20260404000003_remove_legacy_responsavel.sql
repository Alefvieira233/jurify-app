-- Migration: DEB-033 — Remove legacy responsavel text column from contratos
-- Story: 3.1 — Database Normalization & LGPD Compliance
--
-- The contratos table has both `responsavel` (text, legacy) and `responsavel_id` (uuid FK).
-- `responsavel_id` is the canonical column referencing profiles.
-- The text column is redundant and denormalized.
--
-- NOTE: The `responsavel` text column on `agendamentos` is NOT dropped here because
-- it is still actively used by NovoAgendamentoForm, DetalhesAgendamento, and seed-database.
-- That table also has `responsavel_id`, but the text column serves a different purpose there
-- (storing the display name for quick access). A separate migration can address it later.

BEGIN;

-- Drop the legacy text column from contratos only
ALTER TABLE public.contratos DROP COLUMN IF EXISTS responsavel;

COMMIT;
