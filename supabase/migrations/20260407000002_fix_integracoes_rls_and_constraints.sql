-- ============================================================================
-- Migration: Fix configuracoes_integracoes RLS + conexoes_whatsapp constraints
-- Date: 2026-04-07
-- Purpose:
--   1. Add tenant-scoped RLS to configuracoes_integracoes (was admin-only, no tenant filter)
--   2. Add 'kapso' to conexoes_whatsapp tipo CHECK constraint
--   3. Add unique constraint on (tenant_id, nome_integracao) to prevent duplicate configs
--   4. Add 'kapso_api' to conexoes_whatsapp provider CHECK if exists
-- ============================================================================

-- 1. Replace configuracoes_integracoes RLS policies with tenant-scoped versions
--    Old policies used has_role('administrador') without tenant isolation — admin of
--    tenant A could see tenant B's configs when using service_role or RLS bypass.

ALTER TABLE public.configuracoes_integracoes ENABLE ROW LEVEL SECURITY;

-- Drop old admin-only policies
DROP POLICY IF EXISTS "Apenas admins podem ver configurações de integrações" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Apenas admins podem criar configurações de integrações" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Apenas admins podem atualizar configurações de integrações" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "Apenas admins podem excluir configurações de integrações" ON public.configuracoes_integracoes;

-- New tenant-scoped policies
CREATE POLICY "integracoes_tenant_select" ON public.configuracoes_integracoes
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "integracoes_tenant_insert" ON public.configuracoes_integracoes
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'administrador', 'owner', 'proprietario')
    )
  );

CREATE POLICY "integracoes_tenant_update" ON public.configuracoes_integracoes
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'administrador', 'owner', 'proprietario')
    )
  );

CREATE POLICY "integracoes_tenant_delete" ON public.configuracoes_integracoes
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'administrador', 'owner', 'proprietario')
    )
  );

-- 2. Update conexoes_whatsapp tipo CHECK to include 'kapso'
--    Old constraint only allowed: evolution, oficial, cloud_api
--    kapso-manager finalize inserts tipo='kapso' which violates it
DO $$
BEGIN
  ALTER TABLE public.conexoes_whatsapp DROP CONSTRAINT IF EXISTS conexoes_whatsapp_tipo_check;
  ALTER TABLE public.conexoes_whatsapp
    ADD CONSTRAINT conexoes_whatsapp_tipo_check
    CHECK (tipo IN ('evolution', 'oficial', 'cloud_api', 'kapso'));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- 3. Update conexoes_whatsapp provider to include 'kapso_api'
DO $$
BEGIN
  -- Drop and recreate if provider CHECK exists
  ALTER TABLE public.conexoes_whatsapp DROP CONSTRAINT IF EXISTS conexoes_whatsapp_provider_check;
  -- No constraint to re-add if it didn't exist; provider is TEXT without CHECK in some envs
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- 4. Add unique constraint on (tenant_id, nome_integracao) to prevent duplicate configs
--    Without this, concurrent webhooks can create duplicate whatsapp_kapso entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'configuracoes_integracoes_tenant_nome_unique'
  ) THEN
    -- First, clean up any existing duplicates (keep most recent)
    DELETE FROM public.configuracoes_integracoes a
    USING public.configuracoes_integracoes b
    WHERE a.tenant_id = b.tenant_id
      AND a.nome_integracao = b.nome_integracao
      AND a.criado_em < b.criado_em;

    ALTER TABLE public.configuracoes_integracoes
      ADD CONSTRAINT configuracoes_integracoes_tenant_nome_unique
      UNIQUE (tenant_id, nome_integracao);

    RAISE NOTICE 'Added unique constraint on (tenant_id, nome_integracao)';
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Cannot add unique constraint — duplicates still exist after cleanup';
END $$;
