## 2026-05-08 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** PII tokens (CPF, CNPJ, etc.) could bypass redaction logic if they were split by string truncation (e.g., `.slice(0, 500)`) before the `redactPII` function was called.
**Learning:** Security filters must always be applied to the *full* untrusted input before any formatting or truncation occurs. Truncation is an "untrusted" transformation that can destroy the semantic structure needed by regex-based scanners.
**Prevention:** In unified logging modules or audit trail handlers, enforce a "Redact then Truncate" sequence.

## 2026-05-08 - Homoglyph Bypass in Prompt Injection Scanner
**Vulnerability:** The `HOMOGLYPHS` map was mapping '1' to 'l' instead of 'i', allowing variations like '1gnore' to bypass regex filters for 'ignore'.
**Learning:** Homoglyph mapping must be exhaustive and prioritized based on the target regex patterns. Since 'ignore' is a critical keyword, '1' should map to 'i'.
**Prevention:** Regularly audit homoglyph maps against the keyword lists used in security patterns.
