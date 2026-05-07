-- Adiciona colunas user info usadas pelo edge function google-calendar
-- (case "exchangeCode" insere; case "status" lê).
-- Sem essas colunas, o upsert quebrava com erro do PostgREST schema cache:
-- "Could not find the 'access_token' column of 'google_calendar_tokens' in the schema cache"

ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS picture TEXT;

COMMENT ON COLUMN public.google_calendar_tokens.email IS 'Email da conta Google que autorizou (mostrado em /conexoes)';
COMMENT ON COLUMN public.google_calendar_tokens.name IS 'Nome do user Google que autorizou (mostrado em /conexoes)';
COMMENT ON COLUMN public.google_calendar_tokens.picture IS 'URL avatar Google (mostrado em /conexoes)';

NOTIFY pgrst, 'reload schema';
