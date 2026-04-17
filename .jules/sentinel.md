## 2026-03-16 - Weak Randomness in Identifiers
**Vulnerability:** Use of `Math.random()` for generating `execution_id` and PII masking tokens.
**Learning:** `Math.random()` is PRNG and not cryptographically secure, making generated identifiers predictable if the internal state is leaked or guessed. In this codebase, it was used for tracking AI executions and masking sensitive legal data.
**Prevention:** Use the Web Crypto API (`crypto.randomUUID()` or `crypto.getRandomValues()`) which is available in both Deno Edge Functions and modern browsers.
