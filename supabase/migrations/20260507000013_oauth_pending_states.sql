-- OAuth pending states — CSRF binding correto pra Google OAuth.
-- Estado anterior: state era gerado mas NÃO persistido server-side, então
-- callback aceitava qualquer state válido em formato. Atacante poderia forçar
-- vítima a fazer auth com conta dele (login CSRF / account fixation).
-- Fix: state crypto-random é persistido em DB com user_id + redirect_uri +
-- expires_at, e consumido (delete) na callback exchangeCode. Single-use.

CREATE TABLE IF NOT EXISTS public.oauth_pending_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'apple')),
  redirect_uri TEXT NOT NULL,
  scope TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_pending_states_user
  ON public.oauth_pending_states (user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_pending_states_expires
  ON public.oauth_pending_states (expires_at);

ALTER TABLE public.oauth_pending_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_pending_states FORCE ROW LEVEL SECURITY;

-- Service role apenas (edge function controla writes/reads)
CREATE POLICY oauth_pending_states_service_role ON public.oauth_pending_states
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated NÃO pode acessar (state precisa ser opaque pro client)
-- Nenhuma policy pra authenticated → bloqueado por default.

-- RPC pra criar state binding (chamada via edge function com SUDO).
CREATE OR REPLACE FUNCTION public.create_oauth_pending_state(
  _user_id UUID,
  _provider TEXT,
  _redirect_uri TEXT,
  _scope TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::JSONB,
  _ttl_seconds INT DEFAULT 600
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_state TEXT;
BEGIN
  -- Crypto-random state (gen_random_bytes precisa pgcrypto; fallback uuid).
  v_state := encode(gen_random_bytes(32), 'hex');

  -- Limpa estados expirados antes de inserir (housekeeping)
  DELETE FROM public.oauth_pending_states
   WHERE expires_at < NOW() - interval '1 hour';

  INSERT INTO public.oauth_pending_states (
    state, user_id, provider, redirect_uri, scope, metadata, expires_at
  ) VALUES (
    v_state, _user_id, _provider, _redirect_uri, _scope, _metadata,
    NOW() + make_interval(secs => _ttl_seconds)
  );

  RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.create_oauth_pending_state(UUID, TEXT, TEXT, TEXT, JSONB, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_oauth_pending_state(UUID, TEXT, TEXT, TEXT, JSONB, INT) TO service_role;

-- RPC pra consumir state (single-use, retorna user_id binding e deleta).
CREATE OR REPLACE FUNCTION public.consume_oauth_pending_state(
  _state TEXT,
  _provider TEXT
)
RETURNS TABLE (
  user_id UUID,
  redirect_uri TEXT,
  scope TEXT,
  metadata JSONB,
  valid BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_row public.oauth_pending_states;
BEGIN
  DELETE FROM public.oauth_pending_states
   WHERE state = _state
     AND provider = _provider
   RETURNING * INTO v_row;

  IF v_row.state IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::JSONB, false, 'state_not_found_or_already_used'::TEXT;
    RETURN;
  END IF;

  IF v_row.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::JSONB, false, 'state_expired'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_row.user_id, v_row.redirect_uri, v_row.scope, v_row.metadata, true, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_oauth_pending_state(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_oauth_pending_state(TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.oauth_pending_states IS
  'CSRF binding de OAuth flows. State crypto-random gerado em initiateAuth, consumido (single-use) em exchangeCode. TTL 10min default.';
