## 2026-03-20 - Enhanced PII Redaction in Logs
**Vulnerability:** Persistent logs in `agent_ai_logs` were storing full prompts and results without PII redaction, potentially exposing sensitive Brazilian legal data (CPF, CNPJ, OAB, etc.) to internal database viewers.
**Learning:** While `redactPII` was used for outbound messages in some functions, it was missing from the internal logging pipeline for AI interactions.
**Prevention:** Always apply `redactPII` before database insertion for fields containing LLM prompts or responses. Synchronize redaction patterns between shared utilities and specialized engines to ensure consistent protection.
