## 2025-05-15 - Redact-After-Truncate Pattern
**Vulnerability:** PII redaction (via `redactPII`) was being applied to string previews *after* they had been truncated using `.substring()` or `.slice()`.
**Learning:** Truncating a string before redacting it can split sensitive tokens (like a 20-character CPF or a long JWT) exactly at the boundary. This prevents regex patterns from matching the partial token, leaving sensitive fragments visible in logs or observability tables like `agent_ai_logs`.
**Prevention:** Always apply redaction logic to the *full* content string first, and only then perform character-based truncation for previews or storage limits.
