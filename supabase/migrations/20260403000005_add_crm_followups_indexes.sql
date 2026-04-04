-- DEB-018: Add composite indexes on crm_followups for common query patterns
-- Sprint 2 — Story 2.1

-- Index for dashboard queries: tenant + status + scheduled date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followups_tenant_status_sched
ON crm_followups (tenant_id, status, scheduled_at);

-- Index for lead detail queries: lead + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followups_lead_status
ON crm_followups (lead_id, status);
