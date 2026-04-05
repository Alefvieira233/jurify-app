# Sentinel Security Journal 🛡️

## 2026-03-04 - Secure Randomness for PII Tokens
**Vulnerability:** Use of `Math.random()` for generating PII masking tokens in `SanitizerEngine.ts`.
**Learning:** `Math.random()` is PRNG and not cryptographically secure, potentially allowing token prediction in high-volume environments.
**Prevention:** Always use `crypto.getRandomValues()` for any identifier that masks sensitive data or serves as a security token.
