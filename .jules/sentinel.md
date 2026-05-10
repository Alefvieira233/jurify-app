## 2026-05-10 - [Harden Security Middleware & PII Redaction]
**Vulnerability:** Weak prompt injection detection and incomplete PII redaction in edge function logs.
**Learning:** The previous implementation used a rigid regex for "ignore instructions" that could be easily bypassed with filler words (e.g., "ignore all previous instructions"). It also lacked coverage for critical Brazilian identifiers like CNPJ, OAB, and Processo CNJ in logs, and failed to redact PII before persisting data in `assistant_audit`.
**Prevention:** Use flexible regex patterns for injection detection (e.g., `(?:(?:\w+)\s+){0,3}`), comprehensive homoglyph mapping (including `1: "i"`), and ensure all persistent logging utilities (like `auditLog`) apply `redactPII` to untrusted content before storage.
