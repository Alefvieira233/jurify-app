# Sentinel 🛡️ - Security Journal

## 2025-05-15 - Enhanced PII Redaction in Edge Functions
**Vulnerability:** Personally Identifiable Information (PII) like OAB, Email, and Phone numbers were being stored in plain text in internal logs (`agent_ai_logs`) and sent via WhatsApp without proper sanitization.
**Learning:** Centralized security utilities in `_shared` are powerful but must be kept updated. Incomplete redaction patterns in shared modules can leave multiple Edge Functions vulnerable.
**Prevention:** Always verify that redaction utilities cover all critical identifiers (LGPD compliance) and ensure they are applied before any data persistence or external communication in Edge Functions.
