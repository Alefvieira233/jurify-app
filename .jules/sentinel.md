## 2025-05-15 - [PII Redaction in AI Logs]
**Vulnerability:** Persistent storage of PII (CPF, Phone, Email, OAB) in AI interaction logs.
**Learning:** AI Agent logs (like `agent_ai_logs`) often capture full prompts and results for debugging, which unintentionally persists sensitive user data in the database.
**Prevention:** Always apply `redactPII` to prompt and result fields before database insertion in Edge Functions.

## 2025-05-15 - [Defense in Depth for AI Responses]
**Vulnerability:** LLMs may inadvertently reveal sensitive PII (like OAB numbers or private phones) in generated responses.
**Learning:** System prompt instructions ("Never reveal CPFs...") are not a guarantee. Hard redaction at the application level is necessary.
**Prevention:** Apply a shared `redactPII` utility to all AI-generated text before it is sent to the end user (e.g., via WhatsApp or Chat UI).
