## 2026-05-15 - Information Leakage via Raw Error Strings
**Vulnerability:** Edge Functions were returning raw `err.message` in the response body to clients.
**Learning:** This exposes internal logic, library versions, and potentially sensitive stack traces or database structures to the end user.
**Prevention:** Always wrap Edge Function logic in try/catch blocks and return generic, user-friendly error messages. Ensure original errors are logged to internal consoles for debugging.

## 2026-05-15 - PII Redaction Collision and Inconsistency
**Vulnerability:** Shared PII redaction logic was missing critical Brazilian legal identifiers (OAB, CNPJ, Processo CNJ) and prioritized phone detection over credit cards, leading to partial redaction.
**Learning:** Inconsistent redaction across frontend and backend creates gaps where sensitive data can leak into AI logs or audit trails. Reordering regex patterns (placing specific multi-digit patterns like Credit Cards first) is necessary to avoid shorter patterns (like phone) consuming parts of larger ones.
**Prevention:** Synchronize PII patterns between `SanitizerEngine.ts` and `_shared/security.ts`. Order patterns from most specific (and longest) to most general.
