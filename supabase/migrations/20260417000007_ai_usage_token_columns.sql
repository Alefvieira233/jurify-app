-- ============================================================================
-- AI usage — token-split columns + monthly index (Onda 2, Pipeline Unification)
--
-- Date:        2026-04-17
-- Context:     Auditoria 2026-04-17 flagged that three parallel AI pipelines
--              (whatsapp-webhook, ai-agent-processor, assistant, chat-completion)
--              each counted monthly "quota" as COUNT(agent_ai_logs) rows — a
--              metric that inflates on retries/orchestrator hops and diverges
--              from actual economic cost. Onda 2 unifies on TOKENS via the
--              ai_usage table.
--
-- Changes:
--   1. Add tokens_in / tokens_out INTEGER DEFAULT 0 columns.
--   2. Add tokens_total STORED generated column = tokens_in + tokens_out.
--   3. Add an index on (tenant_id, created_at) for the monthly SUM query.
--   4. Register helper RPC `increment_ai_token_split(tenant_id, in, out)` used
--      by ai-caller.ts to backfill the split counters atomically. Callers
--      first run increment_ai_usage (legacy, bumps tokens_used + returns
--      threshold flag) then this one (bumps tokens_in/tokens_out, from which
--      tokens_total is auto-derived).
--
-- Idempotent:  ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE OR
--              REPLACE FUNCTION — safe to re-run.
-- ============================================================================

ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS tokens_in  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_out INTEGER DEFAULT 0;

-- Generated column: drop and re-add to avoid errors when base columns change.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'ai_usage'
      AND column_name  = 'tokens_total'
  ) THEN
    ALTER TABLE public.ai_usage
      ADD COLUMN tokens_total INTEGER
      GENERATED ALWAYS AS (COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_created_desc
  ON public.ai_usage (tenant_id, created_at DESC);

-- Helper RPC: atomically bump tokens_in/tokens_out on today's row. Inserts a
-- zeroed row for today if one doesn't exist yet (mirrors increment_ai_usage).
CREATE OR REPLACE FUNCTION public.increment_ai_token_split(
  p_tenant_id UUID,
  p_tokens_in  INTEGER,
  p_tokens_out INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_usage (tenant_id, usage_date, tokens_in, tokens_out)
  VALUES (p_tenant_id, CURRENT_DATE, COALESCE(p_tokens_in, 0), COALESCE(p_tokens_out, 0))
  ON CONFLICT (tenant_id, usage_date)
  DO UPDATE SET
    tokens_in  = public.ai_usage.tokens_in  + COALESCE(EXCLUDED.tokens_in, 0),
    tokens_out = public.ai_usage.tokens_out + COALESCE(EXCLUDED.tokens_out, 0),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_token_split(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_token_split(UUID, INTEGER, INTEGER) TO service_role;

COMMENT ON COLUMN public.ai_usage.tokens_in  IS 'Prompt tokens consumed today (populated by ai-caller).';
COMMENT ON COLUMN public.ai_usage.tokens_out IS 'Completion tokens produced today (populated by ai-caller).';
COMMENT ON COLUMN public.ai_usage.tokens_total IS 'Generated: tokens_in + tokens_out. Used by monthly SUM budget check.';
