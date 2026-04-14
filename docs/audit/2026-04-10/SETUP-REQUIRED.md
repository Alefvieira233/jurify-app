# Jurify — Setup Required Before Launch

**Date:** 2026-04-10 (atualizado 2026-04-13)
**Status:** Code hardening complete (32 tasks). The items below are **operational** and can only be done by someone with access to Vercel, Supabase, Google Cloud, Stripe, and the app's secrets vault.

Every item here has a direct code change already merged that depends on it. **The app will run without these, but some features will be degraded or insecure until they are done.**

---

## ✅ Progresso 2026-04-13 (segunda rodada de hardening)

Aplicado na sessão:

### Migrations aplicadas no banco de produção
- `20260413000001_auto_qualify_lead_on_agendamento` — trigger pós-agendamento (status→qualificado, score+20, temperature=hot, tag auto, tarefa pro advogado)
- `20260413000002_lead_phone_dedup` — UNIQUE index parcial + função `normalize_phone` + RPC `find_lead_by_phone`
- `20260413000003_feature_flags` — tabelas `features`/`feature_overrides` + RPC `is_feature_enabled` (canary rollout determinístico)
- `20260413000004_agendamentos_responsavel_fk` — FK `responsavel_id` em agendamentos + backfill + trigger atualizado
- `20260413000005_fix_on_soft_delete_trigger` — hotfix de 2 bugs (uuid::text cast + constraint SOFT_DELETE)

### Edge function redeployada
- `whatsapp-webhook` com parser PT-BR de data/hora, validação de janela comercial, detecção de conflito, confirmação ao lead, re-roteamento dinâmico de depto por área, dedupe via RPC, PII redaction nos logs, rate-limit por tenant

### Frontend
- Contratos: dialog no empty-state (botão estava no-op)
- Onboarding: `upsert` com `onConflict` (fim do 409)
- Realtime: nomes de canal únicos (fim do "closed before established")
- CSP: Google Fonts inline handler removido
- Hook `useFeatureFlag` disponível pra todo React
- `useLeadsCRUD.create` bloqueia duplicata de telefone com mensagem amigável

### Dados
- 8 pares de leads duplicados consolidados (mantém o mais antigo, soft-delete do novo, FKs migradas pra whatsapp_conversations/agendamentos/contratos/tarefas/lead_historico)

### Bugs pré-existentes descobertos e corrigidos
- `on_soft_delete` trigger: cast inválido `auth.uid()::text` em coluna uuid + valor `SOFT_DELETE` rejeitado pela CHECK constraint

---

## ⏳ Ainda pendente (operacional)

---

## 1. Rotate all secrets (CRITICAL — do this first)

The audit found that secret rotation flagged on 2026-04-08 was never actually performed. Every API key issued before that date must be treated as potentially exposed.

### Supabase
1. Open Supabase dashboard → Settings → API
2. Click "Reset API keys" — this generates new `anon` and `service_role` keys.
3. Update Vercel env vars (see section 2).
4. Update `supabase/functions/.env` locally (do NOT commit — it's gitignored).
5. After rotation, run the JWT scan again: `node scripts/check-secrets.cjs` (must exit 0).

### Supabase Vault — anon key for pg_cron
Migration `20260410000001_remove_hardcoded_jwt_pg_cron.sql` reads the anon key from Supabase Vault instead of hardcoding it. After rotating, create the secret:

```sql
-- Run in Supabase SQL editor:
SELECT vault.create_secret('<NEW_ANON_KEY>', 'supabase_anon_key');
```

If pg_cron is not enabled on your Supabase project, the migration is a no-op — the scheduler becomes inactive and `process-prazos-alerts` must be called via an external cron (see section 6).

### OpenAI
1. Dashboard → API keys → Revoke old key, create new one.
2. Update `OPENAI_API_KEY` in Supabase Edge Function secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-proj-...
   ```
3. Update `OPENAI_API_KEY` in `supabase/functions/.env` locally.

### Stripe
1. Dashboard → Developers → API keys → Roll key.
2. Update:
   - `STRIPE_SECRET_KEY` (Supabase secret)
   - `STRIPE_WEBHOOK_SECRET` (Supabase secret)
   - `VITE_STRIPE_PUBLIC_KEY` (Vercel env var)
3. Re-register the webhook endpoint at `https://yfxgncbopvnsltjqetxw.supabase.co/functions/v1/stripe-webhook` to get a fresh signing secret.

### Postmark
1. Account → API tokens → Generate new Server Token.
2. `POSTMARK_SERVER_TOKEN` in Supabase secrets.

### Kapso (WhatsApp)
1. Kapso dashboard → per-tenant webhook secret. **The global fallback was removed by audit P0-3** — every tenant must now have their own secret.
2. For each tenant in `configuracoes_integracoes`, generate a new `webhook_secret` (Web Crypto random 32 bytes hex).
3. Re-register the webhook in Kapso with the tenant-specific secret.

### ZapSign
1. Dashboard → API keys → Regenerate.
2. `ZAPSIGN_API_KEY` in Supabase secrets.

**Verification after rotation:**
- `git log -S 'eyJ' --all` returns no new JWT commits.
- `npm run test:security` exits 0.
- Old keys removed from every `.env` file.

---

## 2. Vercel environment variables

### Production
| Variable | Status | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Existing | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **ROTATE** | Supabase anon key (new one from section 1) |
| `VITE_SENTRY_DSN` | **SET** | Required for error telemetry — code is ready, DSN missing |
| `SENTRY_AUTH_TOKEN` | **SET** | Source map upload on build |
| `VITE_STRIPE_PUBLIC_KEY` | **ROTATE** | New public key from section 1 |
| `VITE_STRIPE_PRICE_PRO` | **SET** | Real Stripe price ID (currently placeholder) |
| `VITE_STRIPE_PRICE_ENTERPRISE` | **SET** | Real Stripe price ID (currently placeholder) |
| `VITE_GOOGLE_CLIENT_ID` | **SET** | After creating OAuth app (section 4) |
| `VITE_GOOGLE_REDIRECT_URI` | **SET** | `https://jurify-app.vercel.app/auth/google/callback` |

### Staging / Preview
Use a SEPARATE Supabase project for staging (see section 3). Each env var above should point at staging values, not production.

---

## 3. Create a separate Supabase project for staging

**Why:** `.github/workflows/deploy-staging.yml` originally had a TODO noting that staging shares the production database — any write in staging would corrupt prod data. Audit P0 blocker.

### Steps
1. Create a new Supabase project named `jurify-staging`.
2. Run all migrations: `supabase link --project-ref <staging-id> && supabase db push`.
3. Set Vercel preview env vars to point at the new project (separate from prod).
4. Update `.github/workflows/deploy-staging.yml` with the staging project ref.
5. Verify: a write in staging (e.g., create a lead) does not appear in the production dashboard.

---

## 4. Google Cloud OAuth setup

The code is ready but no OAuth app exists. Users can't connect Google Calendar until this is done.

### Steps
1. https://console.cloud.google.com/ → Create project "Jurify".
2. Enable Google Calendar API.
3. OAuth consent screen → External → add scopes: `calendar.events`, `userinfo.email`, `userinfo.profile` (least privilege, already reduced from full calendar scope in audit fix #6).
4. Credentials → Create OAuth client → Web application.
5. Authorized redirect URIs:
   - `https://jurify-app.vercel.app/auth/google/callback`
   - `http://localhost:8081/auth/google/callback` (for dev)
6. Copy Client ID and Secret.
7. Set:
   - `VITE_GOOGLE_CLIENT_ID` in Vercel (prod + preview)
   - `GOOGLE_CLIENT_SECRET` in Supabase Edge Function secrets
8. Also create and set `ENCRYPTION_KEY` in Supabase secrets (used by `_shared/crypto.ts` to encrypt OAuth tokens at rest). Must be a random 32+ byte value.
9. Verify: visit `/configuracoes/integracoes` → "Conectar Google Calendar" → consent flow works.

---

## 5. Stripe product + price setup

Code for checkout exists but `VITE_STRIPE_PRICE_PRO` and `VITE_STRIPE_PRICE_ENTERPRISE` are placeholders.

### Steps
1. Stripe dashboard → Products → Create product "Jurify Profissional" (R$ 99/mo recurring).
2. Copy the price ID (starts with `price_`).
3. Create product "Jurify Enterprise" (R$ 299/mo).
4. Copy that price ID.
5. Set in Vercel:
   - `VITE_STRIPE_PRICE_PRO=price_...`
   - `VITE_STRIPE_PRICE_ENTERPRISE=price_...`
6. Configure webhook endpoint pointing at `stripe-webhook` edge function; copy signing secret to `STRIPE_WEBHOOK_SECRET` (Supabase).
7. Enable these webhook events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `charge.refunded`.
8. Verify: `stripe trigger checkout.session.completed` in Stripe CLI, event reaches the edge function logs.

---

## 6. Scheduled jobs (pg_cron status)

The audit noted that `MEMORY.md` says pg_cron is unavailable but some migrations assume it is. Two scenarios:

### If pg_cron IS enabled
After running `20260410000001_remove_hardcoded_jwt_pg_cron.sql`, verify:
```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'prazos-alerts-daily';
```
Should return one active row. If not, the Vault secret `supabase_anon_key` is missing — see section 1.

### If pg_cron is NOT enabled
Set up an external scheduler to call these edge functions. Options:

- **Vercel Cron**: add to `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/cron/prazos-alerts", "schedule": "0 12 * * *" },
      { "path": "/api/cron/auto-followup", "schedule": "0 14 * * *" },
      { "path": "/api/cron/weekly-report", "schedule": "0 9 * * 1" }
    ]
  }
  ```
  Create thin Next/Vercel API routes that forward to the edge functions with the service role key.

- **GitHub Actions**: add scheduled workflows that `curl` the edge function endpoints with a service role bearer token.

- **Supabase Scheduled Edge Functions** (if available in your plan).

---

## 7. Sentry — confirm DSN is live

After setting `VITE_SENTRY_DSN` (section 2), verify:
1. Deploy a change that throws a test error in staging.
2. The error appears in Sentry within 30 seconds.
3. Source map resolves correctly (file path + line number in the Sentry stack trace).
4. Release tag matches the build's git SHA.

If any of this fails, check that `SENTRY_AUTH_TOKEN` is set and the `sentryVitePlugin` in `vite.config.ts` has valid org/project.

---

## 8. Alert routing

Sentry is code-ready but alerts need a destination.

### Recommended: Discord webhook
1. Create a Discord channel `#jurify-alerts`.
2. Channel settings → Integrations → Webhooks → New webhook → copy URL.
3. Sentry → Settings → Integrations → Discord → add webhook.
4. Create Alert rules:
   - **Critical**: any unhandled error in production → ping @everyone
   - **Error rate**: >1% errors in 5 min → ping @oncall
   - **Performance**: p95 > 3s for 5 min → notify
5. Test: trigger a staging error and confirm it appears in Discord.

---

## 9. Database backups

`scripts/backup-database.cjs` exists — test it:
```bash
SUPABASE_PROJECT_ID=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup-database.cjs
```
The first time you test restore (critical) should NOT be in a real emergency. Create a throwaway Supabase project and restore the backup into it, verify the data looks right.

Supabase Pro plan also includes automatic daily backups with 7-day retention — confirm this is enabled for the production project.

---

## 10. Install Playwright browsers in CI

Memory says `Playwright browsers not installed locally`, which means e2e tests are being skipped silently. Add to CI:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
```

Then ensure `npm run test:e2e` is part of the CI pipeline and a failure blocks merges.

---

## Final verification checklist

After completing sections 1-10, run this checklist:

- [ ] `npm run lint` — exit 0
- [ ] `npm run type-check` — exit 0
- [ ] `npm run test` — all pass (no skipped with "tested via E2E" excuses)
- [ ] `npm run build` — exit 0, no warnings
- [ ] `npm audit --audit-level=high` — exit 0
- [ ] `node scripts/check-secrets.cjs` — exit 0
- [ ] `git log -S 'eyJ' --all | head` — only shows historical commits with the JWT that was redacted, no new ones
- [ ] Production Sentry receives a test error in <30 s
- [ ] Staging and prod Supabase projects are visually confirmed to be different projects
- [ ] Google Calendar OAuth flow completes end-to-end
- [ ] Stripe checkout creates a real subscription with the correct plan
- [ ] WhatsApp webhook rejects a request with no per-tenant secret (401)
- [ ] Discord receives a test alert from Sentry
- [ ] Cross-tenant read on `google_calendar_tokens` is blocked (verify with `supabase` SQL editor)
- [ ] `mv_leads_metrics` is gone (dropped by migration `20260410000003`)
- [ ] `get_dashboard_metrics` rejects calls with a mismatched `_tenant_id` parameter

Only when every box is checked is Jurify honestly ready for paying customers.
