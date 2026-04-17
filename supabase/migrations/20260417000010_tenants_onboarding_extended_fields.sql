-- ============================================================================
-- tenants — extended fields for onboarding step 2 (Escritorio)
--
-- Date:        2026-04-17
-- Context:     Onda 2 onboarding asks for CNPJ + endereco + telefone_principal
--              + logo upload during step 2. Existing tenants schema only had
--              nome/email/telefone/logo_url — extend it with typed, nullable
--              fields so the form can save without losing data.
--
-- Idempotent:  Uses ADD COLUMN IF NOT EXISTS throughout. No data mutation.
-- Storage:     Creates bucket tenant-assets (private) with per-tenant RLS.
-- Tracking:    profiles.onboarding_step tracks granular wizard progress
--              (0..6); 7 means completed. system_settings.onboarding_wizard_completed
--              remains the authoritative "done" flag for back-compat.
-- ============================================================================

-- ─── 1. tenants: extended onboarding fields ────────────────────────────────

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS telefone_principal text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Loose CNPJ format check: 14 digits with optional mask. NULL stays valid.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_cnpj_format_chk'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_cnpj_format_chk
      CHECK (
        cnpj IS NULL
        OR cnpj ~ '^\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}$'
      );
  END IF;
END $$;

COMMENT ON COLUMN public.tenants.cnpj IS
  'Brazilian CNPJ (14 digits). Stored with or without mask — normalized on read.';
COMMENT ON COLUMN public.tenants.endereco IS
  'Optional postal address captured during onboarding step 2.';
COMMENT ON COLUMN public.tenants.telefone_principal IS
  'Primary phone for the firm. Separate from tenants.telefone (billing contact).';
COMMENT ON COLUMN public.tenants.onboarding_completed_at IS
  'Set when the wizard reaches step 7 (Done). NULL means wizard not yet completed.';

-- ─── 2. profiles: granular onboarding progress ────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step smallint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_onboarding_step_range_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_onboarding_step_range_chk
      CHECK (onboarding_step >= 0 AND onboarding_step <= 7);
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.onboarding_step IS
  'Current onboarding wizard step (0=welcome .. 6=agents, 7=done). Lets users resume where they left off.';

-- ─── 3. storage: tenant-assets bucket for logos ───────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: tenant-assets/<tenant_id>/logo.<ext>
-- First path segment = tenant_id, which is the standard pattern used by
-- every other bucket in this project (documents, whatsapp-media, etc.).

DROP POLICY IF EXISTS tenant_assets_select ON storage.objects;
CREATE POLICY tenant_assets_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1]::uuid = public.get_current_tenant_id()
  );

DROP POLICY IF EXISTS tenant_assets_insert ON storage.objects;
CREATE POLICY tenant_assets_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1]::uuid = public.get_current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
  );

DROP POLICY IF EXISTS tenant_assets_update ON storage.objects;
CREATE POLICY tenant_assets_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1]::uuid = public.get_current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
  );

DROP POLICY IF EXISTS tenant_assets_delete ON storage.objects;
CREATE POLICY tenant_assets_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1]::uuid = public.get_current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
  );
