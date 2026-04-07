# Sentinel Security Journal 🛡️

## 2026-03-05 - Google OAuth Token Leakage and Client-side Persistence
**Vulnerability:** OAuth tokens (including `refresh_token`) were being stored in the browser and API calls were being made directly from the client.
**Learning:** Storing `refresh_token` in the browser allows persistent account takeover if the device is compromised. Direct API calls from the browser expose the `access_token` and require more complex client-side logic that could be centralized.
**Prevention:** Always handle OAuth code exchange and token refresh in a secure server-side environment (like Edge Functions). Store tokens encrypted at rest and proxy sensitive API calls through the backend. Never return the `refresh_token` to the client.

## 2026-03-05 - Encryption at Rest in Edge Functions
**Vulnerability:** Even if stored on the server, raw OAuth tokens in the database are a target.
**Learning:** Using the native Web Crypto API in Edge Functions allows for robust AES-256-GCM encryption without external dependencies. PBKDF2 with a high iteration count (e.g., 600k) should be used for key derivation from a master secret.
**Prevention:** Implement a standard encryption/decryption utility for all sensitive database columns (PII, tokens, secrets).

## 2026-03-05 - Preserving Refresh Tokens in OAuth Updates
**Vulnerability:** Offline access lost when re-authenticating.
**Learning:** Google (and others) often only send the `refresh_token` on the first consent. Subsequent exchanges for the same user/scope might omit it.
**Prevention:** When updating tokens in the database, fetch the existing record first and preserve the `refresh_token_encrypted` if the new response doesn't include one.
