-- =============================================================================
-- Performance indexes identified by audit
-- Covers missing indexes for lead visibility, conversation filtering,
-- and agent execution lookups.
-- =============================================================================

-- Lead visibility filtering (useLeadsQuery filters by responsavel_id per RBAC scope)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_responsavel
ON public.leads(tenant_id, responsavel_id)
WHERE responsavel_id IS NOT NULL;

-- Active conversations by tenant + status (common dashboard/filter query)
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_status
ON public.whatsapp_conversations(tenant_id, status);

-- Agent executions status-only lookup (used in analytics without tenant filter)
CREATE INDEX IF NOT EXISTS idx_agent_executions_status
ON public.agent_executions(status)
WHERE status IN ('processing', 'completed', 'failed');
