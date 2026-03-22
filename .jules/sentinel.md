## 2026-03-04 - Weak PRNG and PII Exposure in Logs
**Vulnerability:** Use of `Math.random()` for security-critical identifiers (execution IDs, sanitization tokens) and lack of PII redaction in persistent AI interaction logs.
**Learning:** Even if the primary user-facing output is sanitized, internal logs (like `agent_ai_logs`) can become a major PII leak surface if they capture raw prompt/response data without redaction. Also, `Math.random()` in Deno/Edge Functions is not cryptographically secure for unique ID generation.
**Prevention:** Always use `crypto.getRandomValues()` for any identifier that must be unique and unpredictable. Centralize PII redaction patterns and apply them proactively to all persistent logging of user-provided or AI-generated content.
