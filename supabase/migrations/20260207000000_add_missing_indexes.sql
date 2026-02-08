-- Performance indexes for common query patterns
-- WhatsApp conversations: tenant + lead lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_lead
  ON public.whatsapp_conversations (tenant_id, lead_id);

-- WhatsApp messages: conversation + timestamp for ordered message retrieval
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_timestamp
  ON public.whatsapp_messages (conversation_id, timestamp DESC);

-- Agent executions: tenant + created_at for recent executions dashboard
CREATE INDEX IF NOT EXISTS idx_agent_executions_tenant_created
  ON public.logs_execucao_agentes (tenant_id, created_at DESC);

-- WhatsApp conversations: phone number lookup (webhook incoming messages)
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone
  ON public.whatsapp_conversations (phone_number);

-- Leads: phone lookup for WhatsApp matching
CREATE INDEX IF NOT EXISTS idx_leads_telefone_tenant
  ON public.leads (telefone, tenant_id);
