-- ============================================================================
-- CRITICAL: Restore on_auth_user_created trigger + backfill orphan users
--
-- ROOT CAUSE INVESTIGATION (2026-05-03):
-- The trigger `on_auth_user_created` on auth.users was missing in production.
-- Function public.handle_new_user() existed but was never invoked, so every
-- signup since the trigger was dropped left the user without profile/tenant/
-- user_role. Result: useRBAC() falls back to 'viewer' role, blocking the user
-- from /conexoes (and any other route requiring admin/manager).
--
-- 4 confirmed orphan users in auth.users (no profile, no tenant, no role):
--   - bruno.richardson41@gmail.com  (created 2026-05-02)
--   - ipsjota2@gmail.com            (created 2026-05-01)
--   - jaciradossantosgomes5@gmail.com (created 2026-04-27)
--   - sidney.correia@hclb.com       (created 2026-04-27)
--
-- This migration:
-- 1. Hardens handle_new_user() — wraps seed_default_agents in BEGIN/EXCEPTION
--    so that an agent-seeding failure never blocks the signup transaction.
-- 2. Recreates the trigger on_auth_user_created on auth.users.
-- 3. Backfills all orphan users (auth.users rows without a profile) by
--    invoking the now-resilient handle_new_user logic for each one.
-- ============================================================================

-- ============================================================
-- PART 1: Resilient handle_new_user()
-- Same logic as 20260405000005 + seed wrapped in safe sub-block.
-- Top-level still raises so any structural failure is visible.
-- ============================================================

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

  _slug := lower(regexp_replace(split_part(_user_email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
            || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Step 1: Check if invited to existing tenant
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- Step 2: Create new tenant if needed
  IF _tenant_id IS NULL THEN
    INSERT INTO public.tenants (nome, slug, plano, ativo)
    VALUES (_user_name, _slug, 'trial', true)
    RETURNING id INTO _tenant_id;
  END IF;

  -- Step 3: Create profile
  INSERT INTO public.profiles (id, nome_completo, email, tenant_id, role)
  VALUES (NEW.id, _user_name, _user_email, _tenant_id, 'admin')
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    email = EXCLUDED.email,
    tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id);

  -- Step 4: Determine role (first user of tenant = admin, others = viewer)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.tenant_id = _tenant_id
      AND ur.role IN ('admin', 'administrador')
      AND ur.ativo = true
      AND ur.user_id != NEW.id
  ) INTO _has_admin;

  _role := CASE WHEN _has_admin THEN 'viewer' ELSE 'admin' END;

  UPDATE public.profiles SET role = _role WHERE id = NEW.id;

  -- Step 5: Insert user_roles
  INSERT INTO public.user_roles (user_id, role, tenant_id, ativo)
  VALUES (NEW.id, _role, _tenant_id, true)
  ON CONFLICT DO NOTHING;

  -- Step 6: Seed default AI agents — NEVER block signup if this fails.
  -- Wrapped in sub-block with EXCEPTION so any agent-seeding error
  -- (missing column, RLS issue, etc.) is logged but doesn't roll back
  -- the user/tenant/profile creation.
  BEGIN
    PERFORM public.seed_default_agents(_tenant_id, NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] seed_default_agents failed for tenant % user %: % — %',
      _tenant_id, NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Trigger: creates tenant, profile, and role on auth.users INSERT. SECURITY DEFINER. Seed of default agents is non-blocking.';

-- ============================================================
-- PART 2: Recreate the trigger on auth.users
-- (it was missing in prod — root cause of orphan users)
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PART 3: Backfill orphan users (auth.users without profiles)
-- Inline the trigger logic for each orphan since we can't fire
-- INSERT triggers retroactively. Uses the same business rules.
-- ============================================================

DO $$
DECLARE
  _orphan RECORD;
  _tenant_id UUID;
  _user_name TEXT;
  _user_email TEXT;
  _slug TEXT;
BEGIN
  FOR _orphan IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    _user_email := COALESCE(_orphan.email, '');
    _user_name := COALESCE(
      _orphan.raw_user_meta_data->>'nome_completo',
      _orphan.raw_user_meta_data->>'full_name',
      split_part(_user_email, '@', 1)
    );

    _slug := lower(regexp_replace(split_part(_user_email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
              || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- Create tenant
    INSERT INTO public.tenants (nome, slug, plano, ativo)
    VALUES (_user_name, _slug, 'trial', true)
    RETURNING id INTO _tenant_id;

    -- Create profile (always admin — orphan = first user of own tenant)
    INSERT INTO public.profiles (id, nome_completo, email, tenant_id, role)
    VALUES (_orphan.id, _user_name, _user_email, _tenant_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET
      tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id),
      role = 'admin';

    -- Create user_role
    INSERT INTO public.user_roles (user_id, role, tenant_id, ativo)
    VALUES (_orphan.id, 'admin', _tenant_id, true)
    ON CONFLICT DO NOTHING;

    -- Seed agents (non-blocking)
    BEGIN
      PERFORM public.seed_default_agents(_tenant_id, _orphan.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[backfill] seed_default_agents failed for tenant % user %: %',
        _tenant_id, _orphan.id, SQLERRM;
    END;

    RAISE NOTICE '[backfill] Restored orphan user % (email %) → tenant %',
      _orphan.id, _user_email, _tenant_id;
  END LOOP;
END $$;
