# Sentinel Journal - Jurify Security Learnings

## 2026-05-15 - Hardened PII Redaction & AI Logging Pipeline
**Vulnerability:** Personally Identifiable Information (PII) was being logged in plain text to the `agent_ai_logs` table. Additionally, prompt injection detection was bypassed by non-adjacent keywords (e.g., "ignore all instructions").

**Learning:** Logging logic in Edge Functions (`ai-caller.ts`) was truncating content to 2000 chars *before* any potential redaction, and the utility itself lacked patterns for Brazilian-specific legal PII (CNPJ, OAB, Processo CNJ).

**Prevention:** Always apply `redactPII` to the *full* content string before performing any truncation for logs. This ensures that a sensitive token isn't split by the truncation boundary, which would cause the regex to fail. Use non-greedy regex (`.*?`) between security keywords to prevent bypasses with filler words.
