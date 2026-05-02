# Sentinel Security Journal

## 2026-04-11 - Enhanced PII Redaction in Edge Functions
**Vulnerability:** Audit logs were storing raw user queries which could contain PII (CPF, CNPJ, OAB, etc.), and the shared `redactPII` utility lacked patterns for several Brazilian-specific identifiers used in the legal context.
**Learning:** Security utilities in shared folders must be kept in sync with frontend equivalents to ensure consistent data protection across the entire stack. Defensive type checking is crucial in Edge Functions where AI-generated content might occasionally return non-string types.
**Prevention:** Centralized security logic should be the single source of truth, and automated tests should verify that all sensitive data types are covered. Always redact sensitive fields BEFORE logging to external or internal databases.
