## 2026-05-25 - PII Redaction/Truncation Race Condition
**Vulnerability:** Personally Identifiable Information (PII) could leak into logs even when a redaction utility is used, if the redaction is applied to a string *after* it has been truncated (e.g., via `.substring()`).
**Learning:** Truncating a string before redacting can split sensitive tokens (like a CPF or Lawsuit number) in a way that they no longer match the regex patterns, while still leaving the data partially identifiable and sensitive.
**Prevention:** Always apply full PII redaction to the entire content string before performing any character-based truncation for display or storage previews.

## 2026-05-25 - Robust Redaction for Logging
**Vulnerability:** Redaction utilities often expect strings, but logging frameworks often pass complex objects, arrays, or other types, which might bypass redaction or cause errors if not handled.
**Learning:** Edge functions often log raw payloads for debugging. If `redactPII` only accepts strings, developers might forget to stringify and redact, or pass objects that are then stringified *after* the redaction check.
**Prevention:** The `redactPII` utility should defensively handle `null`, `undefined`, and complex objects (via `JSON.stringify`) to ensure that all data destined for logs is sanitized regardless of its original type.
