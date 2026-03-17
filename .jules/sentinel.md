# 🛡️ Sentinel Security Journal

## 2026-03-04 - PII Exposure in AI Logs & Weak ID Generation
**Vulnerability:** Personally Identifiable Information (PII) like CPF, emails, and phone numbers was being stored in plain text (or merely truncated) within the `agent_ai_logs` table via Edge Functions. Additionally, `Math.random()` was used for generating `execution_id`, which is not cryptographically secure.

**Learning:** Truncation is insufficient for protecting PII in persistent logs. Shared security utilities (like `redactPII`) must be synchronized across frontend and backend to ensure consistent protection. Internal IDs that could theoretically be targeted or guessed should use cryptographic entropy.

**Prevention:** Always apply `redactPII` to prompts and results before database insertion. Use `crypto.getRandomValues()` for sensitive ID generation in all environments (Browser & Deno).
