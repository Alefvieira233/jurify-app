-- Migration: Drop plaintext secret columns that coexist with encrypted versions
-- Context: Encryption is security theater when plaintext columns still exist.
-- Each DROP is guarded by a check that the encrypted version exists.

-- 1. api_keys.key_value — raw API key stored alongside key_hash
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'key_hash'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'key_value'
  ) THEN
    ALTER TABLE public.api_keys DROP COLUMN key_value;
    RAISE NOTICE 'Dropped api_keys.key_value (plaintext) — key_hash remains';
  END IF;
END $$;

-- 2. configuracoes_integracoes.api_key — plaintext alongside api_key_encrypted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'configuracoes_integracoes' AND column_name = 'api_key_encrypted'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'configuracoes_integracoes' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE public.configuracoes_integracoes DROP COLUMN api_key;
    RAISE NOTICE 'Dropped configuracoes_integracoes.api_key (plaintext) — api_key_encrypted remains';
  END IF;
END $$;

-- 3. configuracoes_integracoes.verify_token — plaintext alongside verify_token_encrypted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'configuracoes_integracoes' AND column_name = 'verify_token_encrypted'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'configuracoes_integracoes' AND column_name = 'verify_token'
  ) THEN
    ALTER TABLE public.configuracoes_integracoes DROP COLUMN verify_token;
    RAISE NOTICE 'Dropped configuracoes_integracoes.verify_token (plaintext) — verify_token_encrypted remains';
  END IF;
END $$;

-- 4. google_calendar_tokens.access_token — plaintext alongside access_token_encrypted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'google_calendar_tokens' AND column_name = 'access_token_encrypted'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'google_calendar_tokens' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE public.google_calendar_tokens DROP COLUMN access_token;
    RAISE NOTICE 'Dropped google_calendar_tokens.access_token (plaintext) — access_token_encrypted remains';
  END IF;
END $$;

-- 5. google_calendar_tokens.refresh_token — plaintext alongside refresh_token_encrypted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'google_calendar_tokens' AND column_name = 'refresh_token_encrypted'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'google_calendar_tokens' AND column_name = 'refresh_token'
  ) THEN
    ALTER TABLE public.google_calendar_tokens DROP COLUMN refresh_token;
    RAISE NOTICE 'Dropped google_calendar_tokens.refresh_token (plaintext) — refresh_token_encrypted remains';
  END IF;
END $$;

-- 6. Drop legacy function that does plaintext key comparison
DROP FUNCTION IF EXISTS public.validar_api_key(text);
