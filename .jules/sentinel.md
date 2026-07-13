## 2026-07-06 - [CRITICAL] Internal Edge Function Exposure
**Vulnerability:** Internal-only Edge Functions (`analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio`, and `google-calendar` service methods) were accessible via public HTTP calls without authentication, assuming platform isolation or "security by obscurity".
**Learning:** Supabase Edge Functions are public by default. Internal service-to-service calls must explicitly verify the `service_role` key using `isServiceRole(req)` to prevent unauthorized external triggers that consume AI credits or access sensitive data.
**Prevention:** Always implement `isServiceRole(req)` check at the entry point of any Edge Function that is not intended for end-user JWT authentication.
