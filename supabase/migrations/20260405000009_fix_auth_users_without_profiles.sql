-- ============================================================================
-- Fix auth.users that exist but have NO profile in public.profiles
-- Uses session_replication_role to bypass user-created triggers.
-- ============================================================================

-- Bypass user triggers (NOT system/FK triggers)
SET session_replication_role = 'replica';

-- Create tenants + profiles + roles for orphan auth users
DO $$
DECLARE
  _user RECORD;
  _tenant_id UUID;
  _slug TEXT;
  _name TEXT;
  _count INT := 0;
BEGIN
  FOR _user IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    _name := COALESCE(
      _user.raw_user_meta_data->>'nome_completo',
      _user.raw_user_meta_data->>'full_name',
      split_part(COALESCE(_user.email, 'user'), '@', 1)
    );

    _slug := lower(regexp_replace(split_part(COALESCE(_user.email, 'user'), '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
              || '-' || substr(gen_random_uuid()::text, 1, 8);

    INSERT INTO public.tenants (nome, slug, plano, ativo)
    VALUES (_name, _slug, 'trial', true)
    RETURNING id INTO _tenant_id;

    INSERT INTO public.profiles (id, nome_completo, email, tenant_id, role)
    VALUES (_user.id, _name, _user.email, _tenant_id, 'admin');

    INSERT INTO public.user_roles (user_id, role, tenant_id, ativo)
    VALUES (_user.id, 'admin', _tenant_id, true)
    ON CONFLICT DO NOTHING;

    _count := _count + 1;
    RAISE NOTICE 'Fixed orphan: % → tenant %', _user.email, _tenant_id;
  END LOOP;

  RAISE NOTICE 'Total fixed: %', _count;
END;
$$;

-- Restore normal trigger behavior
SET session_replication_role = 'origin';
