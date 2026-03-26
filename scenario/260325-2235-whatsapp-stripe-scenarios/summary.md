# Scenario Exploration Report — WhatsApp + Stripe + Conexoes

## Executive Summary

- **Date:** 2026-03-25
- **Domain:** Software
- **Scope:** WhatsApp webhook, Kapso manager, Stripe webhook, Billing UI
- **Iterations:** 55
- **Scenarios:** 55 (52 new, 3 variants)
- **Dimensions covered:** 12/12 (100%)

### Severity Breakdown

| Severity | Count | % |
|----------|-------|---|
| Critical | 10 | 18% |
| High | 19 | 35% |
| Medium | 13 | 24% |
| Low | 1 | 2% |
| Info | 12 | 22% |

### Dimension Heatmap

| Dimension | Scenarios | Highest Severity |
|-----------|-----------|-----------------|
| Happy path | 3 | - |
| Error path | 5 | Critical |
| Edge case | 10 | Critical |
| Concurrent | 5 | Critical |
| Integration | 5 | Critical |
| Abuse | 4 | Critical |
| Scale | 3 | Critical |
| Temporal | 4 | High |
| Data variation | 5 | High |
| Permission | 3 | High |
| Recovery | 4 | Critical |
| State transition | 4 | Critical |

---

## Top 10 Critical Scenarios (Immediate Attention)

### 1. Kapso API unreachable — message lost (#6)
**Risk:** Lead sends message, AI responds, but Kapso is down. After 2 retries the response is lost. Lead never gets a reply.
**Mitigation:** Save failed messages to a retry queue table. Add a cron function to retry failed sends every 5 minutes.

### 2. Duplicate webhook on cold start (#8)
**Risk:** Two simultaneous cold starts process the same webhook. In-memory dedup is empty on both. DB upsert race window allows both through.
**Mitigation:** Use `INSERT ... ON CONFLICT DO NOTHING RETURNING id` — if null returned, it's a duplicate. The current implementation does this but verify the race window is truly atomic.

### 3. Two rapid messages create duplicate conversation (#12)
**Risk:** Lead sends 2 messages in <1s. Both webhooks try to INSERT into whatsapp_conversations. One fails or creates a duplicate.
**Mitigation:** Add UNIQUE constraint on (lead_id, tenant_id) in whatsapp_conversations. Use upsert instead of conditional insert.

### 4. Connection.update and first message arrive simultaneously (#14)
**Risk:** Kapso sends connection.update (state=open) and first message at same instant. Message arrives before config is updated. Tenant resolution fails.
**Mitigation:** Add a small delay (1-2s) before processing first message after connection event, OR ensure tenant resolution has fallback to instance name prefix.

### 5. Idempotency prevents webhook retry recovery (#31)
**Risk:** Stripe webhook: idempotency row inserted, server crashes before subscription updated. Stripe retries but idempotency check says "already processed."
**Mitigation:** Move idempotency insert to AFTER successful processing, or use a two-phase approach: insert with status="processing", update to "completed" after success.

### 6. Subscription status race condition (#34)
**Risk:** Payment fails (past_due) → user updates card → new payment (active) → but Stripe webhook ordering not guaranteed → past_due arrives AFTER active → user shows as past_due.
**Mitigation:** Compare webhook event timestamps. Only apply status change if event timestamp > last_updated timestamp on subscription record.

### 7. Coordinated webhook flood burns OpenAI credits (#38)
**Risk:** Distributed attack from 100+ IPs sends fake webhooks. Rate limit allows 120/IP = 12,000 req/min. Each triggers OpenAI call.
**Mitigation:** Add global rate limit (not just per-IP). Add cost-based throttling: if OpenAI spend exceeds threshold in 1h, pause AI processing.

### 8. Database pool exhaustion under load (#44)
**Risk:** Traffic burst → Supabase connection pool exhausted → all DB operations fail → messages lost with no recovery.
**Mitigation:** Add circuit breaker pattern. If DB errors exceed threshold, queue messages for later processing instead of dropping them.

### 9. Memory limit on large audio (#50)
**Risk:** Lead sends long audio (10+ min) → media-processor downloads as base64 (~20MB) → Deno memory limit → crash.
**Mitigation:** Add file size check before processing. Reject media > 5MB with polite message. Or stream processing instead of base64.

### 10. Tenant ID spoofing via instanceName (#45)
**Risk:** Attacker crafts instance named jurify_VICTIM → webhook resolves to victim's tenant → messages appear in victim's conversations.
**Mitigation:** Validate instanceName against registered instances in configuracoes_integracoes before trusting tenant resolution via prefix.

---

## Recommendations by Priority

### Immediate (This Week)

1. **Add retry queue for failed WhatsApp sends** — prevents message loss when Kapso is down
2. **Add UNIQUE constraint on whatsapp_conversations(lead_id, tenant_id)** — prevents duplicate conversations
3. **Fix Stripe idempotency timing** — move idempotency insert after processing OR use two-phase commit
4. **Add timestamp comparison on subscription updates** — prevents out-of-order webhook status regression
5. **Validate instanceName against DB before tenant resolution** — prevents tenant spoofing

### Short-Term (This Month)

6. **Add global rate limit for webhook endpoint** — prevents distributed flood attacks
7. **Add media size limit in media-processor** — prevents memory crashes
8. **Add phone number normalization** — always strip to digits, standard format, before DB lookup
9. **Add circuit breaker for DB operations** — graceful degradation under load
10. **Add QR code expiry feedback in UI** — show timer and auto-refresh

### Medium-Term (Next Quarter)

11. **Implement message retry queue with cron** — recovers from any transient failure
12. **Add cost monitoring for OpenAI** — alert + auto-pause if spend spikes
13. **Lead merge mechanism** — detect and merge duplicates from different phone numbers
14. **Webhook event ordering** — use event timestamps to handle out-of-order delivery
15. **Graceful subscription expiry** — warn user 24h before, don't abruptly lock out mid-session
