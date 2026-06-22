## 2026-03-05 - [Injection Pattern Rigidity]
**Vulnerability:** Prompt injection detection bypass via filler words or character substitution.
**Learning:** Rigid regex patterns like `ignore\s+previous\s+instructions` are easily bypassed by adding words (e.g., "ignore all previous instructions") or using homoglyphs (e.g., "1nstructions").
**Prevention:** Use non-greedy wildcard spacers in security regexes and maintain a comprehensive homoglyph map that prioritizes high-risk substitutions (like 1→i).

## 2026-03-05 - [PII Leakage in Audit Logs]
**Vulnerability:** Sensitive user data (CPF, Card) persisted in cleartext in `assistant_audit` and error logs.
**Learning:** Developers often forget that logs are also data sinks that require the same PII protection as user-facing responses.
**Prevention:** Implement PII redaction directly within the logging utility (`auditLog`) to ensure all data is sanitized before hitting the database, regardless of whether the caller remembered to redact.
