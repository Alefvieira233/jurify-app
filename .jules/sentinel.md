## 2026-06-30 - Redact-after-truncate Vulnerability
**Vulnerability:** PII redaction (via `redactPII`) was being applied to strings AFTER they were truncated with `.substring()`.
**Learning:** Truncating a string before redaction can split sensitive tokens (like emails, CPF, or JWTs) in a way that they no longer match the redaction regex, while still leaving enough information to be sensitive.
**Prevention:** Always apply `redactPII` to the full content string BEFORE performing any character-based truncation for logging or diagnostic previews.
