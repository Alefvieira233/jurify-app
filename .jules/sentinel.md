## 2026-05-15 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** PII redaction filters (Regex) failing when sensitive tokens are split across string boundaries.
**Learning:** Performing `.substring()` or truncation BEFORE `redactPII()` can slice a CPF or Email in half, making it unmatchable by security regexes while still leaking the partial identifiable data in logs.
**Prevention:** Always apply `redactPII()` to the FULL content string first, and only truncate the resulting sanitized string for storage/preview.
