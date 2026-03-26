# Edge Cases & Failure Modes — WhatsApp + Stripe

## WhatsApp Webhook

### Message Processing
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 9 | Empty text message (media-only, no caption) | HIGH | Passes empty string to AI | AI generates unpredictable response |
| 10 | Phone number format variations (+55, 55, 5511) | MEDIUM | `replace(/\D/g, "")` strips non-digits | May still mismatch if DB has different format |
| 39 | Sticker or location-only message | MEDIUM | Falls through to "unsupported" | Returns generic text, not useful |
| 43 | Missing nested fields in webhook payload | HIGH | Accesses data.message.text directly | TypeError if data.message is undefined |
| 51 | Lead changes phone number | MEDIUM | Creates new lead | No merge mechanism, duplicate data |
| 55 | RTL unicode override in contact name | LOW | Stored as-is | UI display may break |

### Deduplication
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 8 | Duplicate on cold start | CRITICAL | In-memory empty + DB upsert | Tiny race window between two cold starts |
| 53 | Replay attack (hours later) | HIGH | 5-min memory TTL + DB check | DB webhook_events may be cleaned up |

### Tenant Resolution
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 7 | All 5 fallback levels fail | HIGH | Returns early silently | Message dropped, no notification |
| 45 | Spoofed instanceName | HIGH | Trusts prefix blindly | No validation against registered instances |
| 14 | Config not yet updated when message arrives | CRITICAL | Fallback to prefix | Race between config update and message |

### AI Processing
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 4 | OpenAI 30s timeout | HIGH | AbortController + fallback | Agent execution marked failed, ok |
| 41 | OpenAI 429 rate limit | HIGH | No retry for completions | All concurrent requests get fallback |
| 50 | Large audio file (>10MB base64) | CRITICAL | No size check | Memory crash |

### Message Sending
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 6 | Kapso unreachable | CRITICAL | 2 retries with backoff | Message lost after retries exhaust |
| 40 | Admin disconnects during processing | HIGH | Send fails | No queuing for retry |

## Stripe Webhook

### Payment Flow
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 11 | Webhook before checkout callback | HIGH | Looks up by customer_id | May not find if customer not yet created |
| 13 | Double-click checkout | HIGH | Two sessions created | User could complete both |
| 31 | Crash after idempotency insert | CRITICAL | Idempotency blocks retry | Subscription never updated |
| 34 | Out-of-order webhook events | CRITICAL | Processes in arrival order | Status may regress |
| 35 | Simultaneous subscription webhooks | CRITICAL | Upsert on subscription | Race on the same record |
| 46 | Zero-amount invoice | MEDIUM | Sends email with R$0,00 | Confusing to user |

### Subscription Lifecycle
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 26 | Subscription expires during active session | HIGH | Profile updated immediately | User gets abrupt lockout |
| 42 | JWT expires during checkout | MEDIUM | Stripe continues independently | Return URL may fail auth |
| 54 | Trial ends during first interaction | MEDIUM | No warning mechanism | User's first experience is failure |

## Kapso Connection Management

### Connection Lifecycle
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 27 | QR code expires unnoticed | MEDIUM | No expiry feedback | User waits indefinitely |
| 32 | Connection lost, no auto-reconnect | HIGH | Status set to inativa | Manual intervention required |
| 47 | Multiple admins create connection simultaneously | HIGH | No locking | Two instances created |
| 49 | Instance name collision across tenants | HIGH | Kapso rejects duplicate | Unclear error to admin |
| 36 | Kapso returns HTML instead of JSON | HIGH | .json() throws | Error contains full HTML page |
| 52 | Kapso changes payload format | HIGH | Normalization assumes fields | Silent data corruption |

## Cross-Cutting Concerns

### Rate Limiting
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 21 | Single-IP webhook flood | CRITICAL | 120/60s per IP | Still 120 OpenAI calls/min |
| 38 | Distributed webhook flood | CRITICAL | Per-IP limit only | No global limit |
| 48 | Request at rate limit boundary | MEDIUM | Window-based | Edge case at exact boundary |

### Data Integrity
| # | Edge Case | Severity | Current Handling | Gap |
|---|-----------|----------|-----------------|-----|
| 12 | Duplicate conversation creation | CRITICAL | Conditional insert | No UNIQUE constraint |
| 18 | Special characters in contact name | MEDIUM | Stored as-is | Potential display issues |
| 20 | Currency mismatch in Stripe | MEDIUM | Assumes BRL | Wrong amount in emails |
| 28 | Timezone mismatch on timestamps | HIGH | Uses server time | Date-boundary queries may miss |
