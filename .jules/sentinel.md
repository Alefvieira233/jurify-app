## 2026-05-25 - [CRITICAL] Edge Function Internal Bypass (Implicit Trust)
**Vulnerability:** Edge Functions intended for internal service-to-service orchestration (e.g., `google-calendar`, `analyze-whatsapp-sentiment`) were accessible via public HTTP endpoints without verifying the `Authorization` header, assuming platform-level isolation that did not exist.
**Learning:** Functions invoked via `supabase.functions.invoke` do not automatically inherit security; they are standard HTTP endpoints. Administrative methods must explicitly verify the `service_role` token.
**Prevention:** Always use `isServiceRole(req)` as a gate for any Edge Function method that performs administrative actions or bypasses standard Row Level Security (RLS).
