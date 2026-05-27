# Sentinel Security Journal

## 2026-05-25 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Sensitive PII (CPFs, Phone numbers, Emails) was being leaked into console and database logs despite a redaction utility being present.
**Learning:** The leakage occurred because code was performing string truncation (e.g., `.substring(0, 80)`) *before* calling `redactPII()`. If a sensitive token was positioned at the boundary of the truncation, it was split into two pieces, neither of which matched the redaction regex, allowing it to bypass security filters.
**Prevention:** Always apply PII redaction to the full content string *before* performing any character-based truncation for logging or preview purposes. The correct pattern is `redactPII(fullText).substring(0, limit)`.
