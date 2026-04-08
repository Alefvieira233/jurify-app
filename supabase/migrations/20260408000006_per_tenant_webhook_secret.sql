-- Per-tenant webhook secret for multi-tenant Kapso integration.
-- Each tenant's Kapso webhook generates a unique secret_key.
-- Stored encrypted alongside api_key_encrypted.

ALTER TABLE public.configuracoes_integracoes
  ADD COLUMN IF NOT EXISTS webhook_secret_encrypted TEXT;

COMMENT ON COLUMN public.configuracoes_integracoes.webhook_secret_encrypted IS
  'AES-256-GCM encrypted Kapso webhook secret. Per-tenant — used for HMAC signature verification.';
