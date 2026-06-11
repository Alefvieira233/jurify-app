## 2026-06-11 - [Redact-after-truncate Vulnerability]
**Vulnerability:** Personally Identifiable Information (PII) redaction logic could be bypassed if the sensitive token was split by character-based truncation (e.g., .substring()) before the redaction regex was applied.
**Learning:** In logging pipelines, redaction must always happen on the full content string. Truncation for observability (to save space) must only occur after the data has been scrubbed.
**Prevention:** Standardize a logging pattern where redactPII(fullText).substring(0, N) is used instead of redactPII(fullText.substring(0, N)).

## 2026-06-11 - [Multi-block Security Header Validation]
**Vulnerability:** The security audit script incorrectly reported missing headers because it only inspected the first block of 'vercel.json', missing headers defined for the root path in subsequent blocks.
**Learning:** Configuration files like vercel.json often use multiple header blocks for different path patterns. Audit tools must aggregate headers from all blocks to determine effective security posture.
**Prevention:** Iterate through all header configurations in the audit script and use a Set to track detected headers.

## 2026-06-11 - [PII Regex Priority Collision]
**Vulnerability:** Raw 11-digit CPF numbers were being incorrectly redacted as 'Phone' because the Brazilian phone regex matched the numeric sequence before the CPF regex had a chance to run.
**Learning:** Overlapping patterns (like CPF and Brazilian Phone numbers) require careful prioritization in the redaction loop. The more specific or higher-confidence pattern must run first.
**Prevention:** Order patterns from most specific to least specific. Prioritize CPF over Phone when dealing with 11-digit numeric strings.
