-- ============================================
-- Add missing FK constraints to utility tables
-- ============================================
-- Tables identified with Relationships: [] in types.ts
-- that have clear FK candidates (tenant_id, user_id, etc.)
--
-- Uses DO $$ ... EXCEPTION WHEN duplicate_object ... $$ pattern
-- for full idempotency.
-- ============================================

-- 1. api_keys.criado_por → profiles(id) ON DELETE SET NULL
DO $$ BEGIN
  ALTER TABLE public.api_keys
    ADD CONSTRAINT api_keys_criado_por_fkey
    FOREIGN KEY (criado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 2. assistant_audit.tenant_id → tenants(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.assistant_audit
    ADD CONSTRAINT assistant_audit_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 3. assistant_audit.user_id → profiles(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.assistant_audit
    ADD CONSTRAINT assistant_audit_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 4. assistant_conversations.tenant_id → tenants(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.assistant_conversations
    ADD CONSTRAINT assistant_conversations_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 5. assistant_conversations.user_id → profiles(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.assistant_conversations
    ADD CONSTRAINT assistant_conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 6. integracoes_externas.tenant_id → tenants(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.integracoes_externas
    ADD CONSTRAINT integracoes_externas_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 7. document_hashes.tenant_id → tenants(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.document_hashes
    ADD CONSTRAINT document_hashes_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 8. document_hashes.signed_by → profiles(id) ON DELETE SET NULL
DO $$ BEGIN
  ALTER TABLE public.document_hashes
    ADD CONSTRAINT document_hashes_signed_by_fkey
    FOREIGN KEY (signed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 9. google_calendar_settings.user_id → profiles(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.google_calendar_settings
    ADD CONSTRAINT google_calendar_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 10. google_calendar_sync_log.user_id → profiles(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.google_calendar_sync_log
    ADD CONSTRAINT google_calendar_sync_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 11. google_calendar_sync_log.agendamento_id → agendamentos(id) ON DELETE SET NULL
DO $$ BEGIN
  ALTER TABLE public.google_calendar_sync_log
    ADD CONSTRAINT google_calendar_sync_log_agendamento_id_fkey
    FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 12. logs_execucao_agentes.agente_id → agentes_ia(id) ON DELETE SET NULL
DO $$ BEGIN
  ALTER TABLE public.logs_execucao_agentes
    ADD CONSTRAINT logs_execucao_agentes_agente_id_fkey
    FOREIGN KEY (agente_id) REFERENCES public.agentes_ia(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 13. logs_execucao_agentes.tenant_id → tenants(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.logs_execucao_agentes
    ADD CONSTRAINT logs_execucao_agentes_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 14. notificacoes.tenant_id → tenants(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.notificacoes
    ADD CONSTRAINT notificacoes_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 15. notificacoes.created_by → profiles(id) ON DELETE SET NULL
DO $$ BEGIN
  ALTER TABLE public.notificacoes
    ADD CONSTRAINT notificacoes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 16. notification_templates.created_by → profiles(id) ON DELETE SET NULL
DO $$ BEGIN
  ALTER TABLE public.notification_templates
    ADD CONSTRAINT notification_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 17. user_permissions.tenant_id → tenants(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.user_permissions
    ADD CONSTRAINT user_permissions_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 18. user_permissions.user_id → profiles(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 19. user_roles.user_id → profiles(id) ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 20. system_settings.updated_by → profiles(id) ON DELETE SET NULL
DO $$ BEGIN
  ALTER TABLE public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
          WHEN datatype_mismatch THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- 21. subscriptions.plan_id → subscription_plans(id) — already exists per types.ts, skip

-- ============================================
-- Supporting indexes for new FK columns
-- Wrapped in DO blocks to skip missing tables
-- ============================================
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_assistant_audit_tenant_id ON public.assistant_audit(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_assistant_audit_user_id ON public.assistant_audit(user_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_assistant_conversations_tenant_id ON public.assistant_conversations(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_id ON public.assistant_conversations(user_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_document_hashes_tenant_id ON public.document_hashes(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_google_calendar_settings_user_id ON public.google_calendar_settings(user_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_log_user_id ON public.google_calendar_sync_log(user_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_logs_execucao_agentes_agente_id ON public.logs_execucao_agentes(agente_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_logs_execucao_agentes_tenant_id ON public.logs_execucao_agentes(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant_id ON public.notificacoes(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON public.notification_templates(created_by); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant_id ON public.user_permissions(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON public.system_settings(updated_by); EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;
