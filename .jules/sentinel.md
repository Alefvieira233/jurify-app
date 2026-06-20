## 2025-05-25 - Authentication Bypass in Service Methods
**Vulnerability:** Administrative methods (`SERVICE_METHODS`) in the `google-calendar` Edge Function were accessible publicly without authentication, despite using the service role key internally.
**Learning:** Functions invoked via `supabase.functions.invoke` do not automatically inherit or verify the caller's identity for internal methods unless explicitly implemented. Relying on platform-level "contracts" without a timing-safe `isServiceRole` check creates a significant security gap.
**Prevention:** Explicitly verify the service-role token using `isServiceRole(req)` in all Edge Functions that expose administrative or cross-tenant methods.
