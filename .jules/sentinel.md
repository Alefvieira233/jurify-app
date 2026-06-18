## 2026-05-25 - Unauthorized Access to Edge Function Service Methods
**Vulnerability:** Service methods in `google-calendar` edge function (e.g., `createEventForResponsavel`) were accessible without explicit authorization check, relying solely on internal VPC-like assumptions.
**Learning:** Even if functions are intended for internal-only use, explicit authorization checks against the Service Role key are necessary to prevent lateral movement or unauthorized external calls if the endpoint is exposed.
**Prevention:** Always verify `Authorization` headers against `SUPABASE_SERVICE_ROLE_KEY` for any edge function method that bypasses standard user authentication.

## 2026-05-25 - Information Leakage in Error Responses
**Vulnerability:** The global `catch` block in edge functions was returning raw error messages to the client.
**Learning:** Raw error messages can leak internal implementation details, database schema information, or stack traces.
**Prevention:** Sanitize error responses by returning generic messages (e.g., "Internal server error") to the client while logging detailed errors to the server console.
