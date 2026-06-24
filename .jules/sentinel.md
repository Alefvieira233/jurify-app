## 2025-05-15 - [CRITICAL] Redact-after-truncate Vulnerability in Logs
**Vulnerability:** Sensitive PII (CPF, CNPJ, Tokens) could leak into logs if redaction was applied to a string that had already been truncated (e.g., `text.substring(0, 50)`).
**Learning:** Regex patterns often depend on word boundaries (`\b`) or specific lengths/suffixes. Truncating a string mid-token (like a JWT or a long phone number) can break the regex match, leaving a partial but still sensitive identifier exposed in plain text in observability tables or console logs.
**Prevention:** Always apply `redactPII` (or any masking logic) to the FULL content string before performing any character-based truncation for preview purposes. This ensures the regex has the complete context needed for a match.
