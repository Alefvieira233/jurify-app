## 2026-06-17 - [PII Redaction Race Condition with Truncation]
**Vulnerability:** Personally Identifiable Information (PII) like CPFs or Tokens could leak into `agent_ai_logs` if they were partially truncated at the 2000-character boundary.
**Learning:** Performing `.substring(0, 2000)` *before* `redactPII()` can split a sensitive string (e.g., a 16-digit card number) in half, preventing the regex from matching it while still leaving half of the sensitive data visible in logs.
**Prevention:** Always apply PII redaction to the *full* content string before any character-based truncation or slicing for logging purposes.
