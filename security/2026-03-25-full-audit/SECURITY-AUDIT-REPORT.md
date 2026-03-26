# Jurify Security Audit Report

## Executive Summary

- **Date:** 2026-03-25
- **Scope:** Full codebase (frontend, 32 Edge Functions, CI/CD, docs, infrastructure)
- **Iterations:** 15
- **Total Findings:** 11 (3 Critical, 2 High, 3 Medium, 2 Low, 1 Info)

### Verdict: **ACTION REQUIRED** - 3 Critical findings need immediate remediation

---

## Threat Model

### Assets Identified

| Asset Type | Items | Priority |
|------------|-------|----------|
| **Data stores** | Supabase PostgreSQL (leads, contratos, processos, honorarios, documentos juridicos), localStorage | Critical |
| **Authentication** | Supabase Auth (JWT), service-role key, health-check token | Critical |
| **API endpoints** | 32 Edge Functions, Vercel frontend | High |
| **External services** | Kapso WhatsApp API, Stripe, OpenAI, ZapSign, Google Calendar, FCM | High |
| **User input surfaces** | Forms (Zod-validated), WhatsApp messages, webhook payloads | High |
| **Configuration** | .env, Supabase Secrets, Vercel env vars, CORS config | Medium |
| **Secrets in repo** | MEMORY.md, docs/plans/*.md | **Critical** |

### Trust Boundaries

```
Trust Boundaries:
  +-- Browser <-> Supabase (JWT auth, RLS enforced)
  +-- Edge Functions <-> Database (service-role key, bypasses RLS)
  +-- Webhooks <-> Edge Functions (no-verify-jwt, secret-based auth)
  +-- Server-to-Server <-> Edge Functions (service-role key auth)
  +-- Public routes <-> Authenticated routes (ProtectedRoute client-side)
  +-- Admin role <-> User role (RBAC matrix in rbac.ts, client-side check)
  +-- CI/CD <-> Production (GitHub Actions, Vercel)
```

### STRIDE Analysis

| Threat | Risk Level | Key Findings |
|--------|------------|-------------|
| **Spoofing** | Medium | Webhook secret uses non-timing-safe comparison; CORS regex allows similar domain names |
| **Tampering** | Low | Input validation via Zod; Stripe webhooks properly verified; no eval/innerHTML injection |
| **Repudiation** | Low | Audit trail exists (conexoes_logs); Sentry for error monitoring |
| **Info Disclosure** | **Critical** | API keys, PATs, encryption keys committed in MEMORY.md and docs |
| **Denial of Service** | Medium | Rate limiter resets on cold start; memory-based fallback ineffective |
| **Elevation of Privilege** | **Critical** | 2 Edge Functions (agent-orchestrator, media-processor) have zero authentication |

---

## Findings (Descending Severity)

### [CRITICAL] Finding 1: Supabase PAT and API Keys Committed to Git

- **OWASP:** A02 — Cryptographic Failures
- **STRIDE:** Information Disclosure
- **Location:** `MEMORY.md`, `docs/superpowers/plans/2026-03-16-multimodal-agent-pipeline.md`, `docs/plans/2026-03-09-mobile-capacitor.md`
- **Confidence:** Confirmed

**Description:** The Supabase Personal Access Token (`sbp_REDACTED`) is hardcoded in 3 documentation files AND in the project's MEMORY.md file. This token grants **full admin access** to the Supabase project (deploy functions, manage secrets, execute SQL, etc.).

Additionally, MEMORY.md contains:
- `KAPSO_API_KEY` (full 64-char hex key)
- `HEALTH_CHECK_TOKEN` (UUID)
- `ENCRYPTION_KEY` (256-bit hex key)

**Attack Scenario:**
1. Attacker gains read access to the git repo (even a stale clone)
2. Extracts `sbp_REDACTED...` from docs
3. Uses `supabase` CLI to: deploy malicious edge functions, read/modify database, extract all secrets

**Mitigation:**
1. **IMMEDIATE:** Rotate the Supabase PAT at https://supabase.com/dashboard/account/tokens
2. **IMMEDIATE:** Remove all secrets from MEMORY.md and docs
3. **IMMEDIATE:** Rotate KAPSO_API_KEY, ENCRYPTION_KEY, HEALTH_CHECK_TOKEN
4. Add `security/` and `*.md` with secrets to `.gitignore`
5. Use `git filter-branch` or BFG Repo Cleaner to purge secrets from git history

---

### [CRITICAL] Finding 2: agent-orchestrator Edge Function Has No Authentication

- **OWASP:** A01 — Broken Access Control
- **STRIDE:** Elevation of Privilege
- **Location:** `supabase/functions/agent-orchestrator/index.ts:24`
- **Confidence:** Confirmed

**Description:** The `agent-orchestrator` function accepts any POST request without checking JWT, API key, or any form of authentication. It was deployed with `--no-verify-jwt` (per plan docs). Any internet user can invoke it, triggering OpenAI API calls (consuming credits) and potentially accessing tenant data passed in the body.

**Code Evidence:**
```typescript
// Line 24-34: No auth check anywhere
Deno.serve(async (req) => {
  // ... CORS only ...
  const body: OrchestratorRequest = await req.json();
  // Directly uses body.tenantId without verification
```

**Mitigation:**
```typescript
// Add at the start of the handler:
const authHeader = req.headers.get("Authorization");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const token = authHeader?.replace("Bearer ", "") ?? "";
if (!token || token !== serviceKey) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```
Deploy WITHOUT `--no-verify-jwt` or add service-role key check since this is called server-to-server.

---

### [CRITICAL] Finding 3: media-processor Edge Function Has No Authentication

- **OWASP:** A01 — Broken Access Control
- **STRIDE:** Elevation of Privilege
- **Location:** `supabase/functions/media-processor/index.ts`
- **Confidence:** Confirmed

**Description:** Same issue as agent-orchestrator. The `media-processor` function processes arbitrary media URLs through OpenAI (Whisper for audio, GPT-4 Vision for images) without any authentication. An attacker could:
- Send arbitrary media for free transcription/analysis
- Burn through OpenAI API credits
- Use the `tenantId` field to associate malicious content with any tenant

**Mitigation:** Same as Finding 2 — add service-role key verification.

---

### [HIGH] Finding 4: KAPSO_API_KEY Exposed in MEMORY.md

- **OWASP:** A02 — Cryptographic Failures
- **STRIDE:** Information Disclosure
- **Location:** `MEMORY.md` (line with Kapso credentials)
- **Confidence:** Confirmed

**Description:** The full KAPSO_API_KEY (`REDACTED`) and PHONE_NUMBER_ID are stored in MEMORY.md which is tracked by git. Anyone with repo access can send WhatsApp messages or read conversations via the Kapso API.

**Mitigation:** Remove from MEMORY.md immediately. Rotate the key at Kapso dashboard.

---

### [HIGH] Finding 5: Dependency Vulnerabilities (npm audit)

- **OWASP:** A06 — Vulnerable and Outdated Components
- **STRIDE:** Tampering
- **Location:** `package.json` → `@capacitor/assets`, `@trapezedev/project`
- **Confidence:** Confirmed

**Description:** `npm audit` reports 3 high-severity vulnerabilities:
- `tar` (via `@capacitor/cli`) — arbitrary file overwrite
- `replace` (via `@trapezedev/project`) — ReDoS

**Mitigation:** Update `@capacitor/assets` when fix becomes available. These are dev/build dependencies, so production runtime risk is lower but CI pipeline could be affected.

---

### [MEDIUM] Finding 6: Webhook Secret Uses Timing-Unsafe Comparison

- **OWASP:** A02 — Cryptographic Failures
- **STRIDE:** Spoofing
- **Location:** `supabase/functions/whatsapp-webhook/index.ts:481`
- **Confidence:** Confirmed

**Description:** The Kapso webhook secret is compared using `!==` (strict equality), which is vulnerable to timing attacks. An attacker could theoretically determine the secret character-by-character by measuring response times.

**Code Evidence:**
```typescript
if (webhookSecret !== KAPSO_WEBHOOK_SECRET) {  // timing-unsafe
```

**Mitigation:**
```typescript
import { timingSafeEqual } from "node:crypto";
// or for Deno:
function timingSafeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}
```

---

### [MEDIUM] Finding 7: RBAC Enforcement is Client-Side Only

- **OWASP:** A01 — Broken Access Control
- **STRIDE:** Elevation of Privilege
- **Location:** `src/components/ProtectedRoute.tsx:27`
- **Confidence:** Confirmed

**Description:** Role-based access control (admin/manager/user/viewer) is enforced only in the React frontend via `ProtectedRoute`. The actual data access goes through Supabase RLS which filters by `tenant_id` but does NOT enforce role-based restrictions. A `viewer` user with valid JWT can make direct Supabase queries to create/update/delete data their role shouldn't allow.

**Mitigation:** Add RLS policies that check `user_roles.role` for sensitive operations (e.g., only admin can delete users, only admin/manager can update contratos).

---

### [MEDIUM] Finding 8: Rate Limiter Memory Fallback is Ineffective

- **OWASP:** A05 — Security Misconfiguration
- **STRIDE:** Denial of Service
- **Location:** `supabase/functions/_shared/rate-limiter.ts:85`
- **Confidence:** Confirmed

**Description:** The in-memory rate limiter (`memoryStorage` Map) resets on every Edge Function cold start. Since Supabase Edge Functions are stateless (new isolate per invocation or after idle), the memory-based rate limiter provides virtually no protection. The Supabase RPC fallback (`check_rate_limit`) works correctly, but if it fails, the memory fallback is useless.

**Mitigation:** Ensure the `check_rate_limit` RPC is always available. Consider adding Cloudflare rate limiting at the edge or using Supabase's built-in rate limiting features.

---

### [LOW] Finding 9: CORS Regex Could Match Attacker-Controlled Domain

- **OWASP:** A05 — Security Misconfiguration
- **STRIDE:** Spoofing
- **Location:** `supabase/functions/_shared/cors.ts:14`
- **Confidence:** Possible

**Description:** The regex `/^https:\/\/jurify[-a-z0-9]*\.vercel\.app$/` would match any Vercel deployment starting with "jurify" — including `jurify-malicious.vercel.app` if an attacker creates a Vercel project with that name.

**Mitigation:** Use a more specific regex or explicit allowlist for known preview URLs:
```typescript
/^https:\/\/jurify(-[a-z0-9]{7,9})?(-alef-vieiras-projects)?\.vercel\.app$/
```

---

### [LOW] Finding 10: Secrets in Auto-Memory File

- **OWASP:** A02 — Cryptographic Failures
- **STRIDE:** Information Disclosure
- **Location:** `C:\Users\User\.claude\projects\E--Jurify\memory\MEMORY.md`
- **Confidence:** Confirmed

**Description:** The Claude auto-memory file contains ENCRYPTION_KEY and HEALTH_CHECK_TOKEN values. While this file is in the user's home directory (not committed to git), it represents a local secret sprawl risk.

**Mitigation:** Remove secret values from memory. Store only references like "ENCRYPTION_KEY is set in Supabase Secrets".

---

## Coverage Matrix

### OWASP Coverage

| OWASP Category | Tested | Findings |
|----------------|--------|----------|
| A01 Broken Access Control | Yes | 3 (Critical x2, Medium x1) |
| A02 Cryptographic Failures | Yes | 4 (Critical x1, High x1, Medium x1, Low x2) |
| A03 Injection | Yes | 0 (safe: Zod validation, no eval, no raw SQL in frontend) |
| A04 Insecure Design | Yes | 0 |
| A05 Security Misconfiguration | Yes | 2 (Medium x1, Low x1) |
| A06 Vulnerable Components | Yes | 1 (High x1) |
| A07 Auth & Identification Failures | Yes | 0 (Supabase Auth is solid) |
| A08 Software & Data Integrity Failures | Yes | 0 (Stripe webhook verified) |
| A09 Security Logging & Monitoring | Yes | 0 (Sentry + audit logs in place) |
| A10 Server-Side Request Forgery | Yes | 0 |

### STRIDE Coverage

| STRIDE Category | Tested | Findings |
|-----------------|--------|----------|
| Spoofing | Yes | 2 |
| Tampering | Yes | 0 |
| Repudiation | Yes | 0 |
| Information Disclosure | Yes | 4 |
| Denial of Service | Yes | 1 |
| Elevation of Privilege | Yes | 3 |

---

## Security Headers Check (vercel.json)

| Header | Status | Value |
|--------|--------|-------|
| Content-Security-Policy | Configured | Restrictive CSP with explicit source lists |
| Strict-Transport-Security | Configured | max-age=63072000; includeSubDomains; preload |
| X-Content-Type-Options | Configured | nosniff |
| X-Frame-Options | Configured | SAMEORIGIN |
| X-XSS-Protection | Configured | 1; mode=block |
| Referrer-Policy | Configured | strict-origin-when-cross-origin |
| Permissions-Policy | Configured | camera=(), microphone=(), geolocation=(), payment=() |
| Cross-Origin-Opener-Policy | Configured | same-origin |
| Cross-Origin-Resource-Policy | Configured | same-origin |

**Verdict: Excellent** — all recommended security headers are in place.

---

## What's Working Well

1. **RLS is comprehensive** — 13+ migration files, golden RLS policy, tenant isolation
2. **Security headers** — full set of modern security headers on Vercel
3. **Stripe webhook verification** — proper `constructEventAsync` with signature
4. **Input validation** — Zod schemas on all forms
5. **No eval/innerHTML injection vectors** — clean codebase
6. **Auth on most Edge Functions** — 23 of 32 functions verify JWT or service-role
7. **Rate limiting infrastructure** — atomic RPC approach (when DB is available)
8. **CORS** — proper origin validation with deny-by-default
9. **Encryption** — AES-256-GCM with PBKDF2 (600k iterations) for sensitive data
10. **Error handling** — generic error messages in production (no stack traces)

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Rotate Supabase PAT and remove ALL secrets from MEMORY.md and docs/plans
2. **[IMMEDIATE]** Add auth to agent-orchestrator and media-processor Edge Functions
3. **[IMMEDIATE]** Rotate KAPSO_API_KEY after removing from MEMORY.md
4. **[SHORT-TERM]** Use timing-safe comparison for webhook secrets
5. **[SHORT-TERM]** Add server-side RBAC enforcement via RLS policies that check user_roles
6. **[SHORT-TERM]** Tighten CORS regex to prevent jurify-* domain spoofing
7. **[MEDIUM-TERM]** Move to Redis or durable rate limiting (not in-memory fallback)
8. **[MEDIUM-TERM]** Use BFG Repo Cleaner to purge secret history from git
9. **[LOW]** Update @capacitor/assets when security fix is available
10. **[LOW]** Add `security/` to `.gitignore`
