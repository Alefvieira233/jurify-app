-- ============================================================================
-- Slash commands — tenant-editable routing table (Onda 2, Pipeline Unification)
--
-- Date:        2026-04-17
-- Context:     Auditoria 2026-04-17 flagged the hardcoded COMMANDS map inside
--              whatsapp-webhook/handlers/process-message.ts (7 commands:
--              /prazos, /processos, /documentos, /honorarios, /status,
--              /audiencias, /andamento). Editing them required a redeploy,
--              blocking tenant self-service.
--
-- This migration creates a DB-backed registry. Each row has optional tenant_id
-- (NULL = global default). Tenants can override a default by inserting a row
-- with their tenant_id and the same command text — the webhook queries
-- tenant-scoped first, then falls back to NULL (global).
--
-- Seeds mirror the previous hardcoded map so existing behavior is preserved
-- after deploy.
--
-- Idempotent:  CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.slash_commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,  -- NULL = global default
  command     TEXT NOT NULL,                                         -- e.g. '/prazos'
  agent_type  TEXT NOT NULL,                                         -- 'juridico' | 'analista_documentos' | ...
  intent      TEXT NOT NULL,                                         -- prompt-like instruction sent as user intent
  description TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slash_commands_command_format CHECK (command LIKE '/%')
);

-- A given tenant (or global) can only register each command once.
-- NOTE: Postgres treats NULL as distinct in UNIQUE — this is intentional:
--       it lets each tenant override the global default with their own row.
CREATE UNIQUE INDEX IF NOT EXISTS slash_commands_tenant_cmd_uniq
  ON public.slash_commands (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), command);

CREATE INDEX IF NOT EXISTS idx_slash_commands_tenant_active
  ON public.slash_commands (tenant_id, active) WHERE active = true;

-- Seed defaults (NULL tenant = global). These mirror the hardcoded COMMANDS map
-- that previously lived in whatsapp-webhook/handlers/process-message.ts so the
-- behavior is unchanged once the webhook switches to the DB lookup.
INSERT INTO public.slash_commands (tenant_id, command, agent_type, intent, description) VALUES
  (NULL, '/prazos',      'juridico',             'liste os prazos processuais do cliente com datas e urgência',                                    'Consultar prazos processuais'),
  (NULL, '/processos',   'juridico',             'liste os processos ativos do cliente com número, fase e tribunal',                                 'Listar processos'),
  (NULL, '/documentos',  'analista_documentos',  'informe quantos documentos o cliente tem no sistema e quais tipos',                                'Buscar documentos'),
  (NULL, '/honorarios',  'juridico',             'informe o status dos honorários do cliente: valores acordados, pagos e pendentes',                 'Consultar honorários'),
  (NULL, '/status',      'juridico',             'dê um resumo completo e organizado de todos os casos, prazos e pendências do cliente',             'Status completo'),
  (NULL, '/audiencias',  'juridico',             'liste as audiências e compromissos agendados do cliente nos próximos 60 dias',                     'Próximas audiências'),
  (NULL, '/andamento',   'juridico',             'descreva o andamento cronológico dos processos do cliente, do mais recente ao mais antigo',        'Último andamento')
ON CONFLICT DO NOTHING;

-- --- RLS ---
ALTER TABLE public.slash_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slash_commands FORCE ROW LEVEL SECURITY;

-- Authenticated users can read their tenant's rows + global defaults (NULL).
CREATE POLICY slash_commands_read
  ON public.slash_commands
  FOR SELECT
  TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_current_tenant_id());

-- Authenticated users can manage ONLY their own tenant's rows.
-- Global defaults (NULL tenant_id) can only be touched via service_role.
CREATE POLICY slash_commands_write
  ON public.slash_commands
  FOR ALL
  TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Service role bypass (explicit — matches pattern used across the codebase).
CREATE POLICY slash_commands_service
  ON public.slash_commands
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at trigger (if tenants want to track edits).
CREATE OR REPLACE FUNCTION public.slash_commands_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS slash_commands_touch_updated_at_trg ON public.slash_commands;
CREATE TRIGGER slash_commands_touch_updated_at_trg
  BEFORE UPDATE ON public.slash_commands
  FOR EACH ROW EXECUTE FUNCTION public.slash_commands_touch_updated_at();

COMMENT ON TABLE public.slash_commands IS
  'Tenant-editable slash command registry consumed by whatsapp-webhook. NULL tenant_id rows are global defaults; tenant-specific rows override them.';
