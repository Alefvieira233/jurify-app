# Sentinel's Critical Security Journal 🛡️

## 2026-08-07 - CSPRNG Tokenization and Audit Hardening
**Vulnerability:** Predictable PII Token ID generation in the LGPD Sanitizer Engine. Previously, `Math.random()` was used to generate token identifiers for redacted entities (e.g., CPF, CNPJ, OAB). Predictable pseudo-random generation can lead to token correlation, predictability attacks, and privacy leakage.
**Learning:** Security utilities (especially ones dealing with PII tokenization/masking) should leverage cryptographically secure pseudo-random number generators (CSPRNG) like `crypto.getRandomValues()` whenever possible.
**Prevention:** Always default to using the environment's `crypto` API for generating security tokens, fallback safely to standard pseudo-randomness only in highly restricted runtimes that don't support CSPRNG. In addition, ensure local validation scripts (like `security-audit.cjs`) use comprehensive multi-block parsing (e.g., `flatMap()`) to prevent false negatives.
