# Sentinel 🛡️ - Security Journal

## 2026-03-04 - [CRIT-03] Broken Google Calendar OAuth Routing
**Vulnerability:** A critical functional bug prevented the Google Calendar OAuth flow from completing, as the Edge Function expected `method` in the request body, while the frontend service sent `action`.
**Learning:** Inconsistencies between frontend API calls and backend route handlers (Edge Functions) can lead to silent failures in critical authentication flows like OAuth.
**Prevention:** Standardize request payload structures between frontend services and Edge Functions. Use a unified body parser that handles both `action` and `method` for backward compatibility.

## 2026-03-04 - Weak Randomness in Security Identifiers
**Vulnerability:** `Math.random()` was used for generating `TokenId` in `SanitizerEngine.ts` and `ExecutionId` in `ai-agent-processor`.
**Learning:** `Math.random()` is PRNG-based and not cryptographically secure, making generated identifiers potentially predictable in security-sensitive contexts like PII masking.
**Prevention:** Always use `crypto.getRandomValues()` for generating security tokens or identifiers in both browser and server-side environments.
