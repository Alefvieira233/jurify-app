## 2026-03-04 - Enhanced PII Redaction and Secure Randomness
**Vulnerability:** Weak randomness in security identifiers and incomplete PII redaction in persistent AI logs.
**Learning:** Using `Math.random()` for execution IDs and sanitization tokens makes them predictable. Additionally, while the UI might mask PII, internal system logs often capture raw AI interactions which can leak PII if not explicitly redacted before database insertion.
**Prevention:** Always use `crypto.getRandomValues()` for security-critical identifiers. Ensure PII redaction is applied at the "edge" of persistent storage (e.g., right before SQL INSERT) for any system that handles sensitive data like Brazilian legal IDs.
