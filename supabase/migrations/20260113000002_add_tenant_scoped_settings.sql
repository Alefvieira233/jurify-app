-- Add tenant scoping for integrations, settings, api keys, and interactions

-- 1) configuracoes_integracoes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'configuracoes_integracoes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'configuracoes_integracoes' AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE public.configuracoes_integracoes ADD COLUMN tenant_id UUID;
      ALTER TABLE public.configuracoes_integracoes
        ADD CONSTRAINT fk_configuracoes_integracoes_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.profiles(tenant_id);
      CREATE INDEX idx_configuracoes_integracoes_tenant_id
        ON public.configuracoes_integracoes(tenant_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'configuracoes_integracoes' AND column_name = 'phone_number_id'
    ) THEN
      ALTER TABLE public.configuracoes_integracoes ADD COLUMN phone_number_id TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'configuracoes_integracoes' AND column_name = 'verify_token'
    ) THEN
      ALTER TABLE public.configuracoes_integracoes ADD COLUMN verify_token TEXT;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_configuracoes_integracoes_phone_number_id
      ON public.configuracoes_integracoes(phone_number_id);

    UPDATE public.configuracoes_integracoes
    SET tenant_id = COALESCE(
      (SELECT tenant_id FROM public.profiles LIMIT 1),
      '00000000-0000-0000-0000-000000000000'::UUID
    )
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- 2) api_keys
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_keys'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'api_keys' AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE public.api_keys ADD COLUMN tenant_id UUID;
      ALTER TABLE public.api_keys
        ADD CONSTRAINT fk_api_keys_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.profiles(tenant_id);
      CREATE INDEX idx_api_keys_tenant_id ON public.api_keys(tenant_id);
    END IF;

    UPDATE public.api_keys
    SET tenant_id = COALESCE(
      (SELECT tenant_id FROM public.profiles LIMIT 1),
      '00000000-0000-0000-0000-000000000000'::UUID
    )
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- 3) system_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'system_settings' AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE public.system_settings ADD COLUMN tenant_id UUID;
      ALTER TABLE public.system_settings
        ADD CONSTRAINT fk_system_settings_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.profiles(tenant_id);
      CREATE INDEX idx_system_settings_tenant_id ON public.system_settings(tenant_id);
    END IF;

    UPDATE public.system_settings
    SET tenant_id = COALESCE(
      (SELECT tenant_id FROM public.profiles LIMIT 1),
      '00000000-0000-0000-0000-000000000000'::UUID
    )
    WHERE tenant_id IS NULL;

    -- Replace unique(key) with unique(tenant_id, key)
    ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'system_settings_tenant_key_unique'
    ) THEN
      ALTER TABLE public.system_settings
        ADD CONSTRAINT system_settings_tenant_key_unique UNIQUE (tenant_id, key);
    END IF;
  END IF;
END $$;

-- 4) notification_templates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notification_templates'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'notification_templates' AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE public.notification_templates ADD COLUMN tenant_id UUID;
      ALTER TABLE public.notification_templates
        ADD CONSTRAINT fk_notification_templates_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.profiles(tenant_id);
      CREATE INDEX idx_notification_templates_tenant_id
        ON public.notification_templates(tenant_id);
    END IF;

    UPDATE public.notification_templates
    SET tenant_id = COALESCE(
      (SELECT tenant_id FROM public.profiles LIMIT 1),
      '00000000-0000-0000-0000-000000000000'::UUID
    )
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- 5) lead_interactions (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lead_interactions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'lead_interactions' AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE public.lead_interactions ADD COLUMN tenant_id UUID;
      ALTER TABLE public.lead_interactions
        ADD CONSTRAINT fk_lead_interactions_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.profiles(tenant_id);
      CREATE INDEX idx_lead_interactions_tenant_id
        ON public.lead_interactions(tenant_id);
    END IF;

    UPDATE public.lead_interactions
    SET tenant_id = COALESCE(
      (SELECT tenant_id FROM public.profiles LIMIT 1),
      '00000000-0000-0000-0000-000000000000'::UUID
    )
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- 6) Update system setting functions to be tenant-aware
CREATE OR REPLACE FUNCTION public.get_system_setting(_key TEXT, _tenant_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value
  FROM system_settings
  WHERE key = _key AND tenant_id = _tenant_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.update_system_setting(_key TEXT, _value TEXT, _user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE system_settings
  SET value = _value, updated_by = _user_id, updated_at = now()
  WHERE key = _key AND tenant_id = _tenant_id;

  RETURN FOUND;
END;
$$;

-- 7) Ensure tenant_id auto-assign triggers if helper exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_tenant_id_from_user') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracoes_integracoes') THEN
      DROP TRIGGER IF EXISTS set_tenant_id_configuracoes_integracoes ON public.configuracoes_integracoes;
      CREATE TRIGGER set_tenant_id_configuracoes_integracoes
        BEFORE INSERT ON public.configuracoes_integracoes
        FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
      DROP TRIGGER IF EXISTS set_tenant_id_api_keys ON public.api_keys;
      CREATE TRIGGER set_tenant_id_api_keys
        BEFORE INSERT ON public.api_keys
        FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
      DROP TRIGGER IF EXISTS set_tenant_id_system_settings ON public.system_settings;
      CREATE TRIGGER set_tenant_id_system_settings
        BEFORE INSERT ON public.system_settings
        FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_templates') THEN
      DROP TRIGGER IF EXISTS set_tenant_id_notification_templates ON public.notification_templates;
      CREATE TRIGGER set_tenant_id_notification_templates
        BEFORE INSERT ON public.notification_templates
        FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_interactions') THEN
      DROP TRIGGER IF EXISTS set_tenant_id_lead_interactions ON public.lead_interactions;
      CREATE TRIGGER set_tenant_id_lead_interactions
        BEFORE INSERT ON public.lead_interactions
        FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
    END IF;
  END IF;
END $$;
