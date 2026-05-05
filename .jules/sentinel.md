# Sentinel Security Journal

## 2026-04-10 - [PII Leakage in AI Logs & Rigid Prompt Injection Regex]
**Vulnerability:** PII (Emails, Phone numbers) was being persisted in plaintext within `agent_ai_logs` via `ai-caller.ts` and `whatsapp-webhook`. Additionally, prompt injection detection was easily bypassed by adding optional words (e.g., "ignore all previous instructions").
**Learning:** Security middleware must be applied not just at the edge, but at the point of persistence for audit logs. Regex patterns for security must account for natural language variations.
**Prevention:** Always wrap log-bound AI content in `redactPII`. Use flexible regex patterns for prompt injection that allow for common filler words.
