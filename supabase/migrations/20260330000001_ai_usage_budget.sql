-- AI Usage Budget Tracking
-- Tracks per-tenant daily AI token usage with budget limits

CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  tokens_used integer NOT NULL DEFAULT 0,
  budget_limit integer NOT NULL DEFAULT 100000,
  alert_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, usage_date)
);

-- Index for fast lookups
CREATE INDEX idx_ai_usage_tenant_date ON ai_usage(tenant_id, usage_date);

-- RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_tenant_isolation" ON ai_usage
  FOR ALL
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "ai_usage_service_role" ON ai_usage
  FOR ALL
  USING (current_setting('role') = 'service_role');

-- Function to atomically increment usage and check budget
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_tenant_id uuid,
  p_tokens integer
) RETURNS TABLE(
  tokens_used integer,
  budget_limit integer,
  over_budget boolean,
  threshold_reached boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record ai_usage%ROWTYPE;
BEGIN
  -- Upsert: create today's record or increment existing
  INSERT INTO ai_usage (tenant_id, usage_date, tokens_used)
  VALUES (p_tenant_id, CURRENT_DATE, p_tokens)
  ON CONFLICT (tenant_id, usage_date)
  DO UPDATE SET
    tokens_used = ai_usage.tokens_used + p_tokens,
    updated_at = now()
  RETURNING * INTO v_record;

  RETURN QUERY SELECT
    v_record.tokens_used,
    v_record.budget_limit,
    (v_record.tokens_used >= v_record.budget_limit) AS over_budget,
    (v_record.tokens_used >= v_record.budget_limit * 0.8 AND NOT v_record.alert_sent) AS threshold_reached;
END;
$$;

-- Function to mark alert as sent
CREATE OR REPLACE FUNCTION mark_ai_usage_alert_sent(
  p_tenant_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE ai_usage
  SET alert_sent = true, updated_at = now()
  WHERE tenant_id = p_tenant_id AND usage_date = CURRENT_DATE;
END;
$$;
