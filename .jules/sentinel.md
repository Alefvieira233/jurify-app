## 2026-03-03 - PII Redaction in AI Logs
**Vulnerability:** AI interaction logs in the `agent_ai_logs` table contained sensitive information (PII) like names, emails, and phone numbers in cleartext.
**Learning:** While PII redaction is important, it should be applied to internal logs (Data Minimization) rather than end-user responses to avoid functional regressions. Redacting streaming responses on the fly is technically challenging due to PII tokens being split across chunks.
**Prevention:** Always apply `redactPII` before storing data in non-encrypted log tables. For AI agents, ensure both prompts and results are sanitized before database insertion.
