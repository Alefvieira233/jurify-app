-- ============================================================================
-- Fix orphan profiles (users created before handle_new_user fix)
-- These profiles have NULL tenant_id because the old trigger didn't create tenants.
-- Also backfill user_roles for users without roles.
-- ============================================================================

-- Step 1: Create tenants for profiles without one
DO $$
DECLARE
  _profile RECORD;
  _new_tenant_id UUID;
  _slug TEXT;
BEGIN
  FOR _profile IN
    SELECT id, email, nome_completo
    FROM public.profiles
    WHERE tenant_id IS NULL
  LOOP
    -- Generate slug from email
    _slug := lower(regexp_replace(split_part(_profile.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
              || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- Create tenant
    INSERT INTO public.tenants (nome, slug, plano, ativo)
    VALUES (
      COALESCE(_profile.nome_completo, split_part(_profile.email, '@', 1)),
      _slug,
      'trial',
      true
    )
    RETURNING id INTO _new_tenant_id;

    -- Update profile with tenant_id
    UPDATE public.profiles
    SET tenant_id = _new_tenant_id,
        role = 'admin'
    WHERE id = _profile.id;

    -- Ensure user_roles exists
    INSERT INTO public.user_roles (user_id, role, tenant_id, ativo)
    VALUES (_profile.id, 'admin', _new_tenant_id, true)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Fixed orphan profile % → tenant %', _profile.email, _new_tenant_id;
  END LOOP;
END;
$$;

-- Step 2: Also fix user_roles without tenant_id
UPDATE public.user_roles ur
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ur.user_id = p.id
  AND ur.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;
