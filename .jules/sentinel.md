## 2024-05-20 - PII Redaction Pattern Synchronization
**Vulnerability:** Inconsistent PII redaction between frontend and backend, and missing redaction in AI logs.
**Learning:** Shared security utilities must be kept in sync with client-side sanitizers to ensure comprehensive protection across the data lifecycle. Using word boundaries (`\b`) is essential for precision, but leading boundaries must be handled carefully for identifiers like Phone and Email that often follow non-word characters.
**Prevention:** Centralize PII pattern definitions where possible or implement automated synchronization tests. Always apply PII redaction to internal logs that store AI interactions.

## 2024-05-20 - Cryptographically Strong Identifiers
**Vulnerability:** Use of `Math.random()` for security-critical identifiers (execution IDs, token IDs) and retry jitter.
**Learning:** `Math.random()` is PRNG and not suitable for security-critical contexts. `crypto.getRandomValues()` provides the necessary cryptographic strength and is available in both modern browser and Deno environments.
**Prevention:** Enforce the use of `crypto.getRandomValues()` via linting or standard utility functions for all ID generation and security-related randomness.
