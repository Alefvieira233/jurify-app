## 2026-05-09 - Audit Log PII Leakage
**Vulnerability:** Audit logs were capturing raw user queries and error messages which often contained sensitive Brazilian PII (CPF, Process numbers, etc.) without redaction.
**Learning:** Shared security utilities like `auditLog` must be "secure by default" and apply redaction internally rather than relying on callers to sanitize data before logging.
**Prevention:** Always pass untrusted or variable-content strings through `redactPII` immediately before database persistence in logging or auditing functions.
