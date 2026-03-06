-- LGPD Consent Logs: track user consent decisions for auditing
CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'cookies_analytics', 'cookies_marketing', 'cookies_essential',
    'terms_of_use', 'privacy_policy', 'data_processing', 'marketing_emails'
  )),
  accepted BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user ON consent_logs(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_logs_tenant ON consent_logs(tenant_id);

-- RLS
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent logs"
  ON consent_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own consent logs"
  ON consent_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Data retention configuration per tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 365;
