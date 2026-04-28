## 2026-05-22 - PII Leakage in AI Interaction Logs
**Vulnerability:** AI interaction logs (`agent_ai_logs`) were storing raw system prompts, user prompts, and full results containing PII like CPF, CNPJ, OAB, and contact info, bypassing the intended redaction layer.
**Learning:** Shared utilities like `redactPII` must be consistently applied at all persistence boundaries, especially before truncation, to prevent sensitive data leakage at character limits.
**Prevention:** Centralize PII redaction in a shared utility that covers all regional-specific formats (Brazilian CPF/CNPJ/OAB/CNJ) and enforce its use in all Edge Functions that log LLM interactions.
