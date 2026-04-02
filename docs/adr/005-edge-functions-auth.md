# ADR-005: Supabase Edge Functions for server-side logic

**Status:** Accepted
**Date:** 2025-12

## Context

Several operations require server-side execution:
- AI agent processing (OpenAI API calls with secret keys)
- Stripe payment processing (webhook signature verification)
- WhatsApp message sending (Kapso API with credentials)
- Email sending (Postmark)
- Data encryption/decryption

These cannot run in the browser due to secret management and security requirements.

## Decision

Use **Supabase Edge Functions** (Deno runtime) for all server-side operations.

Architecture:
- 32 Edge Functions deployed via CI/CD
- Public functions (no JWT): `health-check`, `stripe-webhook`, `whatsapp-webhook`, `zapsign-webhook`
- Private functions (JWT required): `assistant`, `chat-completion`, `send-email`, etc.
- Shared utilities in `supabase/functions/_shared/`: CORS, rate limiting, security, AI budget

Auth pattern in private functions:
```typescript
const authHeader = req.headers.get("Authorization");
const token = authHeader.replace("Bearer ", "");
const { data: { user } } = await supabase.auth.getUser(token);
// + role check via user_roles table for admin operations
```

Rate limiting via atomic PostgreSQL RPC (`check_rate_limit`) to prevent race conditions.

## Consequences

**Positive:**
- Secrets never exposed to the browser
- Deno runtime is fast and secure (V8 isolate per request)
- Deployed alongside database migrations in CI/CD
- Shared CORS configuration across all functions
- Rate limiting with atomic database operations

**Negative:**
- Cold start latency (~200-500ms for first request)
- Limited debugging tools compared to Node.js
- In-memory rate limit fallback loses state on cold start (mitigated with conservative 50% limit)
- No local development parity without `supabase functions serve`
