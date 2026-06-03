## 2026-05-25 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Personally Identifiable Information (PII) leakage in AI logs (`agent_ai_logs`) due to incorrect ordering of operations.
**Learning:** Performing character-based truncation (e.g., `.substring(0, 500)`) BEFORE applying PII redaction (e.g., `redactPII()`) can split a sensitive token (like a CNPJ or Processo number) exactly at the truncation boundary. This partial token then fails to match the redaction regex, allowing sensitive data to persist in logs.
**Prevention:** Always apply full-string redaction BEFORE any truncation for logging or display purposes. Unified logging modules (like `ai-caller.ts`) should enforce this pattern globally.
