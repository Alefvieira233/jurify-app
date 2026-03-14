## 2026-03-14 - PII Exposure in Internal Logs
**Vulnerability:** Internal AI processing logs and audit trails were capturing raw user prompts and AI responses, which often contain PII (CPFs, Emails, Phones), without redaction.
**Learning:** Even if data is truncated in logs, raw PII remains searchable and exposed to anyone with database access. Truncation is not a substitute for redaction.
**Prevention:** Always apply a central PII redaction utility (like `redactPII`) to any text field before persisting it in internal logs or audit tables.

## 2026-03-14 - Insecure Randomness for Security-Critical IDs
**Vulnerability:** Execution IDs and PII tokens were being generated using `Math.random()`, which is cryptographically insecure and predictable.
**Learning:** Developers often use `Math.random()` for convenience, but for IDs that act as tokens or identifiers in sensitive flows, it introduces a predictability risk.
**Prevention:** Use `crypto.getRandomValues()` for all security-sensitive identifier generation to ensure cryptographic strength and unpredictability.
