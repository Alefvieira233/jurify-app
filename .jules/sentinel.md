# SENTINEL'S JOURNAL - CRITICAL SECURITY LEARNINGS

## 2026-05-15 - PII Redaction/Truncation Race Condition
**Vulnerability:** Personally Identifiable Information (PII) could leak in logs despite redaction filters.
**Learning:** Redaction filters (regex) often fail when a sensitive string is split by character-based truncation (e.g., `content.substring(0, 200)`). If a CNPJ or CPF is cut in half at the boundary, it no longer matches the regex and remains visible in the log.
**Prevention:** Always apply `redactPII` to the full string BEFORE performing any truncation for diagnostic or preview fields.

## 2026-05-15 - Homoglyph Mapping Gaps
**Vulnerability:** Prompt injection attacks using "1gnore" instead of "ignore" were bypassing filters.
**Learning:** The existing homoglyph map was mapping `1` to `l` (visual similarity) instead of `i` (semantic similarity for many prompt injection keywords).
**Prevention:** Map numeric homoglyphs to their most common semantic alphabetic equivalent in the target language/context (e.g., `1` -> `i` for "ignore").

## 2026-05-15 - Non-Greedy Injection Detection
**Vulnerability:** Simple regex patterns like `ignore\s+instructions` fail to catch `ignore all previous instructions`.
**Learning:** Attackers use filler words to break simple keyword adjacency checks.
**Prevention:** Use non-greedy wildcards (`.*?`) between critical keywords in injection detection patterns to maintain flexibility while catching common attack structures.
