# SENTINEL'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-04-10 - [Prompt Injection & PII Redaction Hardening]
**Vulnerability:** Documented gaps in `sanitizeInput` allowed "ignore all previous prompts" variants and 1→i homoglyph substitutions. `redactPII` was missing CNPJ, OAB, and Processo CNJ patterns.
**Learning:** Security utilities in edge functions lacked parity with frontend sanitizers and failed to account for multi-word injection patterns or common character substitutions.
**Prevention:** Hardened regex patterns to allow up to 3 intermediate words in injection detection. Expanded homoglyph map and PII pattern list to cover regional (Brazilian) legal data requirements.
