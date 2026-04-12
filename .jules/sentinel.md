## 2026-04-12 - AI Log PII Redaction and Secure Execution IDs
**Vulnerability:** AI interaction logs (`agent_ai_logs`) were storing sensitive user PII (CPF, CNPJ, OAB, etc.) in plaintext, creating a data leak risk if logs were accessed. Additionally, `execution_id` was generated using `Math.random()`, which is not cryptographically secure.
**Learning:** Persisting full AI prompts and completions for debugging/audit is valuable but must be balanced with privacy. Applying redaction *before* storage ensures compliance (LGPD) without losing the ability to track system behavior.
**Prevention:** Use a centralized redaction utility (`redactPII`) for all persistent logging of user-generated content and always prefer `crypto.getRandomValues()` for unique identifiers.
