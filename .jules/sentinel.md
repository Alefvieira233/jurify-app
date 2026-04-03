## 2025-05-15 - Broken Google OAuth Flow & Potential Token Exposure
**Vulnerability:** Google Calendar OAuth flow was broken because the Edge Function was missing handlers for `exchange_code` and `refresh_token`. Additionally, the proposed fix initially exposed the `refresh_token` to the frontend.
**Learning:** Third-party OAuth flows should be centralized in server-side functions to keep `CLIENT_SECRET` hidden and to ensure that sensitive tokens like `refresh_token` are stored in a secure database rather than exposed to the client.
**Prevention:** Always verify that all actions sent by the frontend have corresponding handlers in the backend. When returning token objects to the client, explicitly omit sensitive fields like `refresh_token`.
