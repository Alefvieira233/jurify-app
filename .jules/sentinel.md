## 2026-03-25 - [PII Redaction in Logs]
**Vulnerability:** Sensitive user data (CPF, Email, Phone, Legal IDs) was being logged in plain text to the database (agent_ai_logs, assistant_audit) through various Edge Functions.
**Learning:** Initial redaction was incomplete and often applied after truncation. Truncating a string (e.g., .substring(0, 500)) can split a PII token (like a CPF or Credit Card number), making it unmatchable by regex patterns while still being readable to anyone with database access.
**Prevention:** Centralized PII redaction using a robust set of patterns synchronized across the system. Critical Rule: Always apply redactPII to the full content string BEFORE performing any character-based truncation for logging purposes.
