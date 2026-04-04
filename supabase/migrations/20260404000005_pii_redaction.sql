-- Migration: DEB-045 — PII Redaction in agent_ai_logs
-- Story: 3.1 — Database Normalization & LGPD Compliance
--
-- Creates a redact_pii() function that masks CPF, process numbers, phone numbers,
-- and email addresses. Applies it via trigger on INSERT to agent_ai_logs
-- on the `user_prompt` and `full_result` columns.

BEGIN;

-- ==========================================================================
-- 1. PII redaction function
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.redact_pii(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text := input_text;
BEGIN
  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  -- CPF: 123.456.789-01 -> ###.###.###-##
  result := regexp_replace(result, '\d{3}\.\d{3}\.\d{3}-\d{2}', '###.###.###-##', 'g');

  -- CPF without dots: 12345678901 (11 consecutive digits that aren't part of longer number)
  -- Skip this to avoid false positives with other numeric IDs

  -- Brazilian legal process numbers: 1234567-89.2024.8.26.0001 -> [PROCESSO REDACTED]
  result := regexp_replace(result, '\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}', '[PROCESSO REDACTED]', 'g');

  -- Phone numbers: (11) 91234-5678 or (11) 1234-5678 -> [TELEFONE REDACTED]
  result := regexp_replace(result, '\(\d{2}\)\s?\d{4,5}-\d{4}', '[TELEFONE REDACTED]', 'g');

  -- Phone numbers without formatting: +5511912345678 -> [TELEFONE REDACTED]
  result := regexp_replace(result, '\+55\d{10,11}', '[TELEFONE REDACTED]', 'g');

  -- Email addresses -> [EMAIL REDACTED]
  result := regexp_replace(result, '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', '[EMAIL REDACTED]', 'g');

  RETURN result;
END;
$$;

-- ==========================================================================
-- 2. Trigger function for agent_ai_logs
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.trg_redact_pii_agent_ai_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.user_prompt := public.redact_pii(NEW.user_prompt);
  NEW.full_result := public.redact_pii(NEW.full_result);
  RETURN NEW;
END;
$$;

-- ==========================================================================
-- 3. Attach trigger on INSERT
-- ==========================================================================

DROP TRIGGER IF EXISTS trg_pii_redact_agent_ai_logs ON public.agent_ai_logs;
CREATE TRIGGER trg_pii_redact_agent_ai_logs
  BEFORE INSERT ON public.agent_ai_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_redact_pii_agent_ai_logs();

COMMIT;
