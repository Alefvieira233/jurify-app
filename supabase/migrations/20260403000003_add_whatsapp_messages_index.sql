-- DEB-005: Add composite index for CRM queries by tenant + lead
-- Uses CONCURRENTLY to avoid locking the table during creation.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_tenant_lead
ON whatsapp_messages (tenant_id, lead_id);
