# Sentinel's Journal - Critical Security Learnings

🛡️ This journal tracks critical security vulnerabilities, patterns, and architectural gaps discovered in the Jurify codebase.

## 2025-05-15 - Cryptographically Insecure Randomness
**Vulnerability:** Use of `Math.random()` for generating security-critical identifiers (token IDs for PII masking and execution IDs).
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable identifiers if the PRNG state is compromised or through brute-force in some contexts. While not always directly exploitable in all environments, it's a bad practice for security features.
**Prevention:** Always use `crypto.getRandomValues()` or `crypto.randomUUID()` for security-sensitive random data.
