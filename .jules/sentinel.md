## 2026-03-04 - PII Leakage at Truncation Boundaries
**Vulnerability:** PII (CPF, RG, Email) can be partially leaked in internal logs if redaction is applied after string truncation.
**Learning:** Regex-based redaction fails when a sensitive identifier is cut off by a 'substring' or 'slice' operation, as the pattern no longer matches the partial string.
**Prevention:** Always apply 'redactPII' to the full string BEFORE performing any truncation or length-limiting for logging purposes.
