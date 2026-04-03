## 2025-05-15 - Insecure Google OAuth Token Management
**Vulnerability:** The Google Calendar integration had a broken OAuth flow (CRIT-03) and initially allowed potential exposure of `refresh_token` to the frontend.
**Learning:** OAuth `refresh_token`s should be strictly managed server-side and never returned to the client to prevent persistent session hijacking. When updating tokens, ensure existing `refresh_token`s are preserved if the OAuth provider doesn't return a new one on subsequent prompts.
**Prevention:** Centralize OAuth exchange/refresh logic in Edge Functions. Use `upsert` with care, preserving critical fields. Explicitly sanitize API responses to client-side code to omit sensitive server-only tokens.
