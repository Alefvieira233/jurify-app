-- Fix: system_settings table missing tenant_id column
-- The table was created after migration 20260113000002 ran,
-- so the conditional ADD COLUMN was skipped.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_settings'
      AND column_name = 'tenant_id'
  ) THEN
    -- Add tenant_id column
    ALTER TABLE public.system_settings ADD COLUMN tenant_id UUID;

    -- FK to tenants table (not profiles — multiple profiles per tenant)
    ALTER TABLE public.system_settings
      ADD CONSTRAINT fk_system_settings_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

    CREATE INDEX idx_system_settings_tenant_id ON public.system_settings(tenant_id);

    -- Replace unique(key) with unique(tenant_id, key) for multi-tenant
    ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'system_settings_tenant_key_unique'
    ) THEN
      ALTER TABLE public.system_settings
        ADD CONSTRAINT system_settings_tenant_key_unique UNIQUE (tenant_id, key);
    END IF;

    RAISE NOTICE 'Added tenant_id to system_settings';
  ELSE
    RAISE NOTICE 'system_settings.tenant_id already exists — skipping';
  END IF;
END $$;

-- RLS: tenant isolation
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_tenant_read" ON public.system_settings;
CREATE POLICY "system_settings_tenant_read" ON public.system_settings
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "system_settings_tenant_write" ON public.system_settings;
CREATE POLICY "system_settings_tenant_write" ON public.system_settings
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'administrador', 'owner', 'proprietario')
    )
  );
