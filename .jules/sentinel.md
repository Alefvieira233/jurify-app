## 2026-05-26 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Truncating strings (via `.substring()` or `.slice()`) before applying PII redaction can split sensitive tokens (CPFs, CNPJs, Phone numbers), causing regex-based redaction to fail and leading to sensitive data leaks in logs.
**Learning:** Security filters must always be applied to the *full* content string before any presentation-layer transformations like truncation occur.
**Prevention:** In this codebase, always call `redactPII(text)` on the original string before applying `.substring(0, N)` for logging or previews.
