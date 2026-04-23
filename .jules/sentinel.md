# Sentinel's Journal 🛡️

## 2026-04-10 - Secure Randomness for Execution IDs
**Vulnerability:** Execution IDs were generated using `Math.random().toString(36).substring(2, 11)`.
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable IDs, which is a risk for sensitive operation tracking.
**Prevention:** Always use `crypto.randomUUID()` or `crypto.getRandomValues()` for security-sensitive unique identifiers.

## 2026-04-10 - PII Redaction in AI Interaction Logs
**Vulnerability:** AI interaction logs (`system_prompt`, `user_prompt`, `full_result`) were stored in `agent_ai_logs` without PII redaction.
**Learning:** Storing raw AI prompts and responses can lead to massive PII leakage (CPF, CNPJ, OAB, Emails, Phones) in database logs, violating LGPD compliance.
**Prevention:** Apply `redactPII` to all logged content *before* truncation and database insertion to ensure sensitive data is never persisted in plain text.

## 2026-04-10 - Regex Priority in PII Redaction
**Vulnerability:** Credit card pattern was placed after Phone/Email patterns in `PII_PATTERNS`, causing partial redaction of card numbers as phone numbers.
**Learning:** Order of regex patterns matters when they can partially overlap. A 16-digit number matches phone patterns before the full card pattern if not careful.
**Prevention:** Place high-entropy or longer numeric patterns (like Credit Cards) at the top of the redaction array to ensure they are matched and redacted as a whole.
