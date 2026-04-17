# Cron Jobs — External Scheduler (GitHub Actions)

Supabase managed does **not** expose `pg_cron`. All scheduled jobs run via GitHub Actions (`.github/workflows/cron-jobs.yml`) and invoke the corresponding Supabase Edge Function over HTTPS with the service-role key.

## Schedule Overview

All times are UTC. Brazil (BRT) = UTC-3.

| Job | Cron (UTC) | BRT | Function |
|-----|-----------|-----|----------|
| data-retention-cleanup | `0 2 * * *` | daily 23:00 prev day | `data-retention-cleanup` |
| process-prazos-alerts | `0 9 * * 1-5` | Mon-Fri 06:00 | `process-prazos-alerts` |
| auto-followup | `0 9 * * *` | daily 06:00 | `auto-followup` |
| weekly-report | `0 7 * * 1` | Mon 04:00 | `weekly-report` |
| cleanup-agent-memory | `0 3 * * 0` | Sun 00:00 | `cleanup-agent-memory` |

> `tribunal-sync` is **not** scheduled — the edge function is unimplemented (empty folder). Re-add the schedule when `supabase/functions/tribunal-sync/index.ts` is created.

## Required Repo Secrets

Configure under **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret | Description |
|--------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role JWT for the Supabase project. Rotate every 90 days. |
| `HEALTH_CHECK_TOKEN` | Required by `data-retention-cleanup` (timing-safe comparison). |

The Supabase project URL is hardcoded in `env.SUPABASE_URL` (`https://yfxgncbopvnsltjqetxw.supabase.co`). If you migrate projects, update it in `.github/workflows/cron-jobs.yml`.

## Setting the Secrets

```bash
# Using gh CLI
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "<service-role-jwt>"
gh secret set HEALTH_CHECK_TOKEN --body "<random-hex-token>"
```

Or use the UI: *Settings → Secrets and variables → Actions → New repository secret*.

## Manual Trigger

Any of the 5 jobs can be run manually from **Actions → Scheduled Jobs → Run workflow**, choosing the job from the dropdown.

## Body Contract

Every invocation sends `{"batch": true, ...optional}` to instruct the edge function to iterate over all tenants. Single-tenant invocations use `{"tenant_id": "<uuid>"}`.

| Function | Extra fields accepted |
|----------|---------------------|
| `auto-followup` | `inactivity_days` (default 3) |
| others | none |

## Auth Model

- Most functions use `isServiceRole(req)` (timing-safe comparison of `Authorization: Bearer <key>` against `SUPABASE_SERVICE_ROLE_KEY`).
- `data-retention-cleanup` additionally requires `x-health-check-token` matching `HEALTH_CHECK_TOKEN`.

## Observing Runs

1. **GitHub Actions** — run logs show curl exit code + HTTP response body.
2. **Supabase Dashboard** → Logs → Edge Functions — filter by function name.
3. **Sentry** — edge functions emit Sentry events on failure.

## Failure Handling

- `curl -fsS` exits non-zero on any HTTP >=400 → the GitHub Actions job is marked failed.
- Each job has `timeout-minutes` (10-15) that kills stuck runs.
- To re-run a failed schedule: **Actions → failed run → Re-run jobs**.

## Cost Note

GitHub Actions minutes are minimal (seconds per run). The 5 schedules sum to ~5 runs/day × ~10s = negligible.

## Future Work

- Re-enable `tribunal-sync` every 6h once the edge function is implemented (`0 */6 * * *`).
- Consider Supabase scheduled edge functions once GA (currently beta) to eliminate the GitHub Actions hop.
