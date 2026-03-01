## 2024-03-21 - Cryptographically Weak ID Generation
**Vulnerability:** Use of `Math.random()` for generating sensitive identifiers (PII tokens, execution IDs, message IDs).
**Learning:** `Math.random()` is not cryptographically secure and can result in predictable IDs, potentially leading to data enumeration or token collisions in high-concurrency environments.
**Prevention:** Always use `crypto.getRandomValues()` for any security-critical identifiers or tokens.
