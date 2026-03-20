# JURIFY SENTINEL JOURNAL 🛡️

## 2026-03-04 - Insecure Randomness and PII Leakage in Logs
**Vulnerability:** Use of `Math.random()` for security-sensitive IDs and lack of PII redaction in persistent logs.
**Learning:** `Math.random()` is PRNG and not suitable for cryptographic purposes. PII in internal logs (like AI prompts/responses) violates LGPD and increases data breach impact.
**Prevention:** Always use `crypto.getRandomValues()` for IDs and apply centralized `redactPII` before any DB insertion of user-provided content.
