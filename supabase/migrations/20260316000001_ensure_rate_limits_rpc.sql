-- =========================================================
-- MIGRATION: Ensure rate_limits table and check_rate_limit RPC exist
-- Criado em: 2026-03-16
-- Propósito: Fix para produção onde a tabela/RPC pode estar ausente
-- =========================================================

-- Ensure table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    namespace TEXT NOT NULL DEFAULT 'default',
    identifier TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_namespace_identifier ON public.rate_limits(namespace, identifier);

-- RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (idempotent)
DROP POLICY IF EXISTS "Service role can access rate_limits" ON public.rate_limits;
CREATE POLICY "Service role can access rate_limits"
    ON public.rate_limits FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users cannot access rate_limits" ON public.rate_limits;
CREATE POLICY "Users cannot access rate_limits"
    ON public.rate_limits FOR ALL TO authenticated
    USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Anon cannot access rate_limits" ON public.rate_limits;
CREATE POLICY "Anon cannot access rate_limits"
    ON public.rate_limits FOR ALL TO anon
    USING (false) WITH CHECK (false);

-- Atomic rate limiter RPC (idempotent via CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _namespace      text,
  _identifier     text,
  _max_requests   integer,
  _window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key    text   := _namespace || ':' || _identifier;
  _now    timestamptz := now();
  _reset  timestamptz;
  _count  integer;
  _allowed boolean;
BEGIN
  INSERT INTO rate_limits (key, namespace, identifier, count, reset_at)
  VALUES (_key, _namespace, _identifier, 1, _now + (_window_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE
    SET count    = CASE
                     WHEN rate_limits.reset_at < _now THEN 1
                     ELSE rate_limits.count + 1
                   END,
        reset_at = CASE
                     WHEN rate_limits.reset_at < _now
                       THEN _now + (_window_seconds || ' seconds')::interval
                     ELSE rate_limits.reset_at
                   END
  RETURNING count, reset_at INTO _count, _reset;

  _allowed := _count <= _max_requests;

  RETURN jsonb_build_object(
    'allowed',    _allowed,
    'count',      _count,
    'limit',      _max_requests,
    'remaining',  GREATEST(0, _max_requests - _count),
    'reset_at',   _reset
  );
END;
$$;

GRANT ALL ON public.rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;
REVOKE ALL ON public.rate_limits FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM authenticated, anon;
