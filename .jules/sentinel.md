## 2026-03-05 - [CRITICAL] Homoglyph and Pattern Bypass in Prompt Injection Scanner
**Vulnerability:** The prompt injection scanner was bypassed using '1' instead of 'i' (e.g., '1gnore') and variations like 'ignore all previous prompts'.
**Learning:** The homoglyph map was incomplete ('1' mapped to 'l' instead of 'i'), and the regex pattern was too rigid, requiring specific adjacent tokens.
**Prevention:** Hardened the homoglyph map to include '1' -> 'i' and updated regex patterns to allow optional filler words between critical injection tokens.

## 2026-03-05 - [HIGH] Insufficient PII Redaction in Edge Functions
**Vulnerability:** Sensitive Brazilian legal data (CNPJ, OAB, Processo CNJ) and contact info (Email, Phone) were not redacted in logs.
**Learning:** Only basic CPF and Credit Card patterns were implemented, leaving significant LGPD exposure for specialized legal data.
**Prevention:** Expanded PII_PATTERNS to include comprehensive legal and contact identifiers with strict boundary checks to avoid false positives.
