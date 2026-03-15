# SENTINEL'S JOURNAL - CRITICAL SECURITY LEARNINGS

## 2025-03-15 - Broken Google OAuth Flow and Sensitive Token Exposure
**Vulnerability:** The Google Calendar Edge Function was missing the implementation to exchange authorization codes for tokens and to refresh them. Furthermore, returning the `refresh_token` to the client (browser) increases the risk of long-term account takeover if stolen via XSS.
**Learning:** Functional gaps in authentication flows can lead to users or developers implementing insecure workarounds. Centralizing OAuth logic in Edge Functions allows for keeping sensitive secrets and long-lived tokens (`refresh_token`) on the server.
**Prevention:** Always implement OAuth exchanges and refreshes server-side. Ensure that the client only receives short-lived access tokens. Use Supabase Secrets for `GOOGLE_CLIENT_SECRET`.
