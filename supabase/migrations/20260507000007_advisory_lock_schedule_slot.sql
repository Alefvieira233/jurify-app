-- =====================================================================
-- P0 RACE FIX (2026-05-07): serializa check+insert de agendamento por
-- (tenant_id, lead_id) usando pg_try_advisory_xact_lock + re-check
-- atômicos numa única transação RPC. Evita duplicate booking quando
-- duas mensagens WhatsApp do mesmo lead chegam quase simultaneamente.
-- Defense-in-depth: índice partial UNIQUE em (tenant_id, lead_id, minuto)
-- pra status ativo, garantindo idempotência mesmo se a RPC for bypassada.
-- =====================================================================

-- 1) RPC atômica
CREATE OR REPLACE FUNCTION public.try_acquire_schedule_slot(
  _tenant_id UUID,
  _lead_id UUID,
  _data_hora TIMESTAMPTZ,
  _slot_minutes INT,
  _responsavel_id UUID,
  _responsavel_nome TEXT,
  _area_juridica TEXT,
  _observacoes TEXT
)
RETURNS TABLE (
  acquired BOOLEAN,
  agendamento_id UUID,
  conflict_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_lock_key BIGINT;
  v_conflict_count INT;
  v_existing_future_count INT;
  v_from TIMESTAMPTZ := _data_hora - make_interval(mins => _slot_minutes);
  v_to TIMESTAMPTZ := _data_hora + make_interval(mins => _slot_minutes);
  v_new_id UUID;
BEGIN
  v_lock_key := hashtextextended(_tenant_id::TEXT || ':' || _lead_id::TEXT, 0);

  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'lock_busy'::TEXT;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_existing_future_count
    FROM public.agendamentos
   WHERE tenant_id = _tenant_id
     AND lead_id = _lead_id
     AND status IN ('agendado', 'confirmado')
     AND data_hora >= NOW();

  IF v_existing_future_count > 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'lead_already_scheduled'::TEXT;
    RETURN;
  END IF;

  IF _responsavel_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_conflict_count
      FROM public.agendamentos
     WHERE tenant_id = _tenant_id
       AND responsavel_id = _responsavel_id
       AND data_hora >= v_from
       AND data_hora <= v_to
       AND status IN ('agendado', 'confirmado');

    IF v_conflict_count > 0 THEN
      RETURN QUERY SELECT false, NULL::UUID, 'responsavel_conflict'::TEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.agendamentos (
    lead_id, tenant_id, area_juridica, data_hora,
    responsavel, responsavel_id, status, observacoes
  )
  VALUES (
    _lead_id, _tenant_id, _area_juridica, _data_hora,
    _responsavel_nome, _responsavel_id, 'agendado', _observacoes
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT true, v_new_id, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.try_acquire_schedule_slot(
  UUID, UUID, TIMESTAMPTZ, INT, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_acquire_schedule_slot(
  UUID, UUID, TIMESTAMPTZ, INT, UUID, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- 2) Defense-in-depth: índice UNIQUE parcial (mesmo lead+minuto+ativo).
-- Evita duplicate exato mesmo se INSERT direto bypassar a RPC.
-- NOTA: defense-in-depth via UNIQUE index parcial em (tenant_id, lead_id, minuto)
-- foi removida desta migration porque date_trunc/extract em timestamptz não são
-- IMMUTABLE (dependem da timezone session) — Postgres rejeita no índice. Fica
-- como follow-up P1: criar função wrapper IMMUTABLE + index parcial.
-- Por ora a RPC try_acquire_schedule_slot é a única linha de defesa, e é
-- atômica (advisory lock + re-check + insert numa única transação).
