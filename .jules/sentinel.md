## 2026-05-27 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Personal Identifiable Information (PII) like Emails, CPFs, and Phone numbers were leaking into `agent_ai_logs` and console logs because the code was performing `.substring()` or truncation BEFORE calling `redactPII()`.
**Learning:** Truncating a string before redaction can split a sensitive token (e.g., "test.user@exam" | "ple.com"), making it impossible for regex-based redaction patterns to match the PII, while still exposing enough information to identify the user.
**Prevention:** ALWAYS apply `redactPII` to the FULL content string first. Only perform character-based truncation for display or storage limits after the sensitive data has been replaced with placeholders.
