## 2026-02-11 - Cryptographically Insecure Random ID Generation
**Vulnerability:** Use of `Math.random()` for generating sensitive identifiers (PII tokens and execution IDs).
**Learning:** `Math.random()` is not cryptographically secure and can be predictable, potentially allowing an attacker to guess tokens used for PII masking.
**Prevention:** Always use `crypto.getRandomValues()` for security-sensitive random data generation in both frontend and Edge Functions.

## 2026-02-11 - PII Leakage in AI Processing Logs
**Vulnerability:** AI processing logs in `agent_ai_logs` were storing raw prompt and result data which could contain PII.
**Learning:** Even if data is truncated, sensitive information like CPFs or phone numbers can still be stored in logs, violating privacy standards like LGPD.
**Prevention:** Apply PII redaction (using `redactPII`) to all AI-related content before storing it in persistent logs.
