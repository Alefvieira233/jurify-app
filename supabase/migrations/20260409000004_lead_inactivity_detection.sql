-- =============================================================================
-- Lead inactivity detection — identifies stale leads and creates follow-up alerts
-- Called periodically via external cron (Vercel cron, GitHub Actions, etc.)
-- =============================================================================

-- RPC: detect inactive leads per tenant and create notifications
CREATE OR REPLACE FUNCTION public.detect_inactive_leads(
  inactivity_days INTEGER DEFAULT 3
)
RETURNS TABLE(tenant_id UUID, leads_alerted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  alerted INTEGER;
  cutoff TIMESTAMPTZ;
BEGIN
  cutoff := now() - (inactivity_days || ' days')::INTERVAL;

  -- Process each tenant independently
  FOR rec IN
    SELECT DISTINCT l.tenant_id AS tid
    FROM leads l
    WHERE l.status NOT IN ('ganho', 'perdido')
      AND l.updated_at < cutoff
      AND l.arquivado_em IS NULL
  LOOP
    alerted := 0;

    -- Find inactive leads for this tenant
    INSERT INTO notificacoes (tenant_id, tipo, titulo, mensagem, ativo)
    SELECT
      rec.tid,
      CASE
        WHEN l.temperature = 'hot' THEN 'alerta'
        ELSE 'info'
      END,
      CASE
        WHEN l.temperature = 'hot' THEN '🔴 Lead quente parado há ' || inactivity_days || '+ dias'
        ELSE '⏰ Lead inativo há ' || inactivity_days || '+ dias'
      END,
      'O lead "' || COALESCE(l.nome, l.telefone, 'Sem nome') || '" está em "'
        || COALESCE(l.status, 'desconhecido') || '" desde '
        || to_char(l.updated_at, 'DD/MM/YYYY')
        || '. Responsável: ' || COALESCE(p.nome_completo, 'Não atribuído')
        || '. Considere fazer follow-up.',
      true
    FROM leads l
    LEFT JOIN profiles p ON p.id = l.responsavel_id
    WHERE l.tenant_id = rec.tid
      AND l.status NOT IN ('ganho', 'perdido')
      AND l.updated_at < cutoff
      AND l.arquivado_em IS NULL
      -- Don't re-alert if already alerted today
      AND NOT EXISTS (
        SELECT 1 FROM notificacoes n
        WHERE n.tenant_id = rec.tid
          AND n.titulo LIKE '%Lead%inativo%'
          AND n.mensagem LIKE '%' || COALESCE(l.nome, l.telefone, '') || '%'
          AND n.created_at > now() - INTERVAL '1 day'
      );

    GET DIAGNOSTICS alerted = ROW_COUNT;

    tenant_id := rec.tid;
    leads_alerted := alerted;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (for manual trigger from dashboard)
-- and service_role (for cron jobs)
GRANT EXECUTE ON FUNCTION public.detect_inactive_leads TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_inactive_leads TO service_role;
