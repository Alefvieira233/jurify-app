## 2025-05-15 - PII Exposure in AI Interaction Logs
**Vulnerability:** The `ai-agent-processor` Edge Function was logging full system prompts, user prompts, and AI results to the `agent_ai_logs` table without redaction. These logs often contain sensitive Brazilian legal data (CPF, CNPJ, OAB numbers) which violates LGPD data minimization principles.
**Learning:** While advanced logging is useful for debugging and "LangSmith-style" observability, it creates a significant secondary data store of PII that bypasses primary data access controls.
**Prevention:** Always apply PII redaction (using the shared `redactPII` utility) before saving data to observability or audit logs.

## 2025-05-15 - Predictable ID Generation
**Vulnerability:** Security-sensitive IDs (execution IDs in Edge Functions and token IDs in the Sanitizer Engine) were being generated using `Math.random()`.
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable identifiers, which could be exploited for session hijacking or ID guessing attacks in high-scale environments.
**Prevention:** Use `crypto.getRandomValues()` for any identifier that needs to be unique and unpredictable across the system.
