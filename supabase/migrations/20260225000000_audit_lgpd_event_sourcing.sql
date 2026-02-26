-- ============================================================================
-- LGPD AUDIT EVENT SOURCING
-- 
-- Rastreabilidade completa de mutações em tabelas core.
-- Imutável, append-only, com old_data/new_data/user_id/ip_address.
-- Compliance: LGPD Art. 37, Art. 49 (registro de tratamento de dados)
-- ============================================================================

-- 1. Tabela de auditoria imutável
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID,
  tenant_id UUID,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela é append-only: sem UPDATE/DELETE
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_insert_only" ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Impedir UPDATE/DELETE via trigger
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable: % not allowed', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

CREATE TRIGGER prevent_audit_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- 2. Índices para consulta de auditoria
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_table_record
  ON public.audit_log(table_name, record_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_tenant
  ON public.audit_log(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user
  ON public.audit_log(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created
  ON public.audit_log(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_operation
  ON public.audit_log(table_name, operation, created_at DESC);

-- 3. Função genérica de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  _old_data JSONB := NULL;
  _new_data JSONB := NULL;
  _record_id TEXT;
  _changed TEXT[] := '{}';
  _tenant_id UUID := NULL;
  _key TEXT;
BEGIN
  -- Determinar record_id
  IF TG_OP = 'DELETE' THEN
    _old_data := to_jsonb(OLD);
    _record_id := COALESCE(OLD.id::TEXT, 'unknown');
    _tenant_id := OLD.tenant_id;
  ELSIF TG_OP = 'INSERT' THEN
    _new_data := to_jsonb(NEW);
    _record_id := COALESCE(NEW.id::TEXT, 'unknown');
    _tenant_id := NEW.tenant_id;
  ELSIF TG_OP = 'UPDATE' THEN
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    _record_id := COALESCE(NEW.id::TEXT, 'unknown');
    _tenant_id := NEW.tenant_id;

    -- Detectar campos alterados
    FOR _key IN SELECT jsonb_object_keys(_new_data)
    LOOP
      IF _old_data->_key IS DISTINCT FROM _new_data->_key THEN
        _changed := array_append(_changed, _key);
      END IF;
    END LOOP;
  END IF;

  -- Remover campos sensíveis do log (LGPD: minimização)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Aplicar triggers nas tabelas core
DO $$
DECLARE
  _tables TEXT[] := ARRAY[
    'leads', 'contratos', 'agendamentos',
    'profiles', 'tenants', 'whatsapp_conversations',
    'google_calendar_tokens', 'google_calendar_settings'
  ];
  _t TEXT;
  _trigger_name TEXT;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    _trigger_name := 'audit_' || _t;

    -- Drop se existir para idempotência
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', _trigger_name, _t);

    -- Só cria se a tabela existir
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = _t
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()',
        _trigger_name, _t
      );
    END IF;
  END LOOP;
END;
$$;

-- 5. View para consulta rápida de alterações recentes
CREATE OR REPLACE VIEW public.audit_recent AS
SELECT
  al.id,
  al.table_name,
  al.record_id,
  al.operation,
  al.changed_fields,
  al.user_id,
  p.nome AS user_name,
  al.tenant_id,
  al.created_at
FROM public.audit_log al
LEFT JOIN public.profiles p ON p.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 500;

COMMENT ON TABLE public.audit_log IS 'LGPD audit trail — append-only event sourcing for all core table mutations';
COMMENT ON FUNCTION public.audit_trigger_fn IS 'Generic audit trigger that captures old/new data with field-level change detection';
