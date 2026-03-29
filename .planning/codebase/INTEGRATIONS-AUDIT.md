# Integrations Audit

**Analysis Date:** 2026-03-29

---

## 1. Supabase Integration

**Health Status:** WORKING

### Edge Functions (32 total)

**Shared Infrastructure (`supabase/functions/_shared/`):**

| File | Purpose | Quality |
|------|---------|---------|
| `cors.ts` | CORS with dynamic Vercel origin matching | Good — reflects origin, denies unknown |
| `supabase-client.ts` | Admin + auth client helpers, `getAuthUser()`, `isServiceRole()`, `getTenantId()` | Good — clean separation |
| `security.ts` | Rate limiting (in-memory), prompt injection detection, PII redaction, audit logging | Good |
| `rate-limiter.ts` | Dual-mode rate limiter (in-memory + Supabase RPC), 429 response helper | Good — atomic RPC avoids race conditions |
| `sentry.ts` | Edge Function Sentry init (10% sample rate) | Adequate |
| `kapso-client.ts` | Kapso WhatsApp API client with health check | Good |
| `ai-model.ts` | Default model constants (`gpt-4o`, `whisper-1`) | Minimal |
| `logger.ts` | Structured edge logger | Not audited in detail |
| `cache.ts` | In-memory cache for Edge isolates | Not audited in detail |
| `legal-context.ts` | Builds legal context via `Promise.all` | Not audited in detail |
| `agent-prompts.ts` | Agent definitions with per-agent `maxTokens` caps (400-800) | Good cost control |

**Auth Patterns Across Edge Functions:**

- **JWT validation**: `assistant`, `chat-completion`, `create-checkout-session`, `generate-embedding`, `google-calendar`, `kapso-manager`, `send-whatsapp-message`, `zapsign-integration` -- all validate user JWT before processing
- **Service-role key auth**: `agent-orchestrator`, `cleanup-agent-memory`, `process-prazos-alerts`, `media-processor` -- server-to-server only
- **Dual auth (service-role OR JWT)**: `send-email` -- accepts both patterns
- **Webhook signature**: `stripe-webhook` (Stripe signature verification), `whatsapp-webhook` (timing-safe Kapso secret comparison)
- **No CORS on webhooks**: `stripe-webhook` correctly omits CORS headers (server-to-server)

**Security Concern -- `assistant` tool SQL injection:**
- File: `supabase/functions/assistant/index.ts`, lines 476-477
- `args.query` from OpenAI tool calls is interpolated directly into `.ilike()` and `.or()` PostgREST filters without sanitization
- Example: `q = q.or(\`nome.ilike.%${args.query}%,...\`)`
- The `whatsapp-webhook` has `escapeLike()` for this exact purpose, but `assistant` does not use it
- **Risk:** Low-medium. PostgREST parameterizes ilike, but the `.or()` string builder may be exploitable via crafted tool call arguments
- **Fix:** Apply `escapeLike()` to all user-derived ilike values in `executeTool()`

**Security Concern -- `create-portal-session` return URL not validated:**
- File: `supabase/functions/create-portal-session/index.ts`, line 54
- `returnUrl` from request body is passed directly to `stripe.billingPortal.sessions.create()` without origin validation
- `create-checkout-session` validates redirect URLs against allowed origins, but `create-portal-session` does not
- **Risk:** Open redirect via Stripe portal. Attacker could pass `returnUrl=https://evil.com`
- **Fix:** Add same origin validation as `create-checkout-session`

### Client-Side Usage

**File:** `src/integrations/supabase/client.ts`

- Typed client via auto-generated `Database` type
- `supabaseUntyped` escape hatch for tables not yet in generated types
- Auth config: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`
- Custom storage key `jurify-auth`
- Application header `x-application-name: jurify` for edge function logging
- **No issues detected**

### Realtime Subscriptions

**Files using realtime (9 files):**
- `src/hooks/useRealtimeSync.ts`
- `src/hooks/useRealtimeNotifications.ts`
- `src/hooks/useDashboardMetricsFast.ts`
- `src/hooks/useWhatsAppConversations.ts`
- `src/contexts/AuthContext.tsx`
- `src/hooks/useAgentPipeline.ts`
- `src/features/mission-control/hooks/useRealtimeAgents.ts`
- `src/components/SystemStatus.tsx`

**Status:** Working. Multiple features depend on Postgres changes subscriptions.

### Storage Usage

**Files using `supabase.storage`:**
- `src/hooks/useAgentTraining.ts`
- `src/hooks/useDocumentosJuridicos.ts`
- `src/components/billing/SubscriptionManager.tsx`
- `src/components/UploadContratos.tsx`
- `supabase/functions/send-whatsapp-message/index.ts` -- uploads media to `media` bucket for WhatsApp sending

**Status:** Working. Media bucket used for WhatsApp media relay.

### RLS

- Golden migration: `supabase/migrations/20260221000001_rls_golden.sql`
- All tables use `tenant_id` scoping via `get_current_tenant_id()` function
- Service-role client bypasses RLS (used only in Edge Functions for cross-tenant operations)

---

## 2. WhatsApp / Kapso Integration

**Health Status:** WORKING

### Edge Functions

**`supabase/functions/whatsapp-webhook/index.ts`** (primary webhook handler, ~1000+ lines):
- Handles both Kapso and Meta Official API webhook formats
- Dual-format message normalization (`normalizeKapsoMessage`, `normalizeMetaMessages`)
- Auto-qualification of leads based on conversation analysis
- AI response generation via OpenAI with legal context
- Human handoff detection (command-based)

**Security:**
- Timing-safe webhook secret comparison (`timingSafeCompare()` using `crypto.subtle.timingSafeEqual`)
- Rejects requests when `KAPSO_WEBHOOK_SECRET` is not configured (returns 503)
- `escapeLike()` function used for LIKE pattern escaping in DB queries
- Rate limiting: 120 req/min per webhook
- Deduplication: in-memory Map + `webhook_events` table upsert (atomic)

**`supabase/functions/send-whatsapp-message/index.ts`:**
- Multi-provider: Kapso (primary) + Meta Official (fallback)
- Media support via Supabase Storage upload -> public URL -> Kapso media API
- Input validation: phone format, message length (4096), media size (10MB)
- Rate limit: 30 messages/min per user
- `tenantId` resolved from authenticated profile, never from request body

**`supabase/functions/kapso-manager/index.ts`:**
- Instance lifecycle: create, QR code, status, disconnect, delete, list, health
- RBAC: requires `admin` or `manager` role
- Logging to `conexoes_logs` table, alerts to `conexoes_alertas` table
- Auto-repair for missing `configuracoes_integracoes` records

**Security Concern -- `kapso-manager` ilike without escapeLike:**
- File: `supabase/functions/kapso-manager/index.ts`, lines 205, 225, 401
- `instanceName` is interpolated into `.ilike()` without `escapeLike()`
- `instanceName` comes from request body or is derived from tenant_id
- **Risk:** Low. Instance names are typically controlled by the system (`jurify_{prefix}`), but user-supplied names could abuse LIKE patterns
- **Fix:** Apply `escapeLike()` consistently

### Frontend

**`src/hooks/useWhatsAppConversations.ts`:**
- Realtime subscription for message updates
- Standard TanStack Query patterns

**`src/features/whatsapp/`:**
- Complete WhatsApp chat UI with conversation list, message view

---

## 3. Stripe / Billing Integration

**Health Status:** PARTIAL (functional but placeholders exist)

### Edge Functions

**`supabase/functions/stripe-webhook/index.ts`:**
- Stripe signature verification via `constructEventAsync` + `SubtleCryptoProvider`
- Idempotency: `webhook_events` table check before processing
- Pre-insert event record to prevent duplicate processing on retries
- Handles: `subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`, `charge.refunded`
- Email notifications for billing events via `send-email` edge function
- Status mapping: Stripe statuses -> internal statuses (`active`, `past_due`, `canceled`, etc.)
- Subscription upsert on `stripe_subscription_id` conflict

**`supabase/functions/create-checkout-session/index.ts`:**
- JWT auth + rate limiting (5 req/min)
- Redirect URL validation against allowed origins
- Get-or-create Stripe customer flow
- Supports `subscription` and `payment` modes

**`supabase/functions/create-portal-session/index.ts`:**
- JWT auth, resolves `stripe_customer_id` from profile
- **Missing:** redirect URL validation (see security concern above)
- **Missing:** rate limiting

### Frontend

**`src/features/billing/SubscriptionStatus.tsx`:**
- Displays subscription status

**`src/components/billing/SubscriptionManager.tsx`:**
- Checkout + portal session management
- Uses Supabase storage

**`src/components/billing/UpgradeModal.tsx`:**
- Upgrade flow UI

### Known Issues

- `VITE_STRIPE_PRICE_PRO` and `VITE_STRIPE_PRICE_ENTERPRISE` are placeholders (from MEMORY.md)
- Stripe is "partially configured" per project memory
- `create-portal-session` lacks rate limiting and return URL validation
- Stripe API version `2023-10-16` is used -- consider updating

---

## 4. OpenAI / AI Integration

**Health Status:** WORKING

### Edge Functions (6 AI-related)

| Function | Model | Max Tokens | Auth | Rate Limit |
|----------|-------|------------|------|------------|
| `assistant` | `gpt-4o-mini` | 1000 | JWT | 20/min (in-memory) |
| `chat-completion` | Configurable (whitelist) | Default | JWT | 20/min |
| `agent-orchestrator` | `gpt-4o` | 100 | Service-role | None |
| `ai-agent-processor` | Configurable | 1500 default | JWT + Sentry | Via rate-limiter |
| `whatsapp-webhook` (inline AI) | `gpt-4o` | Per-agent (400-800) | Webhook secret | 120/min |
| `generate-embedding` | Embedding model | N/A | JWT | Via rate-limiter |

**Cost Controls:**
- `chat-completion` has model whitelist: `['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo']`
- Per-agent `maxTokens` caps in `_shared/agent-prompts.ts` (400-800 tokens)
- `assistant` hardcoded to `gpt-4o-mini` (cheapest)
- `agent-orchestrator` limited to 100 tokens (routing decision only)

**Error Handling:**
- `assistant`: Exponential backoff retry (2 attempts) on 429/5xx, graceful degradation returns friendly message instead of 500
- `chat-completion`: No retry, direct error return
- `ai-agent-processor`: Sentry error capture

**Security:**
- `assistant`: Input sanitization via `sanitizeInput()`, PII redaction via `redactPII()`, audit logging
- `chat-completion`: No input sanitization (relies on frontend)
- `assistant`: userId validated from JWT, not from request body

**Concern -- No spending limit or monthly cap:**
- No per-tenant or global OpenAI spending limit
- If a tenant sends many WhatsApp messages, each triggers an AI call
- **Risk:** Unbounded OpenAI costs from heavy WhatsApp traffic
- **Fix:** Add per-tenant daily/monthly token budget tracking in DB

**Concern -- `chat-completion` no input sanitization:**
- File: `supabase/functions/chat-completion/index.ts`
- Messages array from client is passed directly to OpenAI without sanitization
- The `assistant` function uses `sanitizeInput()` but `chat-completion` does not
- **Risk:** Prompt injection from client-side messages
- **Fix:** Apply `sanitizeInput()` to user messages in the array

---

## 5. Google Calendar Integration

**Health Status:** PARTIAL (requires VITE_GOOGLE_CLIENT_ID configuration)

### Edge Functions

**`supabase/functions/google-calendar/index.ts`:**
- CRUD operations: listEvents, createEvent, updateEvent, deleteEvent, syncEvents
- JWT auth via Supabase anon key + user forwarding
- Method whitelist: only allowed methods accepted

**`supabase/functions/google-calendar/google-oauth.ts`:**
- `GoogleOAuthService` class with token refresh
- Checks `expires_at` and refreshes via `https://oauth2.googleapis.com/token`
- Stores tokens in `google_calendar_tokens` table
- **Token refresh is implemented correctly**

**`supabase/functions/google-calendar/oauth.ts`:**
- OAuth flow handler: initiateAuth, exchangeCode, disconnect, status
- JWT auth required
- `access_type: "offline"` + `prompt: "consent"` for refresh token

### Frontend

**`src/hooks/useGoogleCalendarConnection.ts`:**
- OAuth initiation via Edge Function
- Callback handling with session storage for redirect URI
- TanStack Query for status polling

**`src/hooks/useGoogleCalendar.ts`:**
- Full CRUD for calendar events
- Sync logging to `google_calendar_sync_logs`
- CSRF protection via random state parameter
- Uses `GoogleOAuthService` from `src/lib/google/`

### Known Issues

- `VITE_GOOGLE_CLIENT_ID` is not configured (from MEMORY.md)
- Google Calendar integration will show "Configuration needed" prompt when accessed
- No rate limiting on the `google-calendar` edge function
- `google-calendar/index.ts` does not validate `calendarId`, `eventId`, or `eventData` fields from request body

---

## 6. Email (Postmark) Integration

**Health Status:** PARTIAL (requires POSTMARK_SERVER_TOKEN configuration)

### Edge Function

**`supabase/functions/send-email/index.ts`:**
- Centralized email sending via Postmark API
- Templates: `welcome`, `reset-password`, `billing-confirmation`, `subscription-cancelled`, `payment-failed`, `agent-alert`
- Dual auth: service-role key (internal calls skip rate limit) OR user JWT (rate limited 10/min)
- HTML + text body for all templates
- Proper Postmark headers (`X-Postmark-Server-Token`)

### Quality

- Good template organization with typed `EmailTemplate` union
- All templates include both HTML and plaintext bodies
- Brazilian Portuguese content
- `charge-refunded` template referenced in `stripe-webhook` but not defined in `send-email` -- will throw at runtime

**Concern -- Missing `charge-refunded` template:**
- File: `supabase/functions/send-email/index.ts`
- The `stripe-webhook` calls `sendEmail(email, 'charge-refunded', {...})` but the `buildEmailContent` function only handles 6 templates and does not include `charge-refunded`
- TypeScript type `EmailTemplate` does not include `charge-refunded` so this would fail at compile time if types were checked, but the inline `sendEmail` helper in stripe-webhook bypasses the type
- **Risk:** Refund email notifications silently fail (caught by try-catch in stripe-webhook's sendEmail wrapper)
- **Fix:** Add `charge-refunded` template to `send-email` function

**Concern -- Email content is not sanitized:**
- Template data (names, amounts) is interpolated directly into HTML without escaping
- **Risk:** XSS in email clients if data contains HTML (e.g., customer name `<script>alert(1)</script>`)
- **Fix:** HTML-escape all template data values

---

## 7. ZapSign Integration

**Health Status:** PARTIAL (requires ZAPSIGN_API_KEY configuration)

### Edge Function

**`supabase/functions/zapsign-integration/index.ts`:**
- Actions: `create_document`, `check_status`
- JWT auth + tenant resolution from profile
- Rate limiting: 10 req/min
- Tenant-scoped DB queries (`.eq('tenant_id', tenantId)`)
- Logging to `zapsign_logs` table
- Status mapping: `signed` -> `assinado`, `cancelled` -> `cancelado`, `expired` -> `expirado`

### Quality

- Good input validation (action, contratoId, contractData all validated)
- Safe error messages (does not leak internal errors to client)
- Tenant isolation enforced on all DB operations

### Known Issues

- `ZAPSIGN_API_KEY` status: "pending configuration" (from MEMORY.md)
- No webhook handler for ZapSign callbacks -- relies on polling via `check_status`
- Missing: document download/viewing after signature
- ZapSign API error responses are not parsed for specific error codes

---

## 8. Sentry Integration

**Health Status:** PARTIAL (requires VITE_SENTRY_DSN and SENTRY_AUTH_TOKEN)

### Frontend (`src/lib/sentry.ts`)

- Production-only initialization (`import.meta.env.MODE !== 'production'`)
- Browser tracing + session replay (10% sample, 100% on error)
- User feedback widget integration
- Smart filtering: ignores chrome extensions, network errors, ResizeObserver, AdBlock
- URL deny list for extensions and analytics
- Agent-specific monitoring: `captureAgentError()`, `reportSlowAgent()`, `reportHighAgentFailureRate()`
- `setSentryUser()` called from `AuthContext.tsx`

### Integration Points

- `src/main.tsx`: Global `unhandledrejection` and `error` handlers
- `src/App.tsx`: `initSentry()` call
- `src/components/ErrorBoundary.tsx`: Sentry error boundary
- Breadcrumbs in: `useLeads.ts`, `useContratos.ts`, `useProcessos.ts`, `usePrazosProcessuais.ts`, `useHonorarios.ts`, `useDocumentosJuridicos.ts`, `useEntityCRUD.ts`, `LGPDPrivacySection.tsx`
- `src/utils/monitoring.ts`: Additional monitoring utilities

### Edge Function Sentry (`supabase/functions/_shared/sentry.ts`)

- `@sentry/deno@7.114.0` for Edge Functions
- 10% trace sample rate
- Environment detection via `SUPABASE_DB_NAME`
- Used by: `generate-embedding`, `ai-agent-processor`

### Known Issues

- `VITE_SENTRY_DSN` not configured in Vercel (from MEMORY.md)
- `SENTRY_AUTH_TOKEN` not configured in Vercel (no source maps upload)
- Edge Function Sentry DSN (`SENTRY_DSN`) may differ from frontend DSN
- Only 2 of 32 Edge Functions initialize Sentry (`generate-embedding`, `ai-agent-processor`)
- **Most Edge Function errors are only logged to console, not captured by Sentry**

---

## Summary of All Concerns

### Critical

| # | Integration | Issue | Files |
|---|------------|-------|-------|
| 1 | Email/Stripe | Missing `charge-refunded` email template causes silent failure on refund notifications | `supabase/functions/send-email/index.ts`, `supabase/functions/stripe-webhook/index.ts` |

### High

| # | Integration | Issue | Files |
|---|------------|-------|-------|
| 2 | OpenAI | No per-tenant spending limit; unbounded AI costs from WhatsApp traffic | `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/_shared/agent-prompts.ts` |
| 3 | Stripe | `create-portal-session` missing return URL validation (open redirect) | `supabase/functions/create-portal-session/index.ts` |
| 4 | OpenAI | `chat-completion` passes client messages to OpenAI without sanitization | `supabase/functions/chat-completion/index.ts` |

### Medium

| # | Integration | Issue | Files |
|---|------------|-------|-------|
| 5 | Supabase/AI | `assistant` tool queries use unsanitized `args.query` in ilike/or filters | `supabase/functions/assistant/index.ts` (lines 476-477, 518) |
| 6 | WhatsApp | `kapso-manager` ilike queries lack `escapeLike()` | `supabase/functions/kapso-manager/index.ts` (lines 205, 225, 401) |
| 7 | Sentry | Only 2/32 Edge Functions have Sentry; most errors are console-only | `supabase/functions/_shared/sentry.ts` |
| 8 | Email | Template data not HTML-escaped (XSS risk in email clients) | `supabase/functions/send-email/index.ts` |
| 9 | Stripe | `create-portal-session` missing rate limiting | `supabase/functions/create-portal-session/index.ts` |
| 10 | Google Calendar | No rate limiting on `google-calendar` edge function | `supabase/functions/google-calendar/index.ts` |
| 11 | Google Calendar | No input validation on calendarId, eventId, eventData | `supabase/functions/google-calendar/index.ts` |

### Low / Configuration

| # | Integration | Issue | Files |
|---|------------|-------|-------|
| 12 | Sentry | `VITE_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` not configured in Vercel | `src/lib/sentry.ts` |
| 13 | Google Calendar | `VITE_GOOGLE_CLIENT_ID` not configured | `src/hooks/useGoogleCalendar.ts` |
| 14 | ZapSign | `ZAPSIGN_API_KEY` not configured; no webhook handler for callbacks | `supabase/functions/zapsign-integration/index.ts` |
| 15 | Stripe | Price IDs are placeholders (`VITE_STRIPE_PRICE_PRO`, `VITE_STRIPE_PRICE_ENTERPRISE`) | Environment config |
| 16 | Stripe | Stripe API version `2023-10-16` is outdated | `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/create-checkout-session/index.ts` |

---

## Integration Maturity Matrix

| Integration | Backend | Frontend | Auth | Rate Limit | Error Handling | Tests | Maturity |
|------------|---------|----------|------|------------|----------------|-------|----------|
| Supabase | Complete | Complete | JWT + RLS | Per-function | Good | Yes | Production |
| WhatsApp/Kapso | Complete | Complete | Webhook secret + JWT | Yes | Good | Yes | Production |
| Stripe | Complete | Partial | Signature + JWT | Partial | Good (idempotent) | Partial | Beta |
| OpenAI | Complete | Complete | JWT | Yes | Good (retry) | Partial | Production |
| Google Calendar | Complete | Complete | OAuth 2.0 | Missing | Adequate | Unknown | Beta |
| Postmark | Complete | N/A | Dual (JWT/service) | Yes | Adequate | Unknown | Beta |
| ZapSign | Partial | Partial | JWT | Yes | Good | Unknown | Alpha |
| Sentry | Partial | Complete | N/A | N/A | N/A | N/A | Partial |

---

*Integration audit: 2026-03-29*
