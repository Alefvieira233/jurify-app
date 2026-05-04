-- ============================================================================
-- WhatsApp Pro Features — Migration consolidada
--   1. Quick Replies (snippets) com tracking de uso
--   2. Search messages (tsvector + GIN index PT-BR)
--   3. Auto-reply (greeting + away message)
--   4. AI summary cache (resumo de conversa)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) whatsapp_quick_replies — atalhos /comando que expandem em mensagens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_quick_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shortcut    text NOT NULL,            -- ex: "horario", "honorarios", "endereco"
  content     text NOT NULL,            -- texto que substitui o /shortcut
  description text,                     -- ajuda visual no autocomplete
  used_count  integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_quick_replies_tenant ON public.whatsapp_quick_replies(tenant_id, used_count DESC);
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;

DO $rls$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_quick_replies' AND policyname='qr_select_own') THEN
    EXECUTE 'CREATE POLICY qr_select_own ON public.whatsapp_quick_replies FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_quick_replies' AND policyname='qr_modify_own') THEN
    EXECUTE 'CREATE POLICY qr_modify_own ON public.whatsapp_quick_replies FOR ALL TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_quick_replies' AND policyname='qr_service_role') THEN
    EXECUTE 'CREATE POLICY qr_service_role ON public.whatsapp_quick_replies FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $rls$;

-- RPC pra incrementar used_count atomicamente (concorrência-safe)
CREATE OR REPLACE FUNCTION public.increment_quick_reply_use(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.whatsapp_quick_replies
  SET used_count = used_count + 1, updated_at = now()
  WHERE id = p_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_quick_reply_use(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2) Full-text search nas mensagens — tsvector + GIN
-- ----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_content_fts
  ON public.whatsapp_messages USING GIN(content_tsv);

-- Index auxiliar pra filtros temporais por conversation
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conv_ts
  ON public.whatsapp_messages(conversation_id, timestamp DESC);

-- RPC busca: full-text + filtros opcionais (date_from, date_to, sender, conversation_id)
CREATE OR REPLACE FUNCTION public.search_whatsapp_messages(
  p_query           text,
  p_conversation_id uuid DEFAULT NULL,
  p_date_from       timestamptz DEFAULT NULL,
  p_date_to         timestamptz DEFAULT NULL,
  p_sender          text DEFAULT NULL,
  p_limit           integer DEFAULT 50
)
RETURNS TABLE (
  id              uuid,
  conversation_id uuid,
  sender          text,
  content         text,
  message_type    varchar,
  timestamp       timestamptz,
  contact_name    text,
  phone_number    text,
  rank            real
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    m.id,
    m.conversation_id,
    m.sender,
    m.content,
    m.message_type,
    m.timestamp,
    c.contact_name,
    c.phone_number,
    ts_rank(m.content_tsv, websearch_to_tsquery('portuguese', p_query)) AS rank
  FROM public.whatsapp_messages m
  LEFT JOIN public.whatsapp_conversations c ON c.id = m.conversation_id
  WHERE m.tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND m.content_tsv @@ websearch_to_tsquery('portuguese', p_query)
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    AND (p_date_from IS NULL OR m.timestamp >= p_date_from)
    AND (p_date_to IS NULL OR m.timestamp <= p_date_to)
    AND (p_sender IS NULL OR m.sender = p_sender)
  ORDER BY rank DESC, m.timestamp DESC
  LIMIT LEAST(p_limit, 200);
$$;

GRANT EXECUTE ON FUNCTION public.search_whatsapp_messages(text, uuid, timestamptz, timestamptz, text, integer) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3) Auto-reply (greeting + away)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_auto_replies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('greeting', 'away')),
  message      text NOT NULL,
  enabled      boolean NOT NULL DEFAULT true,
  -- horário comercial (apenas para type=away). Formato: array de objetos
  -- [{day: 'mon', start: '09:00', end: '18:00'}, ...]. Fora desses horários, away dispara.
  -- timezone fixo America/Sao_Paulo por simplicidade
  business_hours jsonb DEFAULT '[
    {"day": "mon", "start": "09:00", "end": "18:00"},
    {"day": "tue", "start": "09:00", "end": "18:00"},
    {"day": "wed", "start": "09:00", "end": "18:00"},
    {"day": "thu", "start": "09:00", "end": "18:00"},
    {"day": "fri", "start": "09:00", "end": "18:00"}
  ]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, type)
);

ALTER TABLE public.whatsapp_auto_replies ENABLE ROW LEVEL SECURITY;

DO $rls$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_auto_replies' AND policyname='ar_select_own') THEN
    EXECUTE 'CREATE POLICY ar_select_own ON public.whatsapp_auto_replies FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_auto_replies' AND policyname='ar_modify_own') THEN
    EXECUTE 'CREATE POLICY ar_modify_own ON public.whatsapp_auto_replies FOR ALL TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_auto_replies' AND policyname='ar_service_role') THEN
    EXECUTE 'CREATE POLICY ar_service_role ON public.whatsapp_auto_replies FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $rls$;

-- Tracking pra evitar greeting duplicado: registramos qual conversation já recebeu.
CREATE TABLE IF NOT EXISTS public.whatsapp_auto_reply_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  conversation_id uuid NOT NULL,
  type            text NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arl_conv_type ON public.whatsapp_auto_reply_log(conversation_id, type, sent_at DESC);

-- ----------------------------------------------------------------------------
-- 4) AI Conversation Summary cache
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  summary         text NOT NULL,
  message_count   integer NOT NULL,            -- nº de mensagens na hora do summary
  last_message_id uuid,                        -- pra invalidar quando houver nova
  generated_by    text DEFAULT 'gpt-4o-mini',
  generated_at    timestamptz NOT NULL DEFAULT now(),
  tokens_used     integer
);

CREATE INDEX IF NOT EXISTS idx_conv_summaries_conv ON public.whatsapp_conversation_summaries(conversation_id);
ALTER TABLE public.whatsapp_conversation_summaries ENABLE ROW LEVEL SECURITY;

DO $rls$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_conversation_summaries' AND policyname='cs_select_own') THEN
    EXECUTE 'CREATE POLICY cs_select_own ON public.whatsapp_conversation_summaries FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_conversation_summaries' AND policyname='cs_service_role') THEN
    EXECUTE 'CREATE POLICY cs_service_role ON public.whatsapp_conversation_summaries FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $rls$;
