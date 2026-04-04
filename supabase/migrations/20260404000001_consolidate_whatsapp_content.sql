-- Migration: DEB-014 — Consolidate content/message_text in whatsapp_messages
-- Story: 3.1 — Database Normalization & LGPD Compliance
--
-- The whatsapp_messages table has duplicate columns: `content` and `message_text`.
-- This is a vestige of the Evolution API -> Kapso migration (2026-03-25).
-- We consolidate into `content` (the canonical column) and drop `message_text`.

BEGIN;

-- Step 1: Backfill content from message_text where content is null
UPDATE public.whatsapp_messages
SET content = message_text
WHERE content IS NULL AND message_text IS NOT NULL;

-- Step 2: Drop the duplicate column
ALTER TABLE public.whatsapp_messages DROP COLUMN IF EXISTS message_text;

COMMIT;
