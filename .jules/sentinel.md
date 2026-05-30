## 2026-05-07 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Personally Identifiable Information (PII) could leak into database logs (`agent_ai_logs`) even when redaction is implemented.
**Learning:** Performing string truncation (e.g., `.substring(0, 200)`) BEFORE calling `redactPII()` can split sensitive tokens (like a CPF or CNPJ) in the middle, causing the regex to fail matching the partial token.
**Prevention:** Always apply `redactPII()` to the full content string first, and only truncate the resulting redacted string for storage limits.
