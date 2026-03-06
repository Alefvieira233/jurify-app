# Sentinel 🛡️ - Security Journal

## 2025-05-15 - Enhanced PII Redaction in Edge Functions
**Vulnerability:** Personally Identifiable Information (PII) like OAB, Email, and Phone numbers were being stored in plain text in internal logs (`agent_ai_logs`) and sent via WhatsApp without proper sanitization.
**Learning:** Centralized security utilities in `_shared` are powerful but must be kept updated. Incomplete redaction patterns in shared modules can leave multiple Edge Functions vulnerable.
**Prevention:** Always verify that redaction utilities cover all critical identifiers (LGPD compliance) and ensure they are applied before any data persistence or external communication in Edge Functions.

## 2025-05-15 - Redundant TruffleHog Flags
**Vulnerability:** CI/CD pipeline failure due to misconfigured secret scanner.
**Learning:** The `trufflesecurity/trufflehog` GitHub Action automatically includes the `--fail` flag by default. Adding it manually to `extra_args` causes the tool to crash with a "flag 'fail' cannot be repeated" error, effectively disabling the security check.
**Prevention:** Do not include `--fail` in `extra_args` when using the TruffleHog GitHub Action. Always check action logs to see how commands are being constructed.
