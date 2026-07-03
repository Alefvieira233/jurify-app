## 2026-05-25 - Hardening Edge Functions against Implicit Trust
**Vulnerability:** Edge Functions intended for internal service-to-service communication (using SERVICE_METHODS or fire-and-forget processing) lacked explicit `Authorization` header verification.
**Learning:** In Supabase, Edge Functions are publicly accessible via their URL. Developers often assume that because a function is called from another Edge Function or a database trigger, it is "internal" and doesn't need auth. However, an attacker can discover the URL and call it directly.
**Prevention:** Always verify the `Authorization` header using `isServiceRole(req)` for administrative or internal-only logic. Do not leak raw error messages in public-facing or administrative endpoints; return generic errors instead.
