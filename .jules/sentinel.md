## 2026-05-25 - [SECURITY] Redact-after-truncate vulnerability in logs
**Vulnerability:** PII (CPF, CNPJ, tokens) could leak in logs if the string was truncated BEFORE being passed to the redaction utility. This would split the pattern, making it unmatchable by regex while still exposing sensitive parts of the data.
**Learning:** String manipulation order matters in security contexts. Always apply filters/redactors to the full data source before performing display-oriented operations like truncation or formatting.
**Prevention:** Hardened `redactPII` in `_shared/security.ts` with comprehensive Brazilian legal patterns (OAB, Processo CNJ) and enforced the "redact-then-truncate" pattern across all Edge Function logging sites.
