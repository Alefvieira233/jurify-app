# Sentinel's Journal - Critical Security Learnings

## 2026-05-24 - Homoglyph Bypass in Prompt Injection Scanner
**Vulnerability:** The prompt injection scanner's homoglyph map was translating '1' to 'l' instead of 'i'. This allowed attackers to bypass regex filters for keywords like "ignore" by using "1gn0re", which the scanner would normalize to "lgnore", failing to match the `/ignore/i` pattern.
**Learning:** Normalization mapping must be carefully tuned to the specific keywords being protected. In prompt injection, '1' is more commonly used as a substitute for 'i'.
**Prevention:** Hardened the `HOMOGLYPHS` map in `_shared/security.ts` to map '1' to 'i'.

## 2026-05-24 - PII Leakage in Audit Logs
**Vulnerability:** The `auditLog` utility was inserting raw user queries and error messages directly into the `assistant_audit` table. These fields often contain sensitive Brazilian PII (CPF, CNPJ, OAB) that should never be stored in plaintext logs.
**Learning:** Shared logging utilities are a high-risk area for PII leakage if redaction is not integrated at the utility level.
**Prevention:** Integrated `redactPII` directly into the `auditLog` function to sanitize `query` and `error` fields before database insertion.
