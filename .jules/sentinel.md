## 2026-03-25 - Insecure Randomness & PII Sync
**Vulnerability:** Weak randomness (`Math.random()`) in PII tokenization and execution IDs; unsynchronized PII redaction patterns between frontend and backend.
**Learning:** `Math.random()` is predictable and should never be used for security-sensitive IDs. Shared utilities like `_shared/security.ts` often lag behind frontend feature components like `SanitizerEngine.ts` in terms of regex robustness.
**Prevention:** Standardize on `crypto.randomUUID()` for all ID generation. Use a single source of truth or automated tests to keep PII regex patterns synchronized across the stack.
