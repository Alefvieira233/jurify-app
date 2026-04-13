## 2026-04-10 - PII Exposure in AI Logs & Weak Randomness
**Vulnerability:** AI interaction logs in 'agent_ai_logs' stored full system prompts, user prompts, and results in plaintext, exposing sensitive legal data (PII). Execution IDs were generated using Math.random(), which is predictable.
**Learning:** Shared security utilities like 'redactPII' must be proactively applied to all logging layers, especially for AI-generated content which often contains unstructured sensitive data.
**Prevention:** Enforce the use of 'redactPII' for all database insertions involving unstructured text from external providers or users. Replace Math.random() with crypto.getRandomValues() for any unique identifiers that require cryptographic strength.
