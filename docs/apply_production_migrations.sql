-- ============================================================
-- JURIFY — MIGRATIONS PRODUÇÃO (IDEMPOTENTE)
-- Aplicar no SQL Editor: https://supabase.com/dashboard/project/yfxgncbopvnsltjqetxw/sql/new
-- ============================================================

-- ============================================================
-- 1. TABELA: whatsapp_conversations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID        REFERENCES public.leads(id)      ON DELETE SET NULL,
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id)         ON DELETE SET NULL,
  phone_number    TEXT        NOT NULL,
  contact_name    TEXT,
  status          TEXT        NOT NULL DEFAULT 'ativo'
                              CHECK (status IN ('ativo','aguardando','qualificado','finalizado')),
  area_juridica   TEXT,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_count    INTEGER     NOT NULL DEFAULT 0,
  ia_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. TABELA: whatsapp_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  sender          TEXT        NOT NULL CHECK (sender IN ('lead','ia','agent')),
  content         TEXT        NOT NULL,
  message_type    TEXT        NOT NULL DEFAULT 'text'
                              CHECK (message_type IN ('text','image','document','audio')),
  media_url       TEXT,
  read            BOOLEAN     NOT NULL DEFAULT FALSE,
  "timestamp"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_id
  ON public.whatsapp_conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead_id
  ON public.whatsapp_conversations(lead_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_id
  ON public.whatsapp_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone_number
  ON public.whatsapp_conversations(phone_number);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status
  ON public.whatsapp_conversations(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at
  ON public.whatsapp_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id
  ON public.whatsapp_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp
  ON public.whatsapp_messages("timestamp" DESC);

-- ============================================================
-- 4. TRIGGER: updated_at automático em whatsapp_conversations
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_whatsapp_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_whatsapp_conversations_updated_at
  ON public.whatsapp_conversations;

CREATE TRIGGER trigger_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_conversation_timestamp();

-- ============================================================
-- 5. RLS
-- ============================================================

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages      ENABLE ROW LEVEL SECURITY;

-- ----- whatsapp_conversations -----

DROP POLICY IF EXISTS "Users can view conversations from their tenant"
  ON public.whatsapp_conversations;
CREATE POLICY "Users can view conversations from their tenant"
  ON public.whatsapp_conversations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert conversations in their tenant"
  ON public.whatsapp_conversations;
CREATE POLICY "Users can insert conversations in their tenant"
  ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update conversations from their tenant"
  ON public.whatsapp_conversations;
CREATE POLICY "Users can update conversations from their tenant"
  ON public.whatsapp_conversations FOR UPDATE
  USING     (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete conversations from their tenant"
  ON public.whatsapp_conversations;
CREATE POLICY "Users can delete conversations from their tenant"
  ON public.whatsapp_conversations FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ----- whatsapp_messages -----

DROP POLICY IF EXISTS "Users can view messages from their tenant conversations"
  ON public.whatsapp_messages;
CREATE POLICY "Users can view messages from their tenant conversations"
  ON public.whatsapp_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.whatsapp_conversations
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert messages to their tenant conversations"
  ON public.whatsapp_messages;
CREATE POLICY "Users can insert messages to their tenant conversations"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.whatsapp_conversations
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update messages from their tenant conversations"
  ON public.whatsapp_messages;
CREATE POLICY "Users can update messages from their tenant conversations"
  ON public.whatsapp_messages FOR UPDATE
  USING (conversation_id IN (
    SELECT id FROM public.whatsapp_conversations
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete messages from their tenant conversations"
  ON public.whatsapp_messages;
CREATE POLICY "Users can delete messages from their tenant conversations"
  ON public.whatsapp_messages FOR DELETE
  USING (conversation_id IN (
    SELECT id FROM public.whatsapp_conversations
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

-- ============================================================
-- 6. REALTIME (seguro: ignora se já habilitado)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
END;
$$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = t.table_name) AS colunas
FROM (VALUES ('whatsapp_conversations'), ('whatsapp_messages')) AS t(table_name)
ORDER BY table_name;
