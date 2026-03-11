## 2025-05-15 - [PII Leakage in AI Logs & Insecure Randomness]
**Vulnerability:** AI prompts and results containing PII were logged without redaction, and security-critical identifiers used `Math.random()`.
**Learning:** Truncation alone is insufficient for data privacy (LGPD); data must be explicitly redacted before persistent logging. `Math.random()` is unsuitable for security tokens/IDs in both frontend and backend.
**Prevention:** Centralize PII redaction patterns in a shared security module and apply it to all database logging of AI interactions. Use `crypto.getRandomValues()` for all security-critical identifier generation.
