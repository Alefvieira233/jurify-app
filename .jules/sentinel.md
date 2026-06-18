## 2026-04-10 - Enhanced PII Redaction and Prompt Injection Hardening
**Vulnerability:** Weak prompt injection detection and limited PII redaction (only CPF, RG, and Card).
**Learning:** Security utilities in shared modules are high-leverage points; hardening them protects all Edge Functions simultaneously. Adopting patterns from specialized engines (like `SanitizerEngine.ts`) ensures consistency across the stack.
**Prevention:** Regularly synchronize security patterns between frontend and backend. Use robust regex with lookarounds for PII to avoid false positives and collision with other numerical data.
