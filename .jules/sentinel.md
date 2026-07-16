## 2026-05-25 - Internal Service-Role Protection & Redaction Alignment
**Vulnerability:** Edge Functions intended for internal use were missing explicit Authorization header verification, and PII redaction was being applied to already-truncated strings in logs.
**Learning:** Internal services often operate under "implicit trust," but in a multi-tenant environment, every entry point must verify its caller. Additionally, character-based truncation before redaction can split sensitive patterns (like CPFs or phone numbers), allowing them to escape regex detection.
**Prevention:** Always use `isServiceRole(req)` at the entry point of non-user-facing Edge Functions. Ensure `redactPII` is called on the FULL string before any `.substring()` or `.slice()` operations for diagnostic logging.
