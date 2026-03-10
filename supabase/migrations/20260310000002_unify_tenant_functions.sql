-- =============================================================================
-- Unify tenant lookup functions, fix is_admin(), and auto-assign admin role
--
-- 1. Add comments to get_user_tenant_id() and get_current_tenant_id() to
--    clarify their canonical usage (explicit user_id vs RLS auth.uid()).
-- 2. Fix is_admin() to check only for 'admin' (remove legacy 'administrador').
-- 3. Update handle_new_user() to auto-assign 'admin' role to the first user
--    in a tenant (tenant creator scenario), otherwise default to 'viewer'.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Unify tenant lookup functions with canonical comments
-- ---------------------------------------------------------------------------

-- get_user_tenant_id: canonical function for explicit user_id lookups.
-- Use this when you have a specific user_id (e.g., in Edge Functions, triggers).
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Canonical tenant lookup by explicit user_id.
  -- For RLS policies using auth.uid(), prefer get_current_tenant_id() instead.
  SELECT tenant_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- get_current_tenant_id: canonical function for RLS policies.
-- Uses auth.uid() to resolve the current user's tenant_id.
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Canonical tenant lookup for RLS policies using the current session user.
  -- For explicit user_id lookups, use get_user_tenant_id(_user_id) instead.
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Fix is_admin() — check only for 'admin' (enum already migrated)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _uid
      AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _uid
      AND ur.role = 'admin'
      AND ur.ativo = true
    );
$$;

-- ---------------------------------------------------------------------------
-- 3. Auto-assign admin to first tenant user in handle_new_user()
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _tenant_id uuid;
  _has_admin boolean;
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );

  -- Check if the user's tenant already has an admin
  SELECT tenant_id INTO _tenant_id
  FROM public.profiles WHERE id = NEW.id;

  IF _tenant_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE p.tenant_id = _tenant_id
      AND ur.role = 'admin'
      AND ur.ativo = true
    ) INTO _has_admin;
  ELSE
    _has_admin := false;
  END IF;

  -- First user in tenant gets admin, others get viewer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _has_admin THEN 'viewer' ELSE 'admin' END);

  RETURN NEW;
END;
$$;
