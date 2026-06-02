## 2026-06-02 - [PII Leakage via Truncation-Redaction Race]
**Vulnerability:** Personally Identifiable Information (PII) could leak into logs if character-based truncation (e.g., `.substring(0, 50)`) was performed *before* applying PII redaction filters.
**Learning:** Performing truncation first can split sensitive tokens (like a CPF or Credit Card number) exactly at the boundary, making them unmatchable by standard regex patterns while still leaving enough cleartext to be identifying.
**Prevention:** Always apply `redactPII` to the FULL content string first, and only THEN perform truncation for log previews. Centralizing this in a unified caller (like `ai-caller.ts`) ensures consistent protection across all edge functions.

## 2026-06-02 - [Homoglyph Mapping Correction 1→i]
**Vulnerability:** Prompt injection detection was bypassed by substituting 'i' with '1' (e.g., `1gnore`) because the `HOMOGLYPHS` map incorrectly mapped '1' to 'l'.
**Learning:** Attackers use visual similarities (homoglyphs) to bypass static keyword filters. '1' is more commonly used to replace 'i' in injection contexts.
**Prevention:** Ensure the `HOMOGLYPHS` map reflects actual substitution patterns observed in the wild. Corrected '1' mapping to 'i' and added more flexible regex patterns with non-greedy matching to catch multi-word injection variations.
