# SENTINEL'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-04-18 - Log PII Leakage Pattern
**Vulnerability:** Personal Identifiable Information (PII) including CPF, CNPJ, OAB registration, and Processo CNJ were being stored in plaintext in `agent_ai_logs` and `assistant_audit` tables.
**Learning:** While edge functions implement security at the boundary, internal logging pipelines often bypass these checks for "debugging convenience," creating a secondary data leak surface. Truncation of logs was performed before redaction, potentially splitting PII tokens across character boundaries and making detection harder if applied later.
**Prevention:** Always apply PII redaction at the logging sink (the point of entry to the database) and ensure redaction happens BEFORE any string truncation. Defensive type checking in redaction utilities is critical to prevent logger-induced runtime crashes.
