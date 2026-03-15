-- ===================================================
-- FIX: WhatsApp Pipeline - Missing columns
-- ===================================================
-- Applied directly via Management API on 2026-03-15
-- This file documents the changes for version control.
-- ===================================================

-- 1. whatsapp_messages: Add columns that the webhook code expects
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id ON whatsapp_messages(tenant_id);

-- 2. configuracoes_integracoes: Add tenant_id for multi-tenant support
ALTER TABLE configuracoes_integracoes ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE configuracoes_integracoes ADD COLUMN IF NOT EXISTS verify_token TEXT;
ALTER TABLE configuracoes_integracoes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_config_integracoes_tenant_id ON configuracoes_integracoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_config_integracoes_nome ON configuracoes_integracoes(nome_integracao);

-- 3. Make legacy columns nullable (they were NOT NULL but new code doesn't populate them)
ALTER TABLE whatsapp_messages ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE whatsapp_messages ALTER COLUMN direction DROP NOT NULL;

-- 4. Enable Realtime for WhatsApp tables
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
