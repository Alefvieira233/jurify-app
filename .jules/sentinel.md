## 2026-03-04 - PII Leakage at Truncation Boundaries
**Vulnerability:** PII (CPF, RG, Email) can be partially leaked in internal logs if redaction is applied after string truncation.
**Learning:** Regex-based redaction fails when a sensitive identifier is cut off by a 'substring' or 'slice' operation, as the pattern no longer matches the partial string.
**Prevention:** Always apply 'redactPII' to the full string BEFORE performing any truncation or length-limiting for logging purposes.
## 2026-03-30 - TruffleHog CI Configuration Conflict
**Vulnerability:** N/A (CI Process Issue)
**Learning:** In GitHub Action workflows using TruffleHog, avoid including '--fail' in the 'extra_args' parameter if the action itself is already configured to fail on secrets detection, as redundant flags cause CLI errors.
**Prevention:** Remove redundant '--fail' from 'extra_args' in TruffleHog steps.
