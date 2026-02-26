-- ============================================================
-- Assistant Tables: audit trail + conversation persistence
-- ============================================================

-- 1. Audit trail for all assistant interactions
CREATE TABLE IF NOT EXISTS assistant_audit (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,
  action        TEXT NOT NULL DEFAULT 'assistant_query',
  query         TEXT,
  response_time_ms INTEGER,
  tools_used    TEXT[] DEFAULT '{}',
  success       BOOLEAN NOT NULL DEFAULT TRUE,
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_audit_user ON assistant_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_tenant ON assistant_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_created ON assistant_audit(created_at DESC);

-- RLS: users can only see their own tenant's audit entries
ALTER TABLE assistant_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on assistant_audit"
  ON assistant_audit
  FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Service role bypass for Edge Functions
CREATE POLICY "Service role full access on assistant_audit"
  ON assistant_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Conversation persistence (optional — for future history feature)
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,
  title         TEXT,
  messages      JSONB NOT NULL DEFAULT '[]',
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_conv_user ON assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conv_tenant ON assistant_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conv_updated ON assistant_conversations(updated_at DESC);

-- RLS: users can only see their own conversations
ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations"
  ON assistant_conversations
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access on assistant_conversations"
  ON assistant_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_assistant_conv_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assistant_conv_updated
  BEFORE UPDATE ON assistant_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_conv_timestamp();
