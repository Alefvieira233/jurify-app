-- Audit trigger fix: resolve tenant_id via profiles lookup quando a tabela
-- não tem coluna tenant_id (ex: google_calendar_tokens só tem user_id).
-- Antes: NULL fazia INSERT em audit_log falhar com NOT NULL constraint.
-- Agora: tenta lookup. Se ainda NULL, skipa o audit em vez de falhar a operação.

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  _old_data JSONB := NULL;
  _new_data JSONB := NULL;
  _record_id TEXT;
  _changed TEXT[] := '{}';
  _tenant_id UUID := NULL;
  _key TEXT;
  _tenant_text TEXT;
  _user_text TEXT;
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

  -- Tenant resolution layered:
  -- 1) tabela `tenants`: row IS the tenant (use id)
  -- 2) coluna tenant_id direta na row
  -- 3) lookup via user_id → profiles.tenant_id (cobre google_calendar_tokens etc.)
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

  IF _tenant_id IS NULL THEN
    _user_text := COALESCE(_new_data->>'user_id', _old_data->>'user_id');
    IF _user_text IS NOT NULL AND _user_text <> '' THEN
      BEGIN
        SELECT tenant_id INTO _tenant_id
          FROM public.profiles
         WHERE id = _user_text::UUID
         LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        _tenant_id := NULL;
      END;
    END IF;
  END IF;

  IF _old_data IS NOT NULL THEN
    _old_data := _old_data - 'password' - 'senha' - 'access_token' - 'refresh_token' - 'access_token_encrypted' - 'refresh_token_encrypted';
  END IF;
  IF _new_data IS NOT NULL THEN
    _new_data := _new_data - 'password' - 'senha' - 'access_token' - 'refresh_token' - 'access_token_encrypted' - 'refresh_token_encrypted';
  END IF;

  IF _tenant_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
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
$function$;
