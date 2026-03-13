## 2025-05-22 - Enhanced PII Redaction & Cryptographic Randomness

**Vulnerability:** Insecure randomness using `Math.random()` for execution IDs and PII tokens, plus insufficient PII redaction in logs.
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable IDs. Audit and AI logs were capturing raw PII (CNPJ, Email, OAB, CNJ), increasing the data leak surface.
**Prevention:** Use `crypto.getRandomValues()` for all security-critical IDs. Centralize and synchronize PII redaction patterns across frontend and backend, applying them to all persistent logs (audit, AI processing) while sparing end-user communications to avoid functional regressions.
