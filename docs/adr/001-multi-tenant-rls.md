# ADR-001: Multi-tenant isolation via Supabase RLS

**Status:** Accepted
**Date:** 2026-02
**Updated:** 2026-04-02 (security hardening)

## Context

Jurify serves multiple law firms (tenants) from a single database. Each tenant's data (leads, contracts, appointments, AI agents) must be strictly isolated. We needed a mechanism that:

- Prevents cross-tenant data access at the database level (not just application code)
- Works transparently with Supabase client queries
- Doesn't require every query to manually add `WHERE tenant_id = ?`
- Scales without per-tenant database instances

## Decision

Use **PostgreSQL Row Level Security (RLS)** with a cached `get_current_tenant_id()` function that resolves the authenticated user's tenant from their profile.

Key design choices:
- `tenant_id NOT NULL` constraint on all core tables (leads, contratos, agendamentos, etc.)
- `get_current_tenant_id()` marked as `STABLE` for query-plan caching (called once per statement, not per row)
- `has_permission(uid, resource, action)` function for role-based checks within RLS policies
- INSERT policies use `WITH CHECK (tenant_id = get_current_tenant_id())` to prevent cross-tenant inserts
- Auto-fill trigger `set_tenant_id_from_user()` on INSERT as safety net

## Consequences

**Positive:**
- Data isolation enforced at database level regardless of application bugs
- Supabase client queries automatically filter by tenant without extra code
- Service role key bypasses RLS for Edge Functions that need cross-tenant access (admin operations)
- Performance is good due to `STABLE` function caching and `tenant_id` indexes

**Negative:**
- Schema changes require updating RLS policies (migration overhead)
- Debugging RLS issues is harder (queries silently return empty results)
- `supabaseUntyped` client needed for tables not in generated types
- Must be careful with `OR tenant_id IS NULL` patterns (removed in 2026-04 security fix)

**Risks mitigated:**
- 2026-04: Removed all `OR tenant_id IS NULL` bypass clauses from policies
- Added RLS to `profiles`, `user_roles`, `user_permissions` tables
