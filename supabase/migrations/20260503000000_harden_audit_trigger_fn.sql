-- ============================================================================
-- Harden audit_trigger_fn() — defensive tenant_id extraction.
--
-- BUG: audit_trigger_fn() does `_tenant_id := NEW.tenant_id` unconditionally.
-- This breaks for tables where the row IS the tenant (public.tenants), or
-- any future tenant-less table. Caused all INSERTs into public.tenants to
-- fail, which in turn caused handle_new_user() to fail, which is why the
-- on_auth_user_created trigger was eventually dropped from prod.
--
-- FIX: Read tenant_id from to_jsonb(NEW/OLD) by key lookup. Falls back to
-- NEW.id when the table is `tenants` (the row identifies its own tenant).
--
-- This MUST run before the signup trigger restoration migration
-- (20260503000001_restore_signup_trigger_and_backfill_orphans.sql).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  _old_data JSONB := NULL;
  _new_data JSONB := NULL;
  _record_id TEXT;
  _changed TEXT[] := '{}';
  _tenant_id UUID := NULL;
  _key TEXT;
  _tenant_text TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _old_data := to_jsonb(OLD);
    _record_id := COALESCE(_old_data->>'id', 'unknown');
  ELSIF TG_OP = 'INSERT' THEN
    _new_data := to_jsonb(NEW);
    _record_id := COALESCE(_new_data->>'id', 'unknown');
  ELSIF TG_OP = 'UPDATE' THEN
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    _record_id := COALESCE(_new_data->>'id', 'unknown');

    FOR _key IN SELECT jsonb_object_keys(_new_data)
    LOOP
      IF _old_data->_key IS DISTINCT FROM _new_data->_key THEN
        _changed := array_append(_changed, _key);
      END IF;
    END LOOP;
  END IF;

  -- Defensive tenant_id extraction: only if the column exists in the row.
  -- For the `tenants` table itself, the row IS the tenant (use id).
  IF TG_TABLE_NAME = 'tenants' THEN
    _tenant_text := COALESCE(_new_data->>'id', _old_data->>'id');
  ELSE
    _tenant_text := COALESCE(_new_data->>'tenant_id', _old_data->>'tenant_id');
  END IF;

  IF _tenant_text IS NOT NULL AND _tenant_text <> '' THEN
    BEGIN
      _tenant_id := _tenant_text::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      _tenant_id := NULL;
    END;
  END IF;

  IF _old_data IS NOT NULL THEN
    _old_data := _old_data - 'password' - 'senha' - 'access_token' - 'refresh_token';
  END IF;
  IF _new_data IS NOT NULL THEN
    _new_data := _new_data - 'password' - 'senha' - 'access_token' - 'refresh_token';
  END IF;

  INSERT INTO public.audit_log (
    table_name, record_id, operation,
    old_data, new_data, changed_fields,
    user_id, tenant_id, ip_address
  ) VALUES (
    TG_TABLE_NAME, _record_id, TG_OP,
    _old_data, _new_data, _changed,
    auth.uid(), _tenant_id, inet_client_addr()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.audit_trigger_fn IS
  'Generic audit trigger. Defensively reads tenant_id from JSONB to support tables without that column (e.g. tenants itself).';
