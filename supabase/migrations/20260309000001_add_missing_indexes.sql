-- ─── Missing performance indexes ────────────────────────────────────────────
-- Identified via query pattern analysis: agent_memory, whatsapp_conversations,
-- webhook_events, prazos_processuais all lacked indexes for common access patterns.

-- agent_memory: semantic search by tenant + importance ranking
CREATE INDEX IF NOT EXISTS idx_agent_memory_tenant_importance
  ON agent_memory (tenant_id, importance DESC);

-- agent_memory: cleanup job efficient deletion by expiry
CREATE INDEX IF NOT EXISTS idx_agent_memory_expires_at
  ON agent_memory (expires_at)
  WHERE expires_at IS NOT NULL;

-- whatsapp_conversations: webhook lookups by lead + ia_active flag
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead_tenant_ia
  ON whatsapp_conversations (lead_id, tenant_id, ia_active);

-- webhook_events: idempotency check (dedup by event_id + source)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_id_source
  ON webhook_events (event_id, source);

-- prazos_processuais: legal-context queries filter by lead + status + date
CREATE INDEX IF NOT EXISTS idx_prazos_lead_status_prazo
  ON prazos_processuais (lead_id, status, data_prazo);
