## 2026-05-25 - PII Leakage via Truncation-Redaction Race
**Vulnerability:** Personally Identifiable Information (PII) like phone numbers or CPFs could be partially leaked in logs even when redaction was enabled. This occurred because `text.substring(0, N)` was called before `redactPII(text)`.
**Learning:** If a sensitive token (e.g., a CPF) starts at index N-5, the truncation cuts it in half. The redaction regex, which expects a full valid pattern, then fails to match the partial token, leaving the first half visible in logs.
**Prevention:** Always apply full-string redaction BEFORE performing any character-based truncation for diagnostic logging.

## 2026-05-25 - Prompt Injection via Homoglyph "1"
**Vulnerability:** The injection detection system used `1` -> `l` mapping in its homoglyph map, which allowed bypasses using `1` as `i` (e.g., `1gnore`).
**Learning:** Attackers often use `1` for `i` more frequently than for `l` in prompt injection attempts. The decomposition normalization (NFKD) alone doesn't always catch these ASCII-level substitutions.
**Prevention:** Ensure homoglyph maps cover common character substitutions used in injection payloads (0->o, 1->i, 3->e, etc.) and harden regexes to handle non-adjacent keyword variations.
