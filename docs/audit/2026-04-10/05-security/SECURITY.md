# Jurify — Security Audit

**Date:** 2026-04-10
**Auditor:** CSO (automated review)
**Scope:** Secrets, AuthN/Z, RLS, webhooks, supply chain, OWASP Top 10, STRIDE threat model
**Repository state:** `main` @ `a95f231` (clean)
**Methodology:** READ-ONLY static review, `npm audit`, git history grep, file inspection.

---

## Executive Summary

Jurify's security posture is **above average for an early-stage legal SaaS**. The team has clearly invested in hardening: per-tenant HMAC webhook secrets, timing-safe `isServiceRole()`, department-level RLS with defense-in-depth, full security headers (CSP/HSTS/COOP/CORP), server-side encryption via Web Crypto, immutable LGPD `audit_log`, CORS allowlist, rate limiting, and a state machine trigger for lead status.

However, several **material risks** remain — most notably (1) Google OAuth requests the **full `calendar` scope** instead of `calendar.events`, (2) the WhatsApp webhook retains a **global HMAC fallback** path that weakens multi-tenant isolation, (3) there is **no verifiable evidence that the 2026-04-08 secret rotation was completed**, (4) 9 high-severity npm vulnerabilities (vite dev server path traversal is exploitable locally), and (5) JWT tokens are stored in `localStorage` which is exploitable via any XSS.

**Security Posture Score: 78 / 100** — Strong foundations, but unfinished rotation and a handful of real P0s prevent an "enterprise-ready" grade.

---

## Findings by Severity

| Severity | Count |
|----------|------:|
| P0 (critical — fix immediately) | 5 |
| P1 (high — fix this sprint) | 7 |
| P2 (medium — plan/track) | 8 |
| Informational | 4 |

---

## P0 — Critical

### P0-1. Secret rotation from 2026-04-08 not verifiably completed
**Evidence:** `git log --all --grep "rotate|rotation"` returns no rotation commits since 2026-04-08. Project memory records "Rotacionar tokens expostos em 2026-04-08" as pending. `.env` contains blank placeholders (good — not tracked in git, `git check-ignore` confirms), but `docs/security/SECURITY_ALERT_CHAVES_COMPROMETIDAS.md`, `docs/guides/DEPLOY_EDGE_FUNCTION.md` and related files still reference the compromised key context. No new-key evidence found.
**Exploit scenario:** An attacker who exfiltrated the 2026-04-08 keys (e.g., `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `KAPSO_WEBHOOK_SECRET`) can (a) mint service-role JWTs and read/write across every tenant in Supabase, bypassing all RLS; (b) drain the OpenAI budget or pivot to data exfil via logged prompts; (c) forge Kapso webhooks with valid HMAC; (d) issue Stripe refunds/charges. A single un-rotated key = full multi-tenant compromise.
**Fix:** Rotate **every** secret referenced in `.env.example` today. Audit Supabase access logs since 2026-04-08. Invalidate Stripe API keys. Force-invalidate Supabase JWT signing key (`SUPABASE_JWT_SECRET`) which logs out all users.
**Files:** `.env.example`, `docs/security/SECURITY_ALERT_CHAVES_COMPROMETIDAS.md`, `supabase/functions/*/` (service-role consumers)

### P0-2. Google OAuth scope is over-privileged (full calendar vs calendar.events)
**Evidence:** `supabase/functions/google-calendar/oauth.ts:14-18`
```
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",         // FULL calendar R/W, every calendar
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");
```
**Exploit scenario:** Any compromise of the user's stored OAuth refresh token (stored encrypted but reachable via service-role) grants the attacker **read/write/delete on every calendar the user owns**, including calendars unrelated to Jurify. An attacker with service-role access (see P0-1) can enumerate all users' calendars and exfiltrate meeting metadata (client names, topics, times) — direct attorney-client privilege leak.
**Fix:** Narrow to `https://www.googleapis.com/auth/calendar.events` (events only, no calendar enumeration). Re-authorize all users.
**Files:** `supabase/functions/google-calendar/oauth.ts:14`, `supabase/functions/google-calendar/index.ts:13`

### P0-3. WhatsApp webhook global HMAC fallback weakens multi-tenant isolation
**Evidence:** `supabase/functions/whatsapp-webhook/index.ts:770-775`
```
const useGlobalFallback = !tenantSecret;
const effectiveSecret = tenantSecret || KAPSO_WEBHOOK_SECRET;
if (useGlobalFallback && effectiveSecret) {
  console.warn(`[webhook:kapso] WARNING: Using global fallback...`);
}
```
**Exploit scenario:** An attacker who learns the **global** `KAPSO_WEBHOOK_SECRET` (from P0-1 exposure, from any log that prints env, or from a historically compromised developer machine) can forge **valid** HMAC signatures for any tenant that has not yet re-registered with a per-tenant secret. The attacker calls `whatsapp-webhook` with a crafted payload naming an arbitrary `phone_number_id`; the function accepts it because the global secret matches, then routes AI, creates leads, sends replies — all as the victim tenant. This defeats the multi-tenant isolation that was the stated purpose of commit `2aea65f`.
**Fix:** Remove the global fallback. Require every tenant to have a per-tenant secret before accepting webhooks. Fail closed with `403` if `tenantSecret` is null, not `503`.
**Files:** `supabase/functions/whatsapp-webhook/index.ts:770-780`

### P0-4. JWT tokens stored in `localStorage` — XSS = full session takeover
**Evidence:** `src/integrations/supabase/client.ts:29-40`
```
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'jurify-auth',
    storage: window.localStorage,   // ← exploitable via XSS
  },
  ...
});
```
**Exploit scenario:** A stored XSS in any rendered lead name, WhatsApp message body, document title, or uploaded filename — combined with a CSP that allows `'unsafe-inline'` for styles — lets an attacker read `localStorage['jurify-auth']`, exfiltrate the JWT + refresh token, and impersonate the victim user (including admins) from any machine until the refresh token expires. Refresh token rotation is enabled by default but token theft still yields an active session of minutes to hours.
**Fix (short-term):** Aggressively sanitize all user content rendered in React (DOMPurify is already installed but not uniformly applied — only 10 files found using it). Enforce Trusted Types via CSP. **Fix (strategic):** migrate to httpOnly cookies via a thin auth proxy; Supabase supports SSR cookie storage via `@supabase/ssr`.
**Files:** `src/integrations/supabase/client.ts:35`

### P0-5. 9 high-severity npm vulnerabilities, including Vite dev-server path traversal
**Evidence:** `npm audit` output — `vite 7.0.0-7.3.1` has **3 high CVEs** (path traversal in optimized deps, `server.fs.deny` bypass, arbitrary file read via dev-server websocket). `@capacitor/cli` → `tar <=7.5.10` has **6 high CVEs** (hardlink path traversal, symlink poisoning). `@xmldom/xmldom <0.8.12` (XML injection). `minimatch <3.1.4` ReDoS.
**Exploit scenario:** Developer runs `npm run dev` on a laptop connected to a café Wi-Fi; an attacker on the same network exploits the Vite WebSocket to read **any file on the developer's disk**, including `.env` with production secrets, SSH keys, and the developer's local Jurify database dump. The `tar` hardlink traversal is exploitable during `npx cap sync` from a malicious npm package or asset.
**Fix:** `npm audit fix` resolves `vite`/`minimatch`. `@capacitor/assets` has **no fix available** — consider removing it or replacing with manual asset generation; Capacitor is only used for mobile builds so isolation is an option.
**Files:** `package.json`, `package-lock.json`

---

## P1 — High

### P1-1. CSP allows `'unsafe-inline'` for styles
`vercel.json:38` — `style-src 'self' 'unsafe-inline' ...`. Combined with P0-4 this widens XSS impact. Mitigation: adopt nonces or hashes; `shadcn/ui` + Tailwind compiled output does not strictly require `'unsafe-inline'`.

### P1-2. `admin-create-user` auto-confirms email and marks `email_verified: true`
`supabase/functions/admin-create-user/index.ts:140,172` — admin-created users get `email_confirm: true` **and** `email_verified: true` without the user ever proving ownership of the inbox. Project memory claims "Email verification obrigatória para novos membros" — this path violates that. Exploit: an admin with compromised account typo-creates a user at an attacker-controlled domain; the new account is fully active without any verification round-trip.
**Fix:** Do not set `email_confirm: true`; send a magic link instead.

### P1-3. Edge Functions pass service-role JWT in `Authorization: Bearer` header to internal fetch calls
`whatsapp-webhook/index.ts:28`, `stripe-webhook/index.ts:16`, `admin-create-user/index.ts:199` — internal function-to-function calls authenticate with the service role key. If any of these functions logs request headers (some do in error paths), the key surfaces in Supabase logs. **Fix:** Use a dedicated internal-call token or rely on Supabase's built-in `functions.invoke` with IAM, not service role.

### P1-4. `send-email` function trusts `from:` header when `isServiceRole` (line 291)
`send-email/index.ts:262-322` — the branch that flags `isServiceRole = true` skips the tenant ownership check at line 322 (`if (!isServiceRole && authenticatedUserId)`). Any function (or attacker with service-role) can send email as any address. Not a new vuln since service-role is already omnipotent, but the branch makes tenant impersonation trivially scriptable — add defense-in-depth tenant check regardless of role.

### P1-5. Rate limiter falls back to in-memory Map on Supabase failure
`supabase/functions/_shared/rate-limiter.ts:188` — `checkRateLimitMemory` is used as fallback. Deno Edge Functions are ephemeral and scale horizontally; in-memory limiting is effectively **no limiting** under load. An attacker who can temporarily disrupt the `check_rate_limit` RPC (slow query, pool exhaustion) defeats rate limiting entirely.
**Fix:** Fail closed on limiter failure OR use a persistent store (Upstash/KV namespace). Comment in the file already says "Upstash Redis" was intended.

### P1-6. `@capacitor/assets` unfixable high CVEs (supply chain)
See P0-5. Since `@capacitor/assets` has `"fixAvailable": false`, treat as an accepted risk that should be documented in a SECURITY.md exception list. Consider pinning `@capacitor/cli` to the latest patched line or removing asset pipeline.

### P1-7. AI budget check has fail-open mode
Commit `32cea2d: fix: AI budget fail-open + detailed OpenAI error logging`. Fail-open on budget lets an attacker who can block the budget query DDoS-drain OpenAI spend. Acceptable for UX but needs a hard cap per tenant per 24h as a second gate.

---

## P2 — Medium

### P2-1. `dangerouslySetInnerHTML` in `src/components/ui/chart.tsx:79`
Developer-controlled config only — safe today, but add a lint rule or a code comment pinning this as a never-user-input path.

### P2-2. CORS wildcard for server-to-server requests
`supabase/functions/_shared/cors.ts:31-38` — when `origin` header is missing, returns first allowed origin rather than strict reject. Low risk (no browser involved) but could confuse future audits.

### P2-3. Kapso webhook event idempotency
Stripe webhook uses `webhook_events` idempotency table. Kapso webhook does not appear to dedupe by event ID — a replay attack with a stolen valid HMAC signature (within signing window) replays lead creation. Add idempotency keyed on `event.id + phone_number_id`.

### P2-4. Supabase function `openai` package exposed as devDependency in `package.json`
`package.json:166` — `openai` as devDependency leaks the intention to front-end developers; harmless but noise.

### P2-5. `validate_lead_status_transition` skips `service_role` entirely
`supabase/migrations/20260408000002_lead_status_state_machine.sql:28` — service role bypass is intentional but means Edge Functions **must** re-implement the state machine. `agent-orchestrator` and `whatsapp-webhook` skip validation by design; grep for `status:` updates in Edge Functions to confirm all use the `suggestedStatus` helper. Risk: drift between DB trigger and Edge logic.

### P2-6. Audit log does not capture Edge Function actions
`20260225000000_audit_lgpd_event_sourcing.sql` relies on `auth.uid()` which is `NULL` under service role, so Edge Function mutations produce audit rows with `user_id = NULL`. For repudiation resistance, Edge Functions should explicitly insert audit rows with `session_id = 'edge:<function-name>'`.

### P2-7. `.env.secrets` file exists in repo root
Even though `.gitignore` ignores it, its presence invites accidental commits. Move to `~/.jurify-secrets` or a secrets manager.

### P2-8. No Subresource Integrity (SRI) on any third-party script
CSP permits `https://js.stripe.com` — acceptable, but Stripe compromise of that JS would have full XSS. Add SRI hashes where possible.

---

## Informational

- `vercel.json` security headers are **excellent**: CSP, HSTS with preload, COOP, CORP, Permissions-Policy, X-Frame-Options. Above industry median.
- `audit_log` is immutable (INSERT-only with trigger-enforced mutation block). Good LGPD compliance.
- RLS department visibility migration (`20260409000001`) is a strong defense-in-depth layer. `is_admin_or_manager()` uses `SECURITY DEFINER` correctly.
- `isServiceRole()` in `_shared/supabase-client.ts:49-64` is **correctly timing-safe** (XOR accumulator, length-gated).
- Stripe webhook verifies signatures via `constructEventAsync` with subtle crypto — correct.
- No direct `eval()`, `new Function()`, or raw SQL interpolation found in Edge Functions or frontend.
- No frontend file exposes `SUPABASE_SERVICE_ROLE_KEY` (only test setup stubs in `src/tests/setup.ts:16` with `.test-key` placeholder).

---

## OWASP Top 10 (2021) Coverage

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | AT RISK | RLS strong; see P0-3 (webhook isolation) |
| A02 | Cryptographic Failures | OK | Web Crypto + PBKDF2 600k, HMAC SHA-256 |
| A03 | Injection | OK | No raw SQL, Zod validation, parameterized queries |
| A04 | Insecure Design | AT RISK | P0-4 localStorage JWT, P1-2 admin-create auto-confirm |
| A05 | Security Misconfiguration | PARTIAL | CSP `unsafe-inline`, Kapso global fallback |
| A06 | Vulnerable Components | FAIL | 9 high CVEs (P0-5) |
| A07 | Identification & AuthN | OK | Supabase Auth, refresh rotation, email verification (mostly) |
| A08 | Software & Data Integrity | OK | Webhook signatures verified, idempotency on Stripe |
| A09 | Logging & Monitoring | OK | Sentry, audit_log, structured logs |
| A10 | SSRF | OK | No user-controlled outbound URLs found |

---

## STRIDE Threat Model Summary

| Threat | Surface | Mitigation | Residual Risk |
|--------|---------|------------|---------------|
| **S**poofing | Kapso webhooks, Stripe webhooks, user login | HMAC per-tenant (partial), Stripe signature, Supabase Auth | **MEDIUM** (P0-3 global fallback) |
| **T**ampering | Lead status, audit log, payments | State machine trigger, immutable audit_log, Stripe idempotency | **LOW** |
| **R**epudiation | User actions, admin changes | `audit_log` append-only + RLS + LGPD compliant | **LOW** (P2-6 edge-fn gap) |
| **I**nformation Disclosure | JWT in browser, Google Calendar scope, RLS bypass | CSP, RLS dept visibility, Web Crypto encryption at rest | **HIGH** (P0-2, P0-4, P0-1 rotation) |
| **D**enial of Service | Edge functions, OpenAI, login | Rate limit RPC, AI budget helper, CDN | **MEDIUM** (P1-5 fail-open limiter) |
| **E**levation of Privilege | Service role, admin-create-user, RLS | timing-safe isServiceRole, admin gate, dept RLS | **MEDIUM** (P0-1, P1-2, P1-4) |

---

## Security Posture Score: **78 / 100**

**Breakdown:**
- AuthN/AuthZ architecture: 18/20 (strong RLS, weak JWT storage)
- Secret management: 11/15 (rotation unverified)
- Webhook integrity: 12/15 (global fallback)
- Supply chain: 7/15 (9 high CVEs)
- Logging & audit: 12/15
- OWASP/STRIDE coverage: 12/15
- Security headers & CSP: 6/5 (bonus — excellent baseline)

**To reach 95+:** Complete P0-1..P0-5. Remove CSP `unsafe-inline`. Implement DOMPurify universally for user content. Harden admin-create-user. Fail-closed rate limiting.

---

## Prioritized Remediation Plan

**Week 1 (P0 sprint):**
1. Rotate ALL secrets; verify Supabase access logs since 2026-04-08.
2. Narrow Google OAuth to `calendar.events`; re-authorize users.
3. Remove Kapso global HMAC fallback; force per-tenant registration.
4. `npm audit fix`; pin or remove `@capacitor/assets`.

**Week 2 (P1):**
5. Remove CSP `'unsafe-inline'` for styles.
6. Strip `email_confirm: true` from admin-create-user.
7. Migrate rate limiter to persistent store, fail-closed.

**Week 3 (strategic):**
8. Migrate Supabase auth to httpOnly cookies via `@supabase/ssr`.
9. Implement DOMPurify on every rendered user string.
10. Add edge-function audit log insertion layer (P2-6).

---

*End of report*
