# Sentinel's Journal - Critical Security Learnings

## 2026-05-15 - Homoglyph Bypass in Prompt Injection Scanner
**Vulnerability:** The prompt injection scanner used a homoglyph map that converted '1' to 'l' instead of 'i'.
**Learning:** Malicious prompts using '1gnore' were being normalized to 'lgnore', which failed to match the 'ignore' regex pattern, allowing bypasses of the security filter.
**Prevention:** Map numeric homoglyphs to their most likely alphabetic counterpart in the context of common attack keywords (e.g., 1 -> i for 'ignore', 'instructions').

## 2026-05-15 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Performing string truncation (`.substring()`) before PII redaction can split sensitive tokens (like a CPF or Credit Card number) at the boundary.
**Learning:** If a sensitive token is split, the regex pattern for redaction will no longer match it, allowing the partial (but still sensitive) data to be logged.
**Prevention:** Always apply full `redactPII()` to the entire string before any character-based truncation.
