## 2026-05-25 - [PII Leakage via Truncation-Redaction Race]
**Vulnerability:** Sensitive information (PII) leaked in console logs even when `redactPII()` was called.
**Learning:** Performing string truncation (e.g., `.substring(0, 50)`) BEFORE calling `redactPII()` can split a sensitive token (like a CPF or Email) in half. This causes the regex in the redaction utility to fail to match the partial token, while still exposing enough of the data to be a security risk.
**Prevention:** Always apply full PII redaction (`redactPII(fullString)`) before performing any character-based truncation for display or logging purposes.
