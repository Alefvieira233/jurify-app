-- =============================================================================
-- RLS GOLDEN MIGRATION
-- Fecha 3 problemas detectados na análise de código:
--
--   1. Políticas SELECT "secure_*_select" nunca removidas nas migrações
--      20260203000000 / 20260209000001 — convivem com as novas "rls_*_*",
--      duplicando avaliação de política em cada query.
--
--   2. Coluna tenant_id NULLABLE em 6 tabelas críticas permite linha com
--      tenant_id = NULL bypassar o isolamento de tenant (NULL = NULL é NULL,
--      não TRUE, mas ausência do constraint permite inserção de dados órfãos).
--
--   3. Rate limiter não tinha RPC atômica — código cliente fazia
--      SELECT + UPDATE em dois round-trips, possibilitando race condition.
--
-- SEGURANÇA: Migration é totalmente IDEMPOTENT (IF EXISTS / IF NOT EXISTS).
-- =============================================================================

-- =============================================================================
-- 1. DROP orphaned SELECT policies (from 20250615170000, never cleaned up)
-- =============================================================================

DROP POLICY IF EXISTS "secure_leads_select"        ON public.leads;
DROP POLICY IF EXISTS "secure_contratos_select"    ON public.contratos;
DROP POLICY IF EXISTS "secure_agendamentos_select" ON public.agendamentos;
DROP POLICY IF EXISTS "secure_agentes_select"      ON public.agentes_ia;
DROP POLICY IF EXISTS "secure_notificacoes_select" ON public.notificacoes;

-- Also drop any remnants from earlier naming iterations
DROP POLICY IF EXISTS "leads_select"               ON public.leads;
DROP POLICY IF EXISTS "contratos_select"           ON public.contratos;
DROP POLICY IF EXISTS "agendamentos_select"        ON public.agendamentos;
DROP POLICY IF EXISTS "agentes_ia_select"          ON public.agentes_ia;
DROP POLICY IF EXISTS "notificacoes_select"        ON public.notificacoes;

-- And drop new ones we'll re-create (safe re-run)
DROP POLICY IF EXISTS "rls_leads_select"           ON public.leads;
DROP POLICY IF EXISTS "rls_contratos_select"       ON public.contratos;
DROP POLICY IF EXISTS "rls_agendamentos_select"    ON public.agendamentos;
DROP POLICY IF EXISTS "rls_agentes_ia_select"      ON public.agentes_ia;
DROP POLICY IF EXISTS "rls_notificacoes_select"    ON public.notificacoes;

-- =============================================================================
-- 2. CREATE clean SELECT policies using get_current_tenant_id() for perf
--    (single stable function call per query vs inline subquery per row)
-- =============================================================================

-- LEADS — all roles can read within their tenant
CREATE POLICY "rls_leads_select" ON public.leads
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

-- CONTRATOS — all roles can read within their tenant
CREATE POLICY "rls_contratos_select" ON public.contratos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

-- AGENDAMENTOS — all roles can read within their tenant
CREATE POLICY "rls_agendamentos_select" ON public.agendamentos
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

-- AGENTES_IA — all roles can read within their tenant (execute permission
--              controlled at application layer via has_permission())
CREATE POLICY "rls_agentes_ia_select" ON public.agentes_ia
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

-- NOTIFICACOES — user reads own notifications OR admin reads all in tenant
CREATE POLICY "rls_notificacoes_select" ON public.notificacoes
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND (
    user_id = auth.uid()
    OR public.has_permission(auth.uid(), 'notificacoes', 'read')
  )
);

-- =============================================================================
-- 3. tenant_id NOT NULL constraints (safe — skips tables with existing NULLs)
-- =============================================================================

DO $$
DECLARE
  _tables  text[] := ARRAY[
    'leads', 'contratos', 'agendamentos',
    'agentes_ia', 'notificacoes', 'logs_execucao_agentes'
  ];
  _t         text;
  _nullable  boolean;
  _nulls     bigint;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP

    -- Skip if table or column doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = _t
        AND column_name  = 'tenant_id'
    ) THEN
      RAISE NOTICE '[rls_golden] tabela % não tem coluna tenant_id — pulando', _t;
      CONTINUE;
    END IF;

    -- Check current nullability
    SELECT is_nullable = 'YES'
    INTO   _nullable
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = _t
      AND  column_name  = 'tenant_id';

    IF NOT _nullable THEN
      RAISE NOTICE '[rls_golden] tenant_id em % já é NOT NULL — ok', _t;
      CONTINUE;
    END IF;

    -- Count NULLs — don't add constraint if data would violate it
    EXECUTE format(
      'SELECT COUNT(*) FROM public.%I WHERE tenant_id IS NULL', _t
    ) INTO _nulls;

    IF _nulls > 0 THEN
      RAISE WARNING
        '[rls_golden] % tem % linha(s) com tenant_id = NULL — '
        'constraint NOT NULL não aplicada. '
        'Execute: DELETE FROM public.% WHERE tenant_id IS NULL; '
        'depois re-execute esta migration.',
        _t, _nulls, _t;
      CONTINUE;
    END IF;

    -- Safe to add NOT NULL
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', _t
    );
    RAISE NOTICE '[rls_golden] tenant_id SET NOT NULL em %', _t;

  END LOOP;
END $$;

-- =============================================================================
-- 4. Atomic rate limiter RPC
--    Replaces SELECT + UPDATE two-round-trip pattern with a single
--    INSERT ... ON CONFLICT DO UPDATE that is serializable by default.
--
--    Usage (from Edge Functions):
--      const { data } = await supabase.rpc('check_rate_limit', {
--        _namespace: 'whatsapp',
--        _identifier: userId,
--        _max_requests: 60,
--        _window_seconds: 3600,
--      });
--      if (!data.allowed) throw new Error('Rate limit exceeded');
-- =============================================================================

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
  _key     text        := _namespace || ':' || _identifier;
  _now     timestamptz := NOW();
  _new_reset timestamptz := _now + (_window_seconds || ' seconds')::interval;
  _count   integer;
  _reset   timestamptz;
  _allowed boolean;
BEGIN
  -- Single atomic statement:
  --   • If key doesn't exist → INSERT with count = 1
  --   • If window expired    → reset count to 1, reset window
  --   • Otherwise            → increment count, keep window
  INSERT INTO public.rate_limits (key, namespace, identifier, count, reset_at, updated_at)
  VALUES (_key, _namespace, _identifier, 1, _new_reset, _now)
  ON CONFLICT (key) DO UPDATE
    SET count      = CASE
                       WHEN rate_limits.reset_at < _now THEN 1
                       ELSE rate_limits.count + 1
                     END,
        reset_at   = CASE
                       WHEN rate_limits.reset_at < _now THEN _new_reset
                       ELSE rate_limits.reset_at
                     END,
        updated_at = _now
  RETURNING count, reset_at
  INTO _count, _reset;

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

COMMENT ON FUNCTION public.check_rate_limit IS
  'Atomic rate limiter: increments counter for (namespace, identifier) within '
  'a sliding window and returns { allowed, count, limit, remaining, reset_at }. '
  'Replaces the two-round-trip SELECT + UPDATE pattern.';

GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM authenticated, anon;
