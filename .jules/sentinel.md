# 🛡️ Sentinel's Journal - Critical Security Learnings

## 2025-05-22 - PII Leakage in AI Interaction Logs
**Vulnerability:** Sensitive data (CPF, Email, Phone) from AI prompts and results were stored in plain text in the `agent_ai_logs` table.
**Learning:** AI logging often captures full raw interactions for debugging, which inadvertently persists PII if not redacted before storage. Truncation alone is insufficient as PII can still exist in the truncated segment.
**Prevention:** Always apply redaction filters (like `redactPII`) to LLM inputs/outputs before database insertion. Redaction must happen BEFORE truncation to ensure patterns are matched correctly.

## 2025-05-22 - Weak Randomness in Sensitive Identifiers
**Vulnerability:** `Math.random()` was used for generating `execution_id` (Edge) and `tokenId` (Browser/Sanitizer).
**Learning:** `Math.random()` is PRNG and not cryptographically secure. It can lead to predictable IDs, potentially enabling ID enumeration or collision attacks in sensitive contexts like execution tracking or PII masking.
**Prevention:** Use `crypto.getRandomValues()` for all security-sensitive random value generation to ensure high entropy and unpredictability.
