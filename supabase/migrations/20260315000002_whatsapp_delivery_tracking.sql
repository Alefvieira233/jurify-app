-- ===================================================
-- WhatsApp Delivery Tracking - New columns
-- ===================================================
-- Adds delivery status tracking to messages and agent
-- status tracking to conversations.
-- ===================================================

-- 1. whatsapp_messages: delivery tracking columns
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS send_status TEXT DEFAULT 'sent';
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS send_error TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS processed_by_agent BOOLEAN DEFAULT FALSE;

-- 2. whatsapp_conversations: agent status tracking
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'idle';
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS last_agent_error TEXT;
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS agent_processed_at TIMESTAMPTZ;

-- 3. Partial index for pending/failed messages (operational queries)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_send_status
  ON whatsapp_messages(send_status)
  WHERE send_status IN ('pending', 'failed');
