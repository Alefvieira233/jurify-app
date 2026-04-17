-- Migration: processo_andamentos
-- Integração tribunal/CNJ: armazena andamentos (movimentações) de processos
-- vindos de providers externos (Escavador, Codilo, Jusbrasil) ou manuais.
--
-- Notas:
--   - UNIQUE (processo_id, provider, external_id) é o dedup guard para o
--     edge function tribunal-sync que faz upsert de movimentações novas.
--   - raw JSONB guarda o payload original do provider para replay/debug.
--   - RLS: SELECT escopo por tenant (authenticated), WRITE via service_role
--     (edge function com service key) — usuários não escrevem direto.

CREATE TABLE IF NOT EXISTS public.processo_andamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id     UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  data_andamento  TIMESTAMPTZ NOT NULL,
  tipo            TEXT CHECK (tipo IN (
    'movimento', 'decisao', 'despacho', 'audiencia', 'sentenca', 'other'
  )),
  descricao       TEXT NOT NULL,
  orgao           TEXT,
  raw             JSONB,
  external_id     TEXT,
  provider        TEXT NOT NULL DEFAULT 'unknown',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (processo_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_processo_andamentos_processo_data
  ON public.processo_andamentos (processo_id, data_andamento DESC);

CREATE INDEX IF NOT EXISTS idx_processo_andamentos_tenant_data
  ON public.processo_andamentos (tenant_id, data_andamento DESC);

ALTER TABLE public.processo_andamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_andamentos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS processo_andamentos_tenant_read ON public.processo_andamentos;
CREATE POLICY processo_andamentos_tenant_read ON public.processo_andamentos
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS processo_andamentos_service_write ON public.processo_andamentos;
CREATE POLICY processo_andamentos_service_write ON public.processo_andamentos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sync metadata on processos: last_sync_at (queried by cron to find stale),
-- sync_provider (which provider was used), sync_error (last error message).
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS last_sync_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_provider TEXT,
  ADD COLUMN IF NOT EXISTS sync_error    TEXT;

CREATE INDEX IF NOT EXISTS idx_processos_last_sync_at
  ON public.processos (last_sync_at NULLS FIRST)
  WHERE status = 'ativo' AND numero_processo IS NOT NULL;

COMMENT ON TABLE public.processo_andamentos IS
  'Andamentos (movimentações) de processos puxados de providers externos (Escavador/Codilo/Jusbrasil) ou manuais. Dedup via UNIQUE(processo_id,provider,external_id).';
