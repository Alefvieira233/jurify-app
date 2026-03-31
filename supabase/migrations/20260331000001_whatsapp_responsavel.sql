-- Add responsavel_id to whatsapp_conversations
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_responsavel_id
  ON whatsapp_conversations(responsavel_id);
