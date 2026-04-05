# Sentinel Security Journal 🛡️

## 2026-03-04 - Secure Randomness for PII Tokens
**Vulnerability:** Use of `Math.random()` for generating PII masking tokens in `SanitizerEngine.ts`.
**Learning:** `Math.random()` is PRNG and not cryptographically secure, potentially allowing token prediction in high-volume environments.
**Prevention:** Always use `crypto.getRandomValues()` for any identifier that masks sensitive data or serves as a security token.

## 2026-03-04 - Edge Function Secret Leakage
**Vulnerability:** Attempting to fix OAuth by returning `refresh_token` from an Edge Function to the client.
**Learning:** Returning long-lived secrets to the frontend increases the attack surface (XSS/token theft). Edge Functions should handle the exchange and storage server-side.
**Prevention:** Sensitive tokens (refresh tokens, client secrets) must NEVER be sent in the response body to the client. Store them securely in the database and only return short-lived access tokens or success indicators.
