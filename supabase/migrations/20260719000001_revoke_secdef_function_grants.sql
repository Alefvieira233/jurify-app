-- ============================================================================
-- 20260719000001_revoke_secdef_function_grants.sql
-- Auditoria 2026-07-19 — fecha os 180+ advisors de segurança do Supabase:
--   anon_security_definer_function_executable (87 funções)
--   authenticated_security_definer_function_executable (91 funções)
--
-- Postgres concede EXECUTE a PUBLIC por default em toda função criada; como
-- todas estas são SECURITY DEFINER expostas via /rest/v1/rpc, qualquer
-- visitante anônimo podia invocá-las (ex.: apply_rls_defaults, expire_trials,
-- claim_next_job). Estratégia em 3 camadas, curada contra os call-sites reais
-- do frontend (src/**/*.rpc) e das edge functions (supabase/functions/**/*.rpc):
--
--   1. INTERNAS (triggers + manutenção/cron): REVOKE de PUBLIC, anon e
--      authenticated. Trigger functions não exigem EXECUTE do caller em
--      runtime (checado só no CREATE TRIGGER); manutenção roda via
--      service_role, que recebe GRANT explícito.
--   2. RPCs DA APLICAÇÃO (chamadas pelo app logado ou por edge functions com
--      JWT do usuário): REVOKE apenas de PUBLIC e anon — nenhuma página
--      pública chama RPC (verificado em src/pages/StatusPublic|Precos|Auth).
--   3. HELPERS DE RLS (is_admin, has_role, get_current_tenant_id etc.):
--      intocados — são referenciados por policies avaliadas como o role da
--      query; revogar anon poderia transformar SELECTs públicos em erro.
--
-- Reversível: re-GRANT EXECUTE resolve qualquer regressão pontual.
-- ============================================================================

-- Camada 1 — internas (triggers + manutenção): só service_role executa.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        -- trigger functions
        'audit_trigger_fn',
        'auto_generate_contract_on_won',
        'auto_qualify_lead_on_agendamento',
        'auto_schedule_followup',
        'create_trial_subscription',
        'fn_agendamento_auto_kanban',
        'fn_agendamento_auto_tarefa',
        'fn_encrypt_whatsapp_content',
        'handle_new_user',
        'notify_automation_execution',
        'notify_lead_assignment_change',
        'notify_lead_priority_change',
        'notify_lead_status_change',
        'notify_new_lead',
        'on_soft_delete',
        'propagate_message_sentiment_to_conv',
        'record_lead_history',
        'set_tenant_id_from_user',
        'sync_conversation_from_lead',
        'sync_lead_from_conversation',
        'update_conversation_last_inbound',
        'update_lead_last_activity',
        -- manutenção / cron / uso exclusivo de service_role
        'apply_rls_defaults',
        'archive_old_audit_logs',
        'archive_old_whatsapp_messages',
        'check_prazos_vencendo',
        'claim_next_job',
        'cleanup_expired_data',
        'cleanup_old_webhook_events',
        'cleanup_retention_logs',
        'complete_job',
        'count_distinct_emails',
        'decrypt_sensitive',
        'detect_inactive_leads',
        'encrypt_sensitive',
        'ensure_policy',
        'expire_trials',
        'fail_job',
        'mark_overdue_followups',
        'release_stale_locks',
        'seed_default_agents',
        'seed_default_agents_v2'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;

-- Camada 2 — RPCs da aplicação: bloqueia anon, preserva authenticated.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'buscar_agente_para_execucao',
        'buscar_logs_atividades',
        'check_rate_limit',
        'contar_nao_lidas',
        'find_lead_by_phone',
        'get_active_executions',
        'get_agendamentos_metrics',
        'get_agentes_metrics',
        'get_audit_recent',
        'get_contratos_metrics',
        'get_dashboard_metrics',
        'get_honorarios_dashboard',
        'get_leads_operacional',
        'get_leads_por_area',
        'get_trial_status',
        'get_user_calendar_settings',
        'get_whatsapp_window_status',
        'increment_ai_token_split',
        'increment_ai_usage',
        'increment_quick_reply_use',
        'increment_unread_count',
        'list_whatsapp_templates',
        'marcar_notificacao_lida',
        'marcar_todas_lidas',
        'mark_ai_usage_alert_sent',
        'match_legal_documents',
        'registrar_log_atividade',
        'search_agent_memory',
        'search_whatsapp_messages',
        'toggle_pin_whatsapp_message',
        'update_conversation_phase',
        'update_system_setting',
        'validate_api_key_v2',
        'verify_document_hash'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
  END LOOP;
END $$;

-- Camada 3 (documentação): helpers de RLS mantidos com EXECUTE para anon +
-- authenticated de propósito — auth.uid() retorna NULL para anon e as policies
-- continuam negando acesso; revogar aqui viraria "permission denied" em vez de
-- resultado vazio: current_tenant_id, get_current_tenant_id, get_user_tenant_id,
-- get_system_setting, has_permission, has_role, is_admin, is_admin_or_manager,
-- is_admin_user, is_feature_enabled, is_google_token_expired.
