## 2026-04-10 - [HIGH] PII Leakage via Truncation-Redaction Race
**Vulnerability:** PII (Personally Identifiable Information) could be partially leaked in logs when a string was truncated using `.substring()` before being passed to `redactPII()`.
**Learning:** Regex-based redactors depend on the integrity of the PII pattern. If a sensitive token (e.g., an email address) is split at the truncation boundary, the regex will fail to match it, resulting in the first half of the sensitive data being written to logs.
**Prevention:** Always apply PII redaction to the full content string BEFORE performing any character-based truncation.

## 2026-04-10 - [improvement] Hardened Prompt Injection Detection
**Vulnerability:** Basic prompt injection filters using adjacent keyword matching (e.g., "ignore previous") were easily bypassed by adding filler words (e.g., "ignore all previous") or using short base64 encoded payloads.
**Learning:** Attackers use natural language variations and encoding to bypass strict keyword filters.
**Prevention:** Use more flexible regex patterns that allow for intermediate tokens, maintain a comprehensive homoglyph map (e.g., mapping '1' to 'i'), and reduce the threshold for base64 payload detection to catch shorter encoded commands.

## 2026-04-10 - [improvement] Playwright E2E Selection Stability
**Vulnerability:** E2E tests failed in CI due to "strict mode violations" when selecting elements by label (e.g., "Senha" matching both Password and Confirm Password fields).
**Learning:** Generic label matching is fragile in complex forms.
**Prevention:** Use unique `data-testid` attributes for stable and unambiguous element selection in E2E tests.
