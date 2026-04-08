-- Add automation_tasks cleanup to the master data retention function.
-- Completed tasks older than 30 days are deleted; failed tasks kept for 90 days.

CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS TABLE(table_name text, rows_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted bigint;
BEGIN
  -- notification_reads: 30 days
  DELETE FROM public.notification_reads
  WHERE read_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'notification_reads'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- agent_memory: low-importance older than 30 days
  DELETE FROM public.agent_memory
  WHERE importance < 3 AND created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'agent_memory(low)'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- agent_ai_logs: 90 days
  DELETE FROM public.agent_ai_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'agent_ai_logs'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- agent_executions: 90 days
  DELETE FROM public.agent_executions
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'agent_executions'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- automation_executions: 90 days
  DELETE FROM public.automation_executions
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'automation_executions'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- automation_tasks: completed 30 days, failed 90 days
  DELETE FROM public.automation_tasks
  WHERE (status = 'completed' AND created_at < now() - interval '30 days')
     OR (status = 'failed' AND created_at < now() - interval '90 days')
     OR (status NOT IN ('completed', 'failed', 'pending', 'running') AND created_at < now() - interval '30 days');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'automation_tasks'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- google_calendar_sync_logs: 30 days
  DELETE FROM public.google_calendar_sync_logs
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'google_calendar_sync_logs'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- zapsign_logs: 90 days
  DELETE FROM public.zapsign_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'zapsign_logs'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- webhook_events: 7 days (idempotency window)
  DELETE FROM public.webhook_events
  WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'webhook_events'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- rate_limits: expired windows
  DELETE FROM public.rate_limits
  WHERE updated_at < now() - interval '1 day';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'rate_limits'; rows_deleted := v_deleted;
  RETURN NEXT;

  -- assistant_audit: 90 days
  DELETE FROM public.assistant_audit
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'assistant_audit'; rows_deleted := v_deleted;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_data IS
  'Master data retention function — enforces TTL on all log/ephemeral tables including automation_tasks. Run via pg_cron daily.';
