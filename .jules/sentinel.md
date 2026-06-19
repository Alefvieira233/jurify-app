# Sentinel's Security Journal

## 2025-05-15 - Hardening Edge Function Security Utility
**Vulnerability:** Weak prompt injection detection and incomplete PII redaction in shared Edge Function utilities. Previous regex for injection was too rigid, missing common variations like "ignore all previous prompts". Base64 threshold was too high (40 chars), missing short encoded payloads. PII redaction was missing critical Brazilian formats (CNPJ, OAB, Processo CNJ).

**Learning:** Static regex patterns for security are easily bypassed by adding intervening words. Base64 encoding is a common obfuscation technique; a high threshold for detection creates a significant blind spot for short, high-impact words like "ignore" or "system".

**Prevention:** Use more flexible regex patterns that allow for word variations and intervening text. Set base64 detection thresholds to a more conservative level (e.g., 16 chars) to catch short malicious payloads. Maintain a comprehensive list of localized PII patterns (like Brazilian CNPJ/OAB) to ensure privacy compliance in specific legal jurisdictions.
