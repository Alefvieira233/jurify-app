-- Automated alert for overdue legal deadlines (prazos processuais).
-- Creates notifications for prazos that are due within 3 days or already overdue.
-- Designed to run daily via pg_cron alongside cleanup_expired_data.

CREATE OR REPLACE FUNCTION public.check_prazos_vencendo()
RETURNS TABLE(tenant_id uuid, prazos_alertados bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_count bigint;
  rec RECORD;
BEGIN
  -- Find all pending prazos due within 3 days (or already overdue)
  FOR rec IN
    SELECT
      p.id AS prazo_id,
      p.tenant_id,
      p.descricao,
      p.tipo,
      p.data_prazo,
      p.responsavel_id,
      EXTRACT(DAY FROM p.data_prazo - now()) AS dias_restantes,
      pr.numero_processo
    FROM prazos_processuais p
    LEFT JOIN processos pr ON pr.id = p.processo_id
    WHERE p.status = 'pendente'
      AND p.data_prazo <= now() + interval '3 days'
      AND p.tenant_id IS NOT NULL
      -- Skip if we already sent an alert today for this prazo
      AND NOT EXISTS (
        SELECT 1 FROM notificacoes n
        WHERE n.tenant_id = p.tenant_id
          AND n.tipo = 'prazo_urgente'
          AND n.referencia_id = p.id::text
          AND n.created_at >= now() - interval '1 day'
      )
    ORDER BY p.data_prazo ASC
  LOOP
    -- Create notification for the responsible user or all tenant admins
    INSERT INTO notificacoes (
      tenant_id,
      usuario_id,
      tipo,
      titulo,
      mensagem,
      referencia_id,
      referencia_tipo,
      prioridade,
      created_at
    ) VALUES (
      rec.tenant_id,
      rec.responsavel_id,
      'prazo_urgente',
      CASE
        WHEN rec.dias_restantes < 0 THEN 'PRAZO VENCIDO: ' || rec.tipo
        WHEN rec.dias_restantes = 0 THEN 'PRAZO HOJE: ' || rec.tipo
        ELSE 'Prazo em ' || CEIL(rec.dias_restantes) || ' dia(s): ' || rec.tipo
      END,
      COALESCE(rec.descricao, '') ||
        CASE WHEN rec.numero_processo IS NOT NULL THEN ' (Processo: ' || rec.numero_processo || ')' ELSE '' END ||
        ' — Vence em: ' || to_char(rec.data_prazo, 'DD/MM/YYYY'),
      rec.prazo_id::text,
      'prazo_processual',
      CASE
        WHEN rec.dias_restantes < 0 THEN 'alta'
        WHEN rec.dias_restantes <= 1 THEN 'alta'
        ELSE 'media'
      END,
      now()
    );
  END LOOP;

  -- Return summary per tenant
  RETURN QUERY
  SELECT
    n.tenant_id,
    count(*)::bigint AS prazos_alertados
  FROM notificacoes n
  WHERE n.tipo = 'prazo_urgente'
    AND n.created_at >= now() - interval '1 minute'
  GROUP BY n.tenant_id;
END;
$$;

COMMENT ON FUNCTION public.check_prazos_vencendo IS
  'Daily job: creates notifications for legal deadlines due within 3 days or overdue. Idempotent per day.';

-- Schedule daily at 07:00 UTC (04:00 BRT)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('check-prazos-vencendo');
    PERFORM cron.schedule(
      'check-prazos-vencendo',
      '0 7 * * *',
      $$SELECT * FROM public.check_prazos_vencendo()$$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — schedule check_prazos_vencendo manually';
END $$;
