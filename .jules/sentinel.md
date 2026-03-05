# SENTINEL'S JOURNAL - CRITICAL LEARNINGS

## 2026-03-05 - [PII Redaction Enhancement]
**Vulnerability:** Potential PII leakage in AI logs and responses.
**Learning:** AI responses could accidentally leak sensitive information like client emails, phone numbers, or lawyer OAB numbers. These were being logged in plain text in `agent_ai_logs` and `assistant_audit` tables.
**Prevention:** Centralized `redactPII` utility in `supabase/functions/_shared/security.ts` and applied it to all outgoing AI content and internal audit logs.
