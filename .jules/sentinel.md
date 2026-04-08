# Sentinel Journal 🛡️

## 2026-03-04 - PII Leakage in AI Interaction Logs
**Vulnerability:** Sensitive user data (CPF, CNPJ, Email, Phone) and internal system prompts were being stored in plaintext in the `agent_ai_logs` table.
**Learning:** While the application had a `redactPII` utility, it was only being applied to outbound assistant responses, leaving persistent internal logs vulnerable to PII exposure. Truncating strings for logging (e.g., `substring(0, 500)`) without prior redaction can still leave significant PII fragments.
**Prevention:** Apply robust PII redaction *before* any logging or truncation of user-provided content or AI results. Shared security utilities should be comprehensive enough to cover all relevant sensitive data patterns for the application's domain (e.g., Brazilian legal identifiers).
