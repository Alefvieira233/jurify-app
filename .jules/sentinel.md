# Sentinel Security Journal 🛡️

## 2026-05-25 - [Implicit Trust of Internal Edge Functions]
**Vulnerability:** Edge Functions intended for internal use (e.g. `analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio`, and administrative actions of `google-calendar`) were exposed to the public internet because they assumed platform-level isolation and did not verify the `Authorization` header.
**Learning:** In Supabase, all Edge Functions are public HTTP endpoints. Internal service-to-service communication must always explicitly verify that the caller possesses the `service_role` key via `isServiceRole(req)`.
**Prevention:** Always include `isServiceRole(req)` checks for internal admin and worker tasks. Add custom security audits to check and enforce this during pre-commit.
