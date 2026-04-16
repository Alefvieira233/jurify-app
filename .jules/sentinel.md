## 2026-04-12 - AI Log PII Exposure
**Vulnerability:** Personal Identifiable Information (PII) such as CNPJ, Emails, Phone numbers, and Legal IDs (OAB, Processo CNJ) were being stored in plaintext within the `agent_ai_logs` database table.
**Learning:** Even if the application redacts PII for the end-user, internal interaction logs (used for debugging or auditing) often capture the raw prompts and results which contain sensitive data. Truncating these logs *before* redaction can also lead to PII leaks at the character boundaries.
**Prevention:** Always apply PII redaction to logs before persistence. Redact the full content first, then perform any necessary truncation for storage limits to ensure that sensitive tokens are never partially or fully exposed in the database.

## 2026-04-12 - Predictable Execution IDs
**Vulnerability:** Execution IDs were being generated using `Math.random()`, which is a pseudo-random number generator and not cryptographically secure.
**Learning:** Predictable IDs in security-sensitive contexts (like tracking AI executions) can potentially be exploited to guess valid IDs or map out system activity.
**Prevention:** Use `crypto.getRandomValues()` for any unique identifier generation that requires high entropy and unpredictability, especially in backend or Edge Function environments.
