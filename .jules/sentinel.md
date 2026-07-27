## 2026-07-20 - Insecure Randomness in PII Masking Token ID Generation
**Vulnerability:** Weak PRNG via `Math.random()` in `SanitizerEngine.ts` to generate PII masking token IDs.
**Learning:** Using insecure random generators in security-critical paths (such as PII token anonymization/masking) can result in predictable or correlated tokens, exposing the platform to token correlation attacks.
**Prevention:** Always use cryptographically secure pseudo-random number generators (CSPRNG) like `crypto.getRandomValues()` for generating random identifiers, tokens, or hashes, and provide standard fallbacks for restricted environments.
