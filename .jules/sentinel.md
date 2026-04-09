## 2026-03-04 - PII Leakage in AI Interaction Logs
**Vulnerability:** Persistent database logs in `agent_ai_logs` were storing raw system prompts, user prompts, and AI responses containing sensitive PII (Emails, Phone numbers).
**Learning:** Shared security utilities may omit common PII patterns like Email or Phone numbers while focusing on region-specific identifiers (CPF/RG). Additionally, redacting after truncation can leave partial sensitive data at the boundaries.
**Prevention:** Centralize PII redaction patterns in a shared utility and ensure all conversational or AI-generated content is passed through `redactPII` BEFORE any truncation or database insertion.
