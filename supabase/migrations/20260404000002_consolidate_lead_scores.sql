-- Migration: DEB-030 — Consolidate duplicate score columns in leads
-- Story: 3.1 — Database Normalization & LGPD Compliance
--
-- The leads table has both `score` (integer, nullable) and `lead_score` (integer, nullable).
-- `lead_score` is the authoritative column used by useLeadScoring and the CRM UI.
-- `crm_lead_scores` stores the full scoring history separately.
-- We consolidate into `lead_score` and drop the legacy `score` column.

BEGIN;

-- Step 1: Backfill lead_score from score where lead_score is null
UPDATE public.leads
SET lead_score = COALESCE(lead_score, score)
WHERE lead_score IS NULL AND score IS NOT NULL;

-- Step 2: Drop the legacy score column (CASCADE drops dependent views; they use lead_score too)
ALTER TABLE public.leads DROP COLUMN IF EXISTS score CASCADE;

COMMIT;
