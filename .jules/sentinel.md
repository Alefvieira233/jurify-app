## 2025-05-22 - Google Calendar OAuth "Signing Oracle" Risk
**Vulnerability:** The initial implementation of the `refresh_token` handler in the `google-calendar` Edge Function accepted a `refresh_token` directly from the request body.
**Learning:** This created a "signing oracle" where any authenticated user could use the server's `GOOGLE_CLIENT_SECRET` to refresh *any* valid Google refresh token (even one they shouldn't have access to, if issued for the same Client ID), potentially bypassing internal ownership checks.
**Prevention:** Always retrieve security-critical tokens (like `refresh_token`) from the database using the authenticated user's ID (`user.id`) instead of trusting token strings provided in the client request.
