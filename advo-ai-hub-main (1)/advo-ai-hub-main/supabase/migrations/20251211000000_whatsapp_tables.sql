-- ===================================================
-- JURIFY - WHATSAPP TABLES MIGRATION
-- ===================================================
-- Criação de tabelas para armazenar conversas e mensagens do WhatsApp
-- Data: 2025-12-11
-- ===================================================

-- 💬 Tabela de Conversas do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'aguardando', 'qualificado', 'finalizado'
  area_juridica TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INT DEFAULT 0,
  ia_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 💬 Tabela de Mensagens do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- 'lead', 'ia', 'agent'
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'document', 'audio'
  media_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📊 Índices de Performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_id
  ON whatsapp_conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead_id
  ON whatsapp_conversations(lead_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status
  ON whatsapp_conversations(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at
  ON whatsapp_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id
  ON whatsapp_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp
  ON whatsapp_messages(timestamp DESC);

-- 🔒 RLS (Row Level Security)
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_conversations
CREATE POLICY "Users can view conversations from their tenant"
  ON whatsapp_conversations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conversations for their tenant"
  ON whatsapp_conversations
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations from their tenant"
  ON whatsapp_conversations
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete conversations from their tenant"
  ON whatsapp_conversations
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policies para whatsapp_messages
CREATE POLICY "Users can view messages from their tenant conversations"
  ON whatsapp_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM whatsapp_conversations
      WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert messages to their tenant conversations"
  ON whatsapp_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM whatsapp_conversations
      WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update messages from their tenant conversations"
  ON whatsapp_messages
  FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM whatsapp_conversations
      WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete messages from their tenant conversations"
  ON whatsapp_messages
  FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM whatsapp_conversations
      WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- 🔄 Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_conversations_timestamp
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_conversation_timestamp();

-- ⚡ Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- 📝 Comentários
COMMENT ON TABLE whatsapp_conversations IS 'Armazena conversas do WhatsApp integradas com leads';
COMMENT ON TABLE whatsapp_messages IS 'Armazena mensagens trocadas nas conversas do WhatsApp';
COMMENT ON COLUMN whatsapp_conversations.status IS 'Status da conversa: ativo, aguardando, qualificado, finalizado';
COMMENT ON COLUMN whatsapp_messages.sender IS 'Quem enviou: lead, ia (inteligência artificial), agent (humano)';
