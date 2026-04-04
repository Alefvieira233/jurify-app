-- DEB-004 + DEB-044: Prepare columns for credential encryption
-- Adds encrypted columns alongside plaintext originals for dual-read migration.
-- Actual encryption will happen via encrypt-data Edge Function after deploy.
-- Sprint 2 — Story 2.1
--
-- NOTE: Do NOT drop plaintext columns until Sprint 3 confirms encryption is stable.

BEGIN;

-- Google Calendar tokens: add encrypted columns
DO $$ BEGIN
  ALTER TABLE google_calendar_tokens ADD COLUMN access_token_encrypted TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE google_calendar_tokens ADD COLUMN refresh_token_encrypted TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Integration configs: add encrypted columns
DO $$ BEGIN
  ALTER TABLE configuracoes_integracoes ADD COLUMN api_key_encrypted TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE configuracoes_integracoes ADD COLUMN verify_token_encrypted TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add comment documenting the encryption plan
COMMENT ON COLUMN google_calendar_tokens.access_token_encrypted IS 'AES-256-GCM encrypted via encrypt-data Edge Function. Will replace access_token in Sprint 3.';
COMMENT ON COLUMN google_calendar_tokens.refresh_token_encrypted IS 'AES-256-GCM encrypted via encrypt-data Edge Function. Will replace refresh_token in Sprint 3.';
COMMENT ON COLUMN configuracoes_integracoes.api_key_encrypted IS 'AES-256-GCM encrypted via encrypt-data Edge Function. Will replace api_key in Sprint 3.';
COMMENT ON COLUMN configuracoes_integracoes.verify_token_encrypted IS 'AES-256-GCM encrypted via encrypt-data Edge Function. Will replace verify_token in Sprint 3.';

COMMIT;
