## 2026-05-07 - Homoglyph Bypass in Prompt Injection Scanner
**Vulnerability:** The `HOMOGLYPHS` map incorrectly mapped the digit "1" to the letter "l" instead of "i".
**Learning:** This allowed attackers to bypass "ignore" detection by using "1gnore", as the normalization would result in "lgnore", which does not match the regex for "ignore".
**Prevention:** Ensure homoglyph maps accurately reflect visual similarities that lead to valid word substitutions in the target language or context.

## 2026-05-07 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Logging logic was performing string truncation (e.g., `.substring(0, 80)`) before calling `redactPII()`.
**Learning:** Performing truncation first can split a sensitive token (like a CPF or Credit Card number) at the boundary. The resulting partial token no longer matches the PII regex, causing it to be logged in plaintext while the full token would have been redacted.
**Prevention:** Always apply PII redaction to the full content string before any character-based truncation for logging or display purposes.
