# Sentinel 🛡️ - Security Journal

## 2025-05-22 - AI Log PII Exposure
**Vulnerability:** AI interaction logs (`agent_ai_logs` table) were storing full system prompts, user prompts, and AI results containing sensitive Brazilian PII (CPF, CNPJ, etc.) without redaction.
**Learning:** While the frontend uses `SanitizerEngine` for real-time masking, backend Edge Functions often log raw data for debugging/audit purposes, creating a persistent PII leakage point in the database.
**Prevention:** Centralize PII redaction patterns in a shared utility (`_shared/security.ts`) and ensure all persistent logging of AI interactions passes through this filter before database insertion.
