-- ============================================================================
-- FIX: handle_new_user() fails because tenants.slug is NOT NULL
-- The previous version of the trigger tried to INSERT into tenants without
-- providing slug, which causes a NOT NULL violation.
-- Also: the EXCEPTION handler was silently swallowing the error, making
-- the auth.users INSERT succeed but leaving profile/role empty → 503.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _tenant_id UUID;
  _has_admin BOOLEAN;
  _user_name TEXT;
  _user_email TEXT;
  _role TEXT;
  _slug TEXT;
BEGIN
  _user_email := COALESCE(NEW.email, '');
  _user_name := COALESCE(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'full_name',
    split_part(_user_email, '@', 1)
  );

  -- Generate a unique slug from email prefix + random suffix
  _slug := lower(regexp_replace(split_part(_user_email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
            || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Step 1: Check if user was invited to an existing tenant
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- Step 2: If no tenant from invite, create a new one
  IF _tenant_id IS NULL THEN
    INSERT INTO public.tenants (nome, slug, plano, ativo)
    VALUES (_user_name, _slug, 'trial', true)
    RETURNING id INTO _tenant_id;
  END IF;

  -- Step 3: Create profile WITH tenant_id
  INSERT INTO public.profiles (id, nome_completo, email, tenant_id, role)
  VALUES (NEW.id, _user_name, _user_email, _tenant_id, 'admin')
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    email = EXCLUDED.email,
    tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id);

  -- Step 4: Check if tenant already has an admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.tenant_id = _tenant_id
      AND ur.role IN ('admin', 'administrador')
      AND ur.ativo = true
      AND ur.user_id != NEW.id  -- exclude current user
  ) INTO _has_admin;

  _role := CASE WHEN _has_admin THEN 'viewer' ELSE 'admin' END;

  -- Update profile role
  UPDATE public.profiles SET role = _role WHERE id = NEW.id;

  -- Step 5: Insert user_roles
  INSERT INTO public.user_roles (user_id, role, tenant_id, ativo)
  VALUES (NEW.id, _role, _tenant_id, true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- NOTE: Removed the EXCEPTION handler intentionally.
-- If signup fails, we WANT the error to propagate so we can debug it.
-- A silent failure is worse than a visible 503.
