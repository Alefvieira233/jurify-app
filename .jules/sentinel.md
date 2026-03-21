# 🛡️ Sentinel's Journal - Critical Security Learnings

## 2026-03-04 - [CRITICAL] Google OAuth Token Exposure & Integration Mismatch
**Vulnerability:** The `google-calendar` Edge Function lacked handlers for `exchange_code` and `refresh_token` actions, while the frontend was attempting to delegate these sensitive operations to it. This effectively broke the "secure by design" OAuth flow where the `client_secret` stays server-side. Additionally, the function only looked for a `method` field in the request body, while the frontend sent `action`.
**Learning:** Even with a secure architecture (Edge Functions), a simple mismatch in field names (`method` vs `action`) or missing route handlers can leave security features unimplemented and create a "broken" state that might tempt developers to move secrets back to the frontend for a "quick fix".
**Prevention:** Always verify integration contracts between frontend and server-side functions. Implement robust routing in Edge Functions that can handle legacy or alternative field names (e.g., `body.method || body.action`) to ensure security-critical flows are reachable.

## 2026-03-04 - [HIGH] Weak Randomness in Security-Critical Identifiers
**Vulnerability:** Multiple files (`ai-agent-processor`, `whatsapp-webhook`, `SanitizerEngine.ts`) used `Math.random()` for generating execution IDs and PII replacement tokens.
**Learning:** While `Math.random()` is convenient, it is not cryptographically secure and its PRNG state can be predictable in certain environments, leading to token collision or ID guessing.
**Prevention:** Enforce the use of `crypto.getRandomValues()` for any identifier that requires uniqueness or cryptographic strength, especially when used in security contexts like PII masking.

## 2026-03-04 - [MEDIUM] Inconsistent PII Redaction in Logs
**Vulnerability:** AI interaction logs (`agent_ai_logs`) were storing raw system prompts, user prompts, and full AI results without redacting Brazilian legal identifiers (CPF, CNPJ, OAB, etc.), leading to PII accumulation in the database.
**Learning:** PII redaction must be applied at the point of persistence (logging) and not just at the point of presentation. Different parts of the system used inconsistent redaction patterns.
**Prevention:** Centralize PII patterns in a shared utility (`_shared/security.ts`) and ensure all logging pipelines invoke these filters before database insertion.
