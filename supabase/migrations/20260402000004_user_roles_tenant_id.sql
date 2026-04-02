-- Add tenant_id to user_roles for direct tenant isolation
-- Previously relied on JOIN to profiles for tenant checking via RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN tenant_id UUID;

    -- Backfill from profiles
    UPDATE public.user_roles ur SET tenant_id = p.tenant_id
    FROM public.profiles p WHERE p.id = ur.user_id;

    -- Make NOT NULL after backfill
    ALTER TABLE public.user_roles ALTER COLUMN tenant_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id);

    -- Update unique constraint
    ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_role_tenant_key UNIQUE(user_id, role, tenant_id);
  END IF;
END $$;

-- Update RLS to use direct tenant_id
DROP POLICY IF EXISTS "rls_user_roles_select" ON public.user_roles;
CREATE POLICY "rls_user_roles_select" ON public.user_roles
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
);

DROP POLICY IF EXISTS "rls_user_roles_insert" ON public.user_roles;
CREATE POLICY "rls_user_roles_insert" ON public.user_roles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
);

DROP POLICY IF EXISTS "rls_user_roles_update" ON public.user_roles;
CREATE POLICY "rls_user_roles_update" ON public.user_roles
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
);

DROP POLICY IF EXISTS "rls_user_roles_delete" ON public.user_roles;
CREATE POLICY "rls_user_roles_delete" ON public.user_roles
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND tenant_id = public.get_current_tenant_id()
  AND public.has_permission(auth.uid(), 'usuarios', 'manage')
);
