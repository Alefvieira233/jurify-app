## 2025-05-15 - [PII Leakage in AI Logs & Insecure ID Generation]
**Vulnerability:** Personally Identifiable Information (PII) like CPF, CNPJ, OAB, and Emails were being logged in plaintext to the `agent_ai_logs` and `assistant_audit` tables. Additionally, `Math.random()` was used for sensitive ID generation (execution IDs, token IDs).
**Learning:** Even if data is sanitized before reaching the LLM, internal logging mechanisms can still leak raw user data if not specifically hardened. Using `Math.random()` for security-critical IDs makes them predictable.
**Prevention:** Always apply PII redaction (e.g., `redactPII`) at the point of logging. Use `crypto.getRandomValues()` for all security-critical random data to ensure cryptographic strength and unpredictability.
