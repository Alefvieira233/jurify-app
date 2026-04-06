## 2026-03-04 - PII Leakage in AI Interaction Logs
**Vulnerability:** Personally Identifiable Information (PII) such as CPF, CNPJ, OAB, and Processo CNJ was being stored in plain text (though truncated) within the `agent_ai_logs` table during AI processing.
**Learning:** Truncation alone is insufficient for PII protection in logs, especially in legal contexts where sensitive identifiers are common at the start of prompts or results. Centralized redaction must be applied before any persistence or external transmission.
**Prevention:** Apply `redactPII` to all logged prompts and AI results. Synchronize PII patterns between the frontend SanitizerEngine and backend shared security utilities to ensure consistent protection across the entire data flow.
