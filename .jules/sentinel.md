
## 2026-05-27 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Personally Identifiable Information (PII) leakage in diagnostic logs.
**Learning:** Performing character-based truncation (e.g., `.substring()`) before calling a regex-based redaction utility (e.g., `redactPII()`) can split sensitive tokens (like a 11-digit CPF) at the boundary. This prevents the regex from matching the token, while still leaving the partial sensitive data visible in the logs.
**Prevention:** Always apply full PII redaction to the entire content string BEFORE performing any truncation for display or logging purposes.
