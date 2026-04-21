## 2026-04-21 - Secure Randomness and PII Redaction Sync

**Vulnerability:** Use of insecure `Math.random()` for execution IDs and token generation, and missing PII redaction in AI interaction logs.

**Learning:** `Math.random()` lacks the entropy required for security-sensitive identifiers. PII redaction must be applied *before* truncation in logs to prevent sensitive data leakage at character boundaries. Patterns between frontend (`SanitizerEngine.ts`) and backend (`_shared/security.ts`) should be kept in sync for consistent protection.

**Prevention:** Always use `crypto.randomUUID()` for unique identifiers. Implement a shared PII redaction utility and ensure it is applied to all outbound data and internal logs that may contain user-provided sensitive information.
