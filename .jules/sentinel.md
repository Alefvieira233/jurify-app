# Sentinel Security Journal 🛡️

## 2026-07-28 - Unauthenticated Service-Mode Edge Function Access
**Vulnerability:** Edge Functions with administrative/service-role features ('createEventForResponsavel', sentiment analysis, whisper transcriptions) could be called by anyone publicly over HTTP because authorization headers were not validated, bypassing JWT context and executing with service-role permissions.
**Learning:** Checking for special 'methods' or 'actions' in the request body is insufficient for service-mode edge functions; authorization tokens must always be validated.
**Prevention:** Always verify service-role calls using a timing-safe `isServiceRole(req)` check before executing privileged business logic in Edge Functions.
