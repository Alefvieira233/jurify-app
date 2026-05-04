-- ============================================================================
-- WhatsApp 24h Window Enforcement + Meta Templates Cache
-- ============================================================================
-- Reflete duas regras críticas da Meta WhatsApp Cloud API:
--   1. Janela de 24h: pode-se enviar texto livre apenas se o cliente enviou
--      uma mensagem nas últimas 24h. Fora disso, só template aprovado.
--   2. Templates aprovados: cache local da lista de templates da WABA do
--      tenant (sincronizado periodicamente via sync-whatsapp-templates).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) last_inbound_at em whatsapp_conversations
-- ----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz;

-- Backfill com base nas mensagens existentes
UPDATE public.whatsapp_conversations c
SET last_inbound_at = (
  SELECT MAX(m.timestamp)
  FROM public.whatsapp_messages m
  WHERE m.conversation_id = c.id
    AND (m.direction = 'inbound' OR m.sender = 'user' OR m.sender = 'lead')
)
WHERE last_inbound_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_inbound
  ON public.whatsapp_conversations(tenant_id, last_inbound_at DESC NULLS LAST);

-- ----------------------------------------------------------------------------
-- 2) Trigger: atualiza last_inbound_at quando uma mensagem inbound chega
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_conversation_last_inbound()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_inbound boolean;
BEGIN
  v_is_inbound := COALESCE(NEW.direction = 'inbound', false)
               OR NEW.sender IN ('user', 'lead', 'cliente');

  IF v_is_inbound AND NEW.conversation_id IS NOT NULL THEN
    UPDATE public.whatsapp_conversations
    SET last_inbound_at = COALESCE(NEW.timestamp, NEW.created_at, now())
    WHERE id = NEW.conversation_id
      AND (last_inbound_at IS NULL OR last_inbound_at < COALESCE(NEW.timestamp, NEW.created_at, now()));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_messages_last_inbound ON public.whatsapp_messages;
CREATE TRIGGER trg_whatsapp_messages_last_inbound
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_inbound();

-- Aplica também para partições (messages_2026_*)
DO $partitions$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT inhrelid::regclass::text AS partition_name
    FROM pg_inherits
    WHERE inhparent = 'public.whatsapp_messages'::regclass
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_whatsapp_messages_last_inbound ON %s; '
      'CREATE TRIGGER trg_whatsapp_messages_last_inbound AFTER INSERT ON %s '
      'FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_inbound();',
      r.partition_name, r.partition_name
    );
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[24h-window] partition trigger setup skipped: %', SQLERRM;
END $partitions$;

-- ----------------------------------------------------------------------------
-- 3) RPC get_whatsapp_window_status — consumida pelo frontend
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_whatsapp_window_status(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_conv      public.whatsapp_conversations%ROWTYPE;
  v_now       timestamptz := now();
  v_age_hours numeric;
  v_is_open   boolean;
  v_expires_at timestamptz;
  v_remaining_hours numeric;
BEGIN
  SELECT * INTO v_conv
  FROM public.whatsapp_conversations
  WHERE id = p_conversation_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'conversation_not_found');
  END IF;

  IF v_conv.last_inbound_at IS NULL THEN
    -- Conversa nunca recebeu inbound — só pode enviar template
    RETURN jsonb_build_object(
      'is_open', false,
      'last_inbound_at', null,
      'expires_at', null,
      'remaining_hours', 0,
      'reason', 'no_inbound_yet'
    );
  END IF;

  v_age_hours := EXTRACT(EPOCH FROM (v_now - v_conv.last_inbound_at)) / 3600;
  v_is_open := v_age_hours < 24;
  v_expires_at := v_conv.last_inbound_at + interval '24 hours';
  v_remaining_hours := GREATEST(0, 24 - v_age_hours);

  RETURN jsonb_build_object(
    'is_open', v_is_open,
    'last_inbound_at', v_conv.last_inbound_at,
    'expires_at', v_expires_at,
    'remaining_hours', round(v_remaining_hours::numeric, 2),
    'age_hours', round(v_age_hours::numeric, 2),
    'reason', CASE WHEN v_is_open THEN 'within_window' ELSE 'window_closed' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_whatsapp_window_status(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4) Tabela whatsapp_meta_templates — cache local dos templates aprovados
-- ----------------------------------------------------------------------------
-- A tabela message_templates é genérica (channels, stages internos).
-- Esta nova tabela é específica para WhatsApp templates aprovados pela Meta.
CREATE TABLE IF NOT EXISTS public.whatsapp_meta_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  meta_template_id text,                          -- ID na Meta (opcional)
  name            text NOT NULL,                  -- nome do template (lowercase)
  language        text NOT NULL DEFAULT 'pt_BR',  -- pt_BR, en_US, es, etc
  category        text NOT NULL,                  -- MARKETING / UTILITY / AUTHENTICATION
  status          text NOT NULL DEFAULT 'PENDING',-- APPROVED / PENDING / REJECTED / PAUSED
  components      jsonb NOT NULL DEFAULT '[]'::jsonb, -- header/body/buttons schema
  parameter_count integer NOT NULL DEFAULT 0,    -- quantidade de variáveis {{1}}, {{2}}…
  example_values  jsonb,                          -- valores exemplo das variáveis
  last_synced_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name, language)
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_templates_tenant_status
  ON public.whatsapp_meta_templates(tenant_id, status, name);
CREATE INDEX IF NOT EXISTS idx_wa_meta_templates_synced
  ON public.whatsapp_meta_templates(last_synced_at);

ALTER TABLE public.whatsapp_meta_templates ENABLE ROW LEVEL SECURITY;

DO $rls$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='whatsapp_meta_templates' AND policyname='wa_tpl_select_own'
  ) THEN
    EXECUTE 'CREATE POLICY wa_tpl_select_own ON public.whatsapp_meta_templates FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='whatsapp_meta_templates' AND policyname='wa_tpl_service_role'
  ) THEN
    EXECUTE 'CREATE POLICY wa_tpl_service_role ON public.whatsapp_meta_templates FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $rls$;

-- ----------------------------------------------------------------------------
-- 5) RPC list_whatsapp_templates — lista templates aprovados pra UI
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_whatsapp_templates(p_only_approved boolean DEFAULT true)
RETURNS TABLE (
  id              uuid,
  name            text,
  language        text,
  category        text,
  status          text,
  components      jsonb,
  parameter_count integer,
  example_values  jsonb,
  last_synced_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT t.id, t.name, t.language, t.category, t.status, t.components,
         t.parameter_count, t.example_values, t.last_synced_at
  FROM public.whatsapp_meta_templates t
  WHERE t.tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (NOT p_only_approved OR t.status = 'APPROVED')
  ORDER BY t.status DESC, t.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_whatsapp_templates(boolean) TO authenticated, service_role;
