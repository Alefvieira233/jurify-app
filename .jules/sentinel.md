## 2026-04-10 - Hardening PII Redaction and Prompt Injection Detection
**Vulnerability:** The PII redaction utility lacked coverage for critical Brazilian identifiers (CNPJ, OAB, Processo CNJ) and the prompt injection detection had gaps in homoglyph mapping (1→l instead of 1→i) and flexible pattern matching (e.g., "ignore all previous prompts").
**Learning:** Security utilities in shared Edge Function modules often rot if they don't explicitly account for all regional PII formats. Homoglyph maps must be comprehensive (mapping '1' to both 'l' and 'i') to prevent bypasses in prompt injection filters.
**Prevention:** Use a prioritized list of regex patterns in `redactPII` and use non-greedy matching (`.*?`) in prompt injection patterns to account for natural language variations.
