-- Migration: RPC get_honorarios_dashboard
-- Aggregated metrics for the honorarios dashboard:
--   - KPI cards: total recebíveis, vencidos, a_vencer 30d, recebidos no mês
--   - Recebimento mensal últimos 6 meses (time series)
-- Tenant-scoped with STRICT validation (caller must belong to p_tenant_id).

CREATE OR REPLACE FUNCTION public.get_honorarios_dashboard(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
-- Lock the function to a known search_path so malicious schemas can't shadow.
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller_tenant UUID;
  v_total_recebiveis NUMERIC(15,2);
  v_total_vencidos NUMERIC(15,2);
  v_total_a_vencer NUMERIC(15,2);
  v_total_recebidos_mes NUMERIC(15,2);
  v_count_vencidos INT;
  v_count_a_vencer INT;
  v_series JSON;
  v_today DATE := CURRENT_DATE;
  v_30d DATE := CURRENT_DATE + INTERVAL '30 days';
  v_month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
BEGIN
  -- Validate caller owns the tenant
  SELECT tenant_id INTO v_caller_tenant
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_tenant IS NULL OR v_caller_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant mismatch';
  END IF;

  -- Total a receber (agreed - received, only vigente/inadimplente)
  SELECT COALESCE(SUM(GREATEST(COALESCE(valor_total_acordado, 0) - COALESCE(valor_recebido, 0), 0)), 0)
  INTO v_total_recebiveis
  FROM public.honorarios
  WHERE tenant_id = p_tenant_id
    AND status IN ('vigente', 'inadimplente');

  -- Vencidos: data_vencimento < hoje e status = vigente/inadimplente
  SELECT
    COALESCE(SUM(GREATEST(COALESCE(valor_total_acordado, 0) - COALESCE(valor_recebido, 0), 0)), 0),
    COUNT(*)
  INTO v_total_vencidos, v_count_vencidos
  FROM public.honorarios
  WHERE tenant_id = p_tenant_id
    AND data_vencimento IS NOT NULL
    AND data_vencimento < v_today
    AND status IN ('vigente', 'inadimplente');

  -- A vencer (próximos 30 dias)
  SELECT
    COALESCE(SUM(GREATEST(COALESCE(valor_total_acordado, 0) - COALESCE(valor_recebido, 0), 0)), 0),
    COUNT(*)
  INTO v_total_a_vencer, v_count_a_vencer
  FROM public.honorarios
  WHERE tenant_id = p_tenant_id
    AND data_vencimento IS NOT NULL
    AND data_vencimento >= v_today
    AND data_vencimento <= v_30d
    AND status = 'vigente';

  -- Recebidos no mês corrente (soma de valor_recebido atualizado no mês)
  SELECT COALESCE(SUM(COALESCE(valor_recebido, 0)), 0)
  INTO v_total_recebidos_mes
  FROM public.honorarios
  WHERE tenant_id = p_tenant_id
    AND status = 'pago'
    AND (updated_at >= v_month_start OR created_at >= v_month_start);

  -- Série: últimos 6 meses de valor_recebido por mês (baseado em updated_at)
  WITH month_series AS (
    SELECT
      date_trunc('month', d)::DATE AS mes
    FROM generate_series(
      (v_month_start - INTERVAL '5 months')::DATE,
      v_month_start,
      INTERVAL '1 month'
    ) AS d
  ),
  totals AS (
    SELECT
      date_trunc('month', COALESCE(updated_at, created_at))::DATE AS mes,
      SUM(COALESCE(valor_recebido, 0)) AS total
    FROM public.honorarios
    WHERE tenant_id = p_tenant_id
      AND status = 'pago'
      AND COALESCE(updated_at, created_at) >= (v_month_start - INTERVAL '5 months')
    GROUP BY 1
  )
  SELECT json_agg(
    json_build_object(
      'mes', to_char(ms.mes, 'YYYY-MM'),
      'label', to_char(ms.mes, 'Mon/YY'),
      'total', COALESCE(t.total, 0)
    ) ORDER BY ms.mes
  )
  INTO v_series
  FROM month_series ms
  LEFT JOIN totals t ON t.mes = ms.mes;

  RETURN json_build_object(
    'total_recebiveis', v_total_recebiveis,
    'total_vencidos', v_total_vencidos,
    'count_vencidos', v_count_vencidos,
    'total_a_vencer', v_total_a_vencer,
    'count_a_vencer', v_count_a_vencer,
    'total_recebidos_mes', v_total_recebidos_mes,
    'serie_mensal', COALESCE(v_series, '[]'::JSON)
  );
END;
$$;

-- Lock down: authenticated users only. Function validates tenant ownership internally.
REVOKE ALL ON FUNCTION public.get_honorarios_dashboard(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_honorarios_dashboard(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_honorarios_dashboard(UUID) IS
  'Aggregated honorarios dashboard metrics. Tenant-scoped with caller validation.';
