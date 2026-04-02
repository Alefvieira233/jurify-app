# High Error Rate

## Triage Steps

1. Open Sentry > Issues, sort by frequency, filter last 1 hour.
2. Identify the top error: check stack trace, affected component, and user count.
3. Filter by tags: `environment:production`, check `tenant.id` for tenant-specific issues.
4. Check if the spike correlates with a recent deploy (compare timestamps).

## Common Patterns

| Error Pattern | Likely Cause | Action |
|---------------|-------------|--------|
| RLS policy error / `new row violates row-level security` | Tenant config issue or missing `tenant_id` | Check migration, verify `get_current_tenant_id()` |
| `Network Error` / `Failed to fetch` | Supabase down or CORS misconfiguration | See [supabase-down](supabase-down.md) |
| `429 Too Many Requests` | Rate limiter triggered | Check `_shared/rate-limiter.ts` thresholds |
| `TypeError: Cannot read properties of null` | Missing null check in component | Fix component, deploy patch |
| `ChunkLoadError` | Bad deploy, stale cached JS | User needs hard refresh; redeploy if persistent |

## Resolution

1. If deploy-related: consider rollback (see [deploy-rollback](deploy-rollback.md)).
2. If tenant-specific: check that tenant's configuration in Supabase.
3. If code bug: fix, test locally, deploy patch.
4. If infrastructure: check Supabase and Vercel status pages.
5. After resolution: mark the Sentry issue as resolved.

## Escalation
- **Alef Vieira**: project owner, all areas
- Supabase support: database/Edge Function infrastructure issues
- Vercel support: deployment/CDN issues
