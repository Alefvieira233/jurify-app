# Test Scenarios — WhatsApp + Stripe + Conexoes

## Critical Priority (Must Test)

### TS-001: Duplicate message deduplication under cold start
```
Given: Edge Function has cold-started (empty in-memory cache)
When: Same webhook payload arrives twice within 100ms
Then: Only ONE message is processed and stored
And: Second request returns 200 (acknowledged) but no duplicate in DB
Verify: SELECT count(*) FROM whatsapp_messages WHERE external_id = '{msg_id}' = 1
```

### TS-002: Concurrent conversation creation for same lead
```
Given: Lead with phone +5511999999999 exists, no conversation yet
When: Two messages arrive simultaneously from this lead
Then: Only ONE conversation is created
And: Both messages are linked to the same conversation_id
Verify: SELECT count(*) FROM whatsapp_conversations WHERE lead_id = '{id}' AND tenant_id = '{tid}' = 1
```

### TS-003: Kapso send failure with retry exhaustion
```
Given: Kapso API is returning 503 for all requests
When: AI generates a response to send
Then: sendViaKapso retries 2 times with exponential backoff (2s, 4s)
And: After 3 failures, error is logged
And: Lead does NOT receive any message
Gap: No retry queue — message is permanently lost
```

### TS-004: Stripe idempotency on server crash
```
Given: Stripe webhook for subscription.created arrives
And: Idempotency row is inserted with event_id
When: Server crashes BEFORE subscription is updated in DB
And: Stripe retries the same webhook
Then: Current behavior: idempotency check blocks retry → subscription never updated
Expected: Should detect incomplete processing and retry
```

### TS-005: Out-of-order Stripe subscription webhooks
```
Given: Subscription is active
When: payment_failed webhook arrives (timestamp T1)
And: Then payment_succeeded webhook arrives (timestamp T2, T2 > T1)
But: payment_succeeded arrives at server BEFORE payment_failed (network delay)
Then: Final status should be based on most recent event timestamp
Current: Last-write-wins → status = past_due (WRONG)
```

### TS-006: Tenant spoofing via instance name
```
Given: Tenant A has instance "jurify_tenantA"
When: Attacker creates payload with instanceName = "jurify_tenantA"
And: Sends to whatsapp-webhook with valid KAPSO_WEBHOOK_SECRET
Then: Message should be rejected if instanceName not in configuracoes_integracoes
Current: Trusts prefix, may resolve to wrong tenant
```

### TS-007: Large audio file crashes media-processor
```
Given: Lead sends a 15-minute voice message (~25MB)
When: media-processor downloads and converts to base64
Then: Deno memory limit should be checked BEFORE processing
Expected: Reject with polite message if > 5MB
Current: No size check → potential OOM crash
```

### TS-008: Distributed webhook flood
```
Given: Attacker sends 100 fake webhook requests per second from 50 IPs
When: Rate limit checks each IP individually (120/60s per IP)
Then: Total throughput = 6,000 requests hitting OpenAI per minute
Expected: Global rate limit should cap total webhook processing
Current: No global limit
```

### TS-009: Webhook secret timing attack
```
Given: Attacker sends webhook with incremental secret guesses
When: timingSafeCompare is used for comparison
Then: Response time should be constant regardless of how many characters match
Verify: Fixed in security audit (2026-03-25) — now uses crypto.subtle.timingSafeEqual
```

### TS-010: Connection event + first message race
```
Given: Kapso instance just connected (connection.update state=open sent)
When: First message from lead arrives within 500ms of connection event
Then: Tenant should be resolved correctly
And: Message should not be dropped
Current: If config not yet updated, falls back to prefix → may work but fragile
```

## High Priority

### TS-011: OpenAI rate limit (429) during peak
```
Given: 10+ tenants receiving WhatsApp messages simultaneously
When: OpenAI returns 429 Too Many Requests
Then: All affected messages get fallback response
Gap: No retry for OpenAI calls, no queuing
```

### TS-012: Empty text message from lead
```
Given: Lead sends media-only message (image without caption)
When: text="" is passed to AI agent
Then: AI should handle gracefully (not hallucinate context)
Expected: "Recebi sua imagem. Como posso ajudá-lo?"
Current: Unpredictable AI response to empty input
```

### TS-013: Phone number normalization
```
Given: Lead registered with telefone="5511999999999"
When: New message arrives from "+55 (11) 99999-9999"
Then: Should match existing lead after normalization
Verify: Both should resolve to "5511999999999"
```

### TS-014: Kapso returns HTML error page
```
Given: Kapso API is in maintenance mode
When: kapso-manager calls any endpoint
Then: Response is HTML (not JSON)
And: .json() call should be wrapped in try/catch
Current: kapsoFetch doesn't validate Content-Type before .json()
```

### TS-015: Double-click on checkout button
```
Given: User clicks "Upgrade to Pro"
When: User clicks the button again before redirect completes
Then: Only ONE checkout session should be created
Or: Second click should be debounced/disabled
Current: Two sessions created, potential double charge
```

### TS-016: Subscription expires during active session
```
Given: User is actively using the app (valid JWT)
When: Subscription expires (webhook fires, profile updated)
Then: User should see graceful notification, not abrupt lockout
Current: Next API call sees expired subscription → feature blocked immediately
```

### TS-017: Kapso connection auto-reconnect
```
Given: WhatsApp connection drops (connection.update state=close)
When: Status updated to "inativa"
Then: System should attempt auto-reconnect after 30s
Current: No auto-reconnect — requires manual admin action
```

### TS-018: Multiple admins creating connection simultaneously
```
Given: Admin A opens Conexoes page and clicks "Nova Conexao"
When: Admin B also clicks "Nova Conexao" for same tenant
Then: Only ONE instance should be created
Current: Two instances created → orphaned config
```

### TS-019: Webhook payload with missing nested fields
```
Given: Kapso sends valid-looking payload
When: data.message is undefined (status-only event)
And: Code accesses data.message.text
Then: Should handle gracefully without TypeError
Current: May throw TypeError → 500 response
```

### TS-020: Price manipulation in checkout
```
Given: User inspects network and changes priceId in request
When: create-checkout-session receives modified priceId
Then: Should validate priceId against allowed price list
Current: Passes any priceId to Stripe (Stripe validates but wrong plan may be assigned)
```

## Medium Priority

### TS-021: QR code expiry feedback
### TS-022: Zero-amount Stripe invoice email
### TS-023: Sticker/location message handling
### TS-024: Rate limit at exact window boundary
### TS-025: Special characters in lead name display
### TS-026: JWT expiry during Stripe checkout flow
### TS-027: Trial end during first interaction
### TS-028: Timezone mismatch on message timestamps
### TS-029: Instance name collision across tenants
### TS-030: Currency format in Stripe emails
