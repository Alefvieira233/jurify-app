# Jurify — DevOps / SRE Audit

**Date:** 2026-04-10
**Auditor:** Gage (@devops)
**Scope:** CI/CD, deployment, observability, rollback, secrets, backups, scheduled jobs, runbooks
**Mode:** Read-only

---

## Executive Summary

Jurify has a **surprisingly mature CI/CD surface for a solo / small team**: six workflows, pre-deploy gates, dedicated rollback workflow, trufflehog secret scanning, bundle-size enforcement, and typed edge-function deploy groups (critical vs non-critical). **Observability, however, is only half-wired** — Sentry is instrumented in code and source-map upload is configured, but `VITE_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` are not set in Vercel (per MEMORY.md), meaning production currently flies blind on errors. Scheduled jobs are scheduled via `pg_cron` in migrations while memory states pg_cron "not available" — creating a dangerous ambiguity. The **most critical issue** is a **hardcoded, committed Supabase anon JWT in a migration file** used as a cron authorization header, which is a secret-in-code violation the pre-commit security check should catch but does not (the regex only matches `sk-` and bare `eyJ…` patterns outside SQL string literals).

**Can this system survive a 3am incident?** See final section.

---

## 1. CI/CD Inventory

### Workflows discovered (`.github/workflows/`)

| File | Trigger | Purpose | Status |
|------|---------|---------|--------|
| `ci.yml` | push/PR to master/main/develop | Lint, typecheck, unit tests, build, trufflehog, e2e | ACTIVE |
| `deploy-production.yml` | push to master/main, workflow_dispatch | Production deploy (Vercel + Supabase functions + migrations) | ACTIVE |
| `deploy-staging.yml` | push to develop | Staging deploy | ACTIVE but **shares prod DB** (see P0-2) |
| `e2e.yml` | push/PR to main | Standalone Playwright run | ACTIVE — duplicates `ci.yml` e2e job |
| `rollback.yml` | workflow_dispatch | Manual rollback of Vercel + Edge Functions | ACTIVE — good design |
| `pre-commit-check.yml` | PR events | Trufflehog + hardcoded-credential regex | ACTIVE |

### What runs on PR

- `ci.yml`: lint (eslint --max-warnings 0), type-check, unit tests, coverage (codecov), build with 4MB bundle cap, trufflehog, npm audit, playwright e2e
- `e2e.yml`: Playwright again (duplicate of ci.yml's `test-e2e` job — **waste**)
- `pre-commit-check.yml`: trufflehog diff, hardcoded secret regex, `.env` file blocker, conventional commit check (warn-only)

### What runs on merge to main

- All of the above **PLUS** `deploy-production.yml`:
  - `pre-deploy-gate` → `deploy-migrations` → `deploy-frontend` + `deploy-edge-functions` (parallel) → `smoke-tests` → `notify`
- `deploy-frontend` and `deploy-edge-functions` both `needs: [pre-deploy-gate, deploy-migrations]` — **good ordering** (migrations first).
- Smoke tests hit `https://jurify.app` and `/functions/v1/health` with retries.

### Gaps / issues

- **No caching between jobs**: each job re-runs `npm ci` (6x in ci.yml alone). Could cut 3-5 min off every PR.
- **`deploy-production.yml` omits two edge functions** present in `supabase/functions/`: **`auto-followup`** and **`weekly-report`**. They will never auto-deploy. (`deploy-staging.yml` line 149-158 also omits them.)
- **`e2e.yml` is redundant** with `ci.yml:203-252`. Delete one.
- **Branch inconsistency**: `ci.yml` triggers on `master, main, develop`, but `deploy-production.yml` runs on `master, main`. Only one of master/main should exist as the real primary. Git says current branch is `main`. Kill the `master` references.
- **`rollback.yml`** defaults `rollback_edge_functions: false`. In a real incident with a bad edge function deploy, the operator has to know to flip the checkbox. Document this in the runbook (it isn't).

---

## 2. Vercel Configuration (`vercel.json`)

**Strengths:**
- Explicit framework: vite (line 4)
- SPA rewrites (line 5-10)
- **Strong security headers** (lines 11-62): CSP, HSTS with preload, X-Frame-Options, Permissions-Policy, COOP/CORP, Referrer-Policy
- Immutable caching on `/assets/*` (line 12-20)

**Gaps:**
- **No `regions` specified** → Vercel picks default (Washington D.C. / iad1). For a Brazilian legal SaaS, this adds ~150ms latency to every request. Should pin to `gru1` (São Paulo) or add `gru1` to regions array.
- **CSP `script-src` allows `'self' https://*.sentry.io`** but not `https://*.ingest.sentry.io` — Sentry's current ingestion endpoint. Browser console will throw CSP violations on every Sentry event once DSN is wired. Line 38.
- `frame-ancestors 'self'` is good, but X-Frame-Options says `SAMEORIGIN` (line 30). Keep both or just CSP (modern).
- No `trailingSlash`, no `cleanUrls` setting — default behavior is fine, but not explicit.
- No env var declarations in `vercel.json` (they live in Vercel dashboard, which is fine but means drift is possible). No `env` validation in build.

---

## 3. Supabase Deploy (`supabase/config.toml` + `supabase/functions/`)

**`config.toml` is nearly empty** — only declares `verify_jwt = false` for 5 functions (lines 6-20). No `[db]`, `[auth]`, `[storage]`, `[realtime]` sections, meaning **local development doesn't reproduce production configuration**.

### Edge functions present vs deployed

| Count | Detail |
|-------|--------|
| Functions in `supabase/functions/` | **35** (34 functions + `_shared` + `deno.json`) |
| Functions in `deploy-production.yml` | **32** |
| **Orphan functions (never auto-deploy)** | **`auto-followup`**, **`weekly-report`** |

**Impact:** Any change to `auto-followup/index.ts` or `weekly-report/index.ts` will silently not reach production. `auto-followup` is a business-critical retention function; `weekly-report` is a reporting function. If they were ever deployed, it was manual.

---

## 4. Env Var Surface

### `VITE_*` vars referenced in `src/`

From grep: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_APP_VERSION`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PRICE_PRO`, `VITE_STRIPE_PRICE_ENTERPRISE`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_REDIRECT_URI`, `VITE_SALES_WHATSAPP`, `VITE_ENCRYPTION_KEY` (comment only — removed), `VITE_FF_WHATSAPP_AUTO`, `VITE_FF_GOOGLE_CALENDAR`, `VITE_FF_ADVANCED_ANALYTICS`, `VITE_FF_MULTI_AGENT`, `VITE_FF_ZAPSIGN`.

### Documentation drift vs `.env.example`

| Var | In code | In `.env.example` | In `validate-secrets.cjs` |
|-----|---------|-------------------|---------------------------|
| `VITE_FF_*` (5 flags) | YES | **NO** | **NO** |
| `VITE_ENCRYPTION_KEY` | removed | **NO** | **YES** (line 29, dead) |
| `VITE_GOOGLE_REDIRECT_URI` | YES | YES | NO |
| `VITE_APP_VERSION` | YES (Sentry release) | YES | NO |

**Findings:**
- Five feature flags undocumented. A new dev has no idea they exist.
- `validate-secrets.cjs:29` still requires `VITE_ENCRYPTION_KEY` as a **production-required** var, but the code (`src/utils/encryption.ts:5`) explicitly says "NO LONGER used". The pre-deploy gate will **falsely fail** once enforced, or falsely pass because the var is still set.
- `.env.example` has AIOX framework vars (DEEPSEEK, OPENROUTER, N8N, RAILWAY) that are **irrelevant to Jurify** — it looks like the template was copied from the AIOX framework and never pruned.

### Edge-function env vars (Deno.env.get)

From grep: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE`, `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ZAPSIGN_API_TOKEN`, `ENCRYPTION_KEY`, `OCR_SPACE_API_KEY`, `HEALTH_CHECK_TOKEN`.

**Gap:** `OCR_SPACE_API_KEY` (used in `extract-document-text/index.ts:100`) is **not set by the deploy workflow** (see `deploy-production.yml:194-218`). If it's not already in Supabase secrets, OCR fails silently.

---

## 5. Observability

### Sentry

- **Code:** `src/lib/sentry.ts` — well-written. Named imports, tree-shakeable, production-only init, release tagging via `VITE_APP_VERSION`, `beforeSend` filters extension/network noise, custom helpers for agent context. **Grade: A**.
- **Build:** `vite.config.ts:13-17` — `sentryVitePlugin` runs in prod, uploads source maps (`sourcemap: 'hidden'`, line 33). **Grade: A**.
- **Runtime:** Per MEMORY.md and `validate-secrets.cjs:28`, `VITE_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` are **NOT configured in Vercel**. Result: production has zero error telemetry, source maps aren't uploaded, releases aren't tracked. **Grade: F**.
- **Separate doc:** `docs/sentry-alerts-setup.md` exists — not inspected in detail but the existence is good.

### Logging

- `vite.config.ts:27` drops `console.*` in production build (`esbuild.drop`). **Frontend logs are stripped** — good for noise, but means no client-side debug trail outside Sentry.
- **Edge functions use raw `console.log`** — no structured logger, no correlation IDs. Checking logs means manually searching Supabase Functions log UI. For a multi-tenant system, this is insufficient.
- Monitoring utilities exist (`src/lib/monitoring.ts`, `src/lib/logger.ts`) but are frontend-only.

### Metrics

- No Prometheus, no Datadog, no OTEL.
- Business metrics are collected in-database (`get_dashboard_metrics` RPC per MEMORY). Not shipped to external APM.
- Sentry tracing is enabled (`tracesSampleRate: 0.1`) — captures 10% of transactions. No custom spans around critical paths (Stripe webhook, WhatsApp webhook, agent orchestration).

---

## 6. Rollback Safety

### Migration rollback

- **66 migration files**, zero "down" migrations. Supabase's tooling supports forward-only. `docs/runbooks/deploy-rollback.md:22-27` documents "write a manual reversal SQL script" — i.e., there is no automated rollback for DB schema.
- **Dangerous migrations** (cannot be automatically rolled back):
  - `20260307000008_prazos_processo_not_null.sql` — NOT NULL constraint. Adding one is fine; rolling back requires knowing which nulls to restore.
  - `20260323000001_unify_lead_status_system.sql` — data unification. Destructive-by-design.
  - Any migration with `DROP COLUMN` / `ALTER TYPE … RENAME`. Need manual inspection of each.
- **Materialized views** (`20260225000002_materialized_views_dashboard.sql`) — if refresh logic changes break, the view is stale until manually fixed.

### Deploy partial-state risk

- `deploy-production.yml` runs migrations → then frontend + edge functions in parallel. If **frontend succeeds but edge functions fail**, the UI calls functions that don't exist yet → 404 cascade. The smoke test catches it, but users see errors in the window between deploy-frontend completion and smoke-test failure.
- **Non-critical function failures are swallowed** (`deploy-production.yml:188`). A broken `google-calendar` function does NOT fail the deploy. Correct for bulk deploys, but means silent drift if not paired with active Sentry + deploy notifications.
- The rollback workflow's edge-function job checks out `HEAD~1` (`rollback.yml:74`). If the bad deploy was two commits ago, `HEAD~1` is still bad. **No way to specify target commit.**

---

## 7. Secret Management

### Storage locations

- **Local dev:** `.env` (gitignored, verified — `ci.yml:191-198` checks). `.env.example` committed.
- **CI:** GitHub Actions secrets (all `${{ secrets.* }}` references).
- **Runtime (frontend):** Vercel env vars.
- **Runtime (edge functions):** Supabase secrets, set via `supabase secrets set` (`deploy-production.yml:194-218`).

### Per-env separation

- **dev:** `.env` local.
- **staging:** GitHub `environment: staging`, but MEMORY.md + `deploy-staging.yml:1-4` warn that **staging shares the production Supabase DB**. This is a **disaster waiting to happen**: any staging test that writes data corrupts prod. Documented as TODO but not fixed.
- **prod:** GitHub `environment: production`.
- No rotation procedure documented.

### Committed secrets

- **CRITICAL: Hardcoded Supabase anon JWT in `supabase/migrations/20260307000007_prazos_alerts_scheduler.sql:18`.** The migration creates a `cron.schedule` entry with the JWT embedded in the SQL. Even though it's the "anon" key, it's committed to git history, scannable by trufflehog (which only flags verified secrets, not JWTs inside SQL string literals), and impossible to rotate without a new migration. The **`pre-commit-check.yml:32` regex** is `(sk-[a-zA-Z0-9]{48}|eyJ[a-zA-Z0-9_-]{30,})` — this JWT **SHOULD match** the second pattern. Either the migration predates the check, or the check runs `grep` which doesn't find it inside the SQL here-doc. Needs verification. MEMORY.md already notes: "IMPORTANTE: Rotacionar tokens expostos em 2026-04-08."
- `.env.example` is clean — no real values.
- `supabase/.env` exists (line visible in ls output). Check if it's gitignored. `supabase/.gitignore` exists.

---

## 8. Backup Strategy

- `scripts/backup-database.cjs` is **not a backup script**. It's a `console.log` wall of text describing how to back up manually. It calls no tools, writes no files, doesn't talk to Supabase. Running `npm run db:backup` prints instructions. **Grade: F for automation, C- for documentation.**
- Actual backup strategy relies on Supabase Pro plan's daily backups + PITR — which is fine if the Pro plan is active.
- **Unknown:** is the plan actually active? Not verifiable from code.
- **Restore tested:** no evidence of restore drills. No runbook for restore.

---

## 9. Alerts

- **No alerting config in repo.** No PagerDuty, no Opsgenie, no Discord webhook, no Slack notification in any workflow beyond `GITHUB_STEP_SUMMARY`.
- `notify` job in `deploy-production.yml:319-347` writes a markdown summary to GH Actions UI. **Nobody gets paged.**
- `docs/sentry-alerts-setup.md` exists but documentation-as-intent, not enforced.
- Sentry alerts rely on Sentry DSN being configured → **currently silent** (see §5).
- `check_prazos_vencendo` / `process-prazos-alerts` (via `pg_cron`) is an application-level alerting system for users, not a DevOps alerting system.

---

## 10. Scheduled Jobs

### `pg_cron` schedulers found in migrations

- `20260307000007_prazos_alerts_scheduler.sql` — daily 12:00 UTC → `process-prazos-alerts` edge function
- `20260408000001_add_automation_tasks_cleanup.sql` — retention cleanup (presumed scheduled elsewhere)
- `20250224000000_schedule_memory_cleanup.sql` — memory cleanup
- Multiple other migrations reference `pg_cron`

### Ambiguity

**MEMORY.md says:** "pg_cron: não disponível no Supabase (schedulers precisam ser manuais ou via cron externo)".

**Migration says:** `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;` (line 5).

One of these is wrong. Either:
- **(a)** pg_cron IS enabled in the Supabase project and the migrations work, and MEMORY.md is stale → jobs are running, but the anon JWT in line 18 is live in the DB.
- **(b)** pg_cron is NOT enabled, the `CREATE EXTENSION` silently fails or the project has it disabled → **prazos alerts, memory cleanup, and retention cleanup are all dead code that never run**, and users aren't getting deadline alerts.

**Either case is a P0.** Someone needs to verify in the Supabase dashboard which reality is true.

### Cron externo alternative

- No external cron system (GitHub Actions schedule, Vercel cron, upstash cron) is configured in this repo.
- `rollback.yml` and all workflows use `workflow_dispatch` or push triggers — **no `schedule:` triggers anywhere**.

---

## 11. Deploy Documentation

`docs/runbooks/`:
- `README.md`, `DEPLOY.md`, `deploy-rollback.md`, `high-error-rate.md`, `MONITORING.md`, `supabase-down.md`, `TROUBLESHOOTING.md`, `whatsapp-webhook-failing.md`

**Grade: B.** Runbooks exist and are topic-scoped. `deploy-rollback.md` is concrete. `high-error-rate.md`, `supabase-down.md`, `whatsapp-webhook-failing.md` are thoughtful incident scenarios.

**Gaps:**
- `docs/DEPLOYMENT.md:1-40` references **"Lovable" as the deploy target** — completely stale, Jurify is on Vercel. Delete or rewrite.
- No "incident commander" role defined.
- No SLO/SLI document.
- No on-call schedule (because there's no one on call).
- Runbook doesn't mention how to use `rollback.yml` workflow.

---

## 12. Dockerfile / Containerization

- `Dockerfile` exists: Node 20 Alpine, dev server only (line 24: `CMD ["npm", "run", "dev:8080"]`). **Dev-only image.** Not used for production.
- `docker-compose.yml`: dev + Supabase local stub. Useful for local dev. Not used in CI.
- **Production is not containerized** — Vercel builds directly from git. This is fine for a SPA, but means the local Docker image and production build can drift.

---

## 13. Dependency Freshness

`npm outdated --json` (truncated output reviewed):

### Concerning lags (major-version behind)

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| `@hello-pangea/dnd` | 16.6.0 | **18.0.1** | 2 majors behind |
| `@hookform/resolvers` | 3.9.0 | **5.2.2** | 2 majors behind |
| `@eslint/js` | 9.32.0 | **10.0.1** | 1 major behind |

### Minor-version drift (most packages)

- Nearly every `@radix-ui/*` package is 10+ patches behind (e.g., `react-accordion 1.2.1 → 1.2.12`, `react-dialog 1.1.2 → 1.1.15`). Non-breaking but accumulates security fixes.
- `@capacitor/*` packages all 1 patch behind.
- `@playwright/test 1.58.2 → 1.59.1`.

### Abandoned packages

- Not detected from truncated output. Full `npm outdated` + `depcheck` + `better-npm-audit` recommended.

---

## 14. Build Reproducibility

- `package-lock.json` exists (verified).
- Node version **pinned in `package.json:10-12`**: `"engines": { "node": "20.x" }`. Also `"packageManager": "npm@10.9.2"`.
- **`.nvmrc` does not exist.** Recommendation: add one with `20` so `nvm use` in the repo works automatically.
- Workflows hardcode `NODE_VERSION: '20'` — consistent with `package.json`. Good.

---

## 15. Preview Environments

- `deploy-staging.yml:91-98` deploys to Vercel **without** `--prod` flag → creates a preview URL. The preview URL is output (`preview-url`) and used by smoke tests (line 216).
- **BUT:** there's no `pull_request` trigger on `deploy-staging.yml` — only `push` to `develop` and manual dispatch. **PRs do NOT get automatic preview deployments from this workflow.**
- Vercel's GitHub integration (configured in Vercel dashboard, invisible to this repo) likely provides automatic PR previews. Can't verify from code.
- No preview URL posted as PR comment anywhere. Reviewers must find it themselves.

---

## Severity Classification

### P0 — Fix before any production incident

**P0-1: Hardcoded Supabase anon JWT in committed migration**
`supabase/migrations/20260307000007_prazos_alerts_scheduler.sql:18`
The pg_cron schedule embeds a full `eyJ…` JWT as the `Authorization` header. Committed to git history. Cannot be rotated without a new migration. `pre-commit-check.yml` regex should have caught it and didn't. MEMORY.md already flags this as an open rotation task (2026-04-08) — still unresolved.

**P0-2: Staging shares production Supabase database**
`deploy-staging.yml:2-3` — explicit TODO comment. Any staging test that writes data corrupts prod. Any staging migration that runs is applied to prod. **This is not a staging environment, it's a "deploy to prod with a different Vercel preview URL" environment.**

**P0-3: Sentry DSN not wired in production → zero error telemetry**
Per MEMORY.md: `VITE_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` not configured in Vercel. Code is ready (`src/lib/sentry.ts`), build plugin is ready (`vite.config.ts:13-17`). Just missing the env vars. **Production errors are invisible.** No source maps. No releases.

**P0-4: `pg_cron` ambiguity — either dead schedulers or unauthorized secret in DB**
`supabase/migrations/20260307000007_prazos_alerts_scheduler.sql` vs MEMORY.md. Either schedulers are dead (prazo alerts never fire, users miss deadlines → legal liability in a legal SaaS) OR the JWT in the migration is live in the cron table. Must be verified.

**P0-5: Two edge functions never auto-deployed**
`auto-followup` and `weekly-report` are in `supabase/functions/` but absent from `deploy-production.yml:160-189` and `deploy-staging.yml:138-161`. Any code change to these is silent. If they're in production at all, it's from a manual deploy that nobody documented.

---

### P1 — Fix within a sprint

**P1-1: `vite.config.ts` Sentry plugin runs only when `SENTRY_AUTH_TOKEN` is set, but CI workflow doesn't require it**
`deploy-production.yml:97-100` — comment: "Sentry source map upload (opcional — build funciona sem estes)". Source maps SHOULD be mandatory in production for useful stack traces. Make them a hard requirement once P0-3 is fixed.

**P1-2: CSP allows `*.sentry.io` but not `*.ingest.sentry.io`**
`vercel.json:38`. Once Sentry DSN is enabled (P0-3), every event will be CSP-blocked. Add `https://*.ingest.sentry.io` to `connect-src`. (Already present — verify! The line has `https://*.ingest.sentry.io` — **OK, this is already correct**. Retracting. But `script-src` should NOT need Sentry; double-check.)

**P1-3: `validate-secrets.cjs:29` requires dead var `VITE_ENCRYPTION_KEY`**
Code (`src/utils/encryption.ts:5`) says "NO LONGER used". Remove from `PRODUCTION` array.

**P1-4: `rollback.yml` cannot target a specific commit**
`rollback.yml:74` hard-codes `git checkout HEAD~1`. In a cascade where multiple bad deploys stack up, this is insufficient. Add a `commit_sha` input.

**P1-5: Backup script is a no-op**
`scripts/backup-database.cjs` prints instructions instead of running a backup. Either rename to `backup-database-instructions.cjs` or wire it to actually invoke `supabase db dump`.

**P1-6: `docs/DEPLOYMENT.md` documents Lovable, not Vercel**
Stale documentation — will mislead any new operator. Delete or replace with a pointer to `docs/runbooks/DEPLOY.md`.

**P1-7: No deploy notifications beyond GH Actions UI**
Add a Discord/Slack webhook in `notify` job. Free, 10-line fix.

**P1-8: CI has no dependency caching between jobs**
`ci.yml` runs `npm ci` 6 times per PR. Use `actions/cache` on `node_modules` or share via artifact.

**P1-9: No `.nvmrc`**
Add a single-line `.nvmrc` containing `20`.

**P1-10: `OCR_SPACE_API_KEY` is referenced by code but not set by deploy workflow**
`supabase/functions/extract-document-text/index.ts:100`. If not already set manually in Supabase, OCR silently fails.

**P1-11: Edge function deploys have no structured logging**
Raw `console.log` everywhere. Introduce a tiny `log.ts` in `_shared/` with JSON output and correlation IDs.

---

### P2 — Nice to have / hygiene

**P2-1: Dependency lag**
`@hello-pangea/dnd` 2 majors behind, `@hookform/resolvers` 2 majors behind, `@eslint/js` 1 major behind. Radix UI and Capacitor all minor-behind. Plan a quarterly dependency refresh.

**P2-2: `e2e.yml` duplicates `ci.yml` e2e job**
Delete `.github/workflows/e2e.yml` — its job is already in `ci.yml`.

**P2-3: Branch inconsistency (master vs main)**
`ci.yml:5` lists both `master, main`. Pick one. Current is `main` (per git status). Remove `master`.

**P2-4: `.env.example` has AIOX framework vars irrelevant to Jurify**
Lines 15-97 include DEEPSEEK, OPENROUTER, N8N, RAILWAY, etc. Prune to only what `src/` actually reads.

**P2-5: `VITE_FF_*` feature flags undocumented in `.env.example`**
Five flags used in `src/lib/featureFlags.ts` — add to `.env.example`.

**P2-6: No Vercel region pinned**
`vercel.json` should specify `"regions": ["gru1"]` for Brazilian latency.

**P2-7: `config.toml` is nearly empty**
Add `[db]`, `[auth]`, `[storage]`, `[realtime]` sections so `supabase start` reproduces production config locally.

**P2-8: Dev Dockerfile is dev-only**
Either delete `Dockerfile` / `docker-compose.yml` (Vercel builds from git) or make it useful for local dev parity.

**P2-9: No dependency audit automation beyond `npm audit --audit-level=critical`**
Add `npm audit --audit-level=high` or snyk/dependabot.

**P2-10: No SLO/SLI document**
No targets for uptime, error rate, p95 latency. Impossible to know if something is "broken enough to page".

---

## DevOps Maturity Score

| Category | Weight | Score (0-100) | Notes |
|----------|--------|---------------|-------|
| **CI/CD** | 25 | **75** | Well-structured, gated, bundle-capped, rollback workflow exists. Redundant jobs, missing functions, no caching. |
| **Observability** | 20 | **25** | Sentry code is A-grade, but DSN not wired in prod = blind. Edge function logging unstructured. No metrics. |
| **Secrets** | 15 | **40** | GH Secrets + Supabase secrets + Vercel env — 3-tier separation good. **But** committed JWT in migration is a hard fail. Staging shares prod DB. |
| **Rollback** | 15 | **55** | Dedicated workflow exists. Only rolls back to HEAD~1. No DB migration rollback automation. Partial-state risk on parallel deploys. |
| **Alerting** | 10 | **10** | **Essentially zero.** No paging. No webhooks. Sentry unwired. Only GH Actions UI summaries. |
| **Documentation** | 15 | **60** | Runbooks exist and are topic-scoped. `DEPLOYMENT.md` references dead platform. No SLO, no incident commander. |

**Weighted total: (75×0.25) + (25×0.20) + (40×0.15) + (55×0.15) + (10×0.10) + (60×0.15) = 18.75 + 5.0 + 6.0 + 8.25 + 1.0 + 9.0 = 48 / 100**

**DevOps Maturity: 48 / 100 — "Competent but dangerous"**

The CI/CD pipeline is better than most Series A startups. The observability and alerting are worse than a weekend hobby project. The combination is dangerous: you can ship fast and well, but you cannot see what's burning.

---

## Can this system survive a 3am incident?

**NO.**

Reasons:
1. **No paging.** If the site goes down at 3am, nobody knows until a user emails support.
2. **No error telemetry in production.** Sentry DSN not wired. Even if someone wakes up and looks, they see Vercel logs (shallow) and nothing else. Source maps not uploaded → minified stack traces are unreadable.
3. **Staging shares prod DB.** The reflexive "let me test the fix on staging" corrupts production data.
4. **pg_cron ambiguity** means the operator doesn't know if scheduled jobs (deadline alerts, retention) are running or dead. In a legal SaaS, dead deadline alerts = missed client deadlines = direct legal liability.
5. **Migration rollback is fully manual.** If a bad migration is the cause, the on-call person (who doesn't exist) has to hand-write reversal SQL at 3am.
6. **Committed JWT in migration** means a would-be attacker with git access already has prod read credentials. An incident at 3am might not be an outage — it might be an ongoing breach nobody can detect.

**Conversely, what WOULD make it 3am-survivable:**
- Wire Sentry DSN → instant error visibility (5-minute fix)
- Add Discord/Slack webhook on deploy + Sentry → paging (30-minute fix)
- Fix staging DB isolation → safe rollback tests (1-day fix)
- Rotate and remove the JWT from migration history → security restored (1-day fix, requires git history rewrite OR new migration that revokes the key)
- Verify pg_cron status → know what's actually running (30-minute fix)

The bones are good. The wiring is dangerous.

---
*Audit complete. Report generated 2026-04-10 by @devops (Gage), read-only mode.*
