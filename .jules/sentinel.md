# Sentinel's Journal - Critical Learnings Only

## 2026-05-08 - [PII Leakage via Truncation-Redaction Race]
**Vulnerability:** PII redaction filters being bypassed when sensitive data is truncated by logging character limits.
**Learning:** Performing `.substring()` or similar truncation BEFORE `redactPII()` can split a sensitive token (e.g., a credit card number or CPF) into two parts. The regex filter fails to match the partial token, but the log still contains enough identifiable data to pose a security risk.
**Prevention:** Always apply PII redaction to the FULL content string before any length-based truncation for logging or display.

## 2026-05-08 - [Homoglyph Bypass in Prompt Injection Scanner]
**Vulnerability:** Prompt injection attacks using "1" instead of "i" (e.g., "1gnore") were bypassing the scanner.
**Learning:** The homoglyph map was incorrectly mapping `1 -> l`. While "lgnore" is also an attack vector, the primary substitution for "i" in "ignore" is "1".
**Prevention:** Ensure homoglyph maps are comprehensive and map substitutions to their most likely intended character for pattern matching.
