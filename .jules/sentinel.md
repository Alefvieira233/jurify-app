# Sentinel Security Journal

## 2024-05-22 - [HIGH] PII Leakage in AI Logs & Weak Randomness
**Vulnerability:** Persistent AI logs (`agent_ai_logs`) contained raw PII in `system_prompt`, `user_prompt`, and `full_result` fields. Additionally, internal execution IDs were generated using `Math.random()`, which is not cryptographically secure.
**Learning:** Even when truncating logs for storage, PII can still persist in the remaining characters. Security-critical identifiers must use strong entropy to prevent predictability.
**Prevention:** Always apply `redactPII` before storing data in persistent logs. Use `crypto.getRandomValues()` for all security-critical ID generation across both backend (Edge Functions) and frontend.
