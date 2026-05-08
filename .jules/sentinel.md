# Sentinel Journal 🛡️

## 2026-05-15 - PII Redaction and Logging Hardening
**Vulnerability:** PII leakage in AI conversational logs (`agent_ai_logs`). User prompts and AI results containing sensitive Brazilian legal data (CPF, CNPJ, OAB, etc.) were being logged and truncated BEFORE redaction, leading to split and unmasked tokens.
**Learning:** Redaction must always occur on the full content string before any character-based truncation. Patterns for niche PII (like Brazilian OAB or Processo CNJ) must account for various prefixes and separators to be effective.
**Prevention:** Centralize PII patterns in a shared security utility and mandate its use in all unified logging paths (`ai-caller.ts`). Use dynamic imports where necessary to avoid circular dependencies in Edge Functions.
