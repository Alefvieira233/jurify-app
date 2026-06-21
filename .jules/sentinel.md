## 2025-05-15 - Missing Authentication on Internal Edge Functions
**Vulnerability:** Several internal-only Edge Functions (`google-calendar`, `analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio`) were exposed without explicit authorization checks, relying on the misconception that internal calls are implicitly secure.
**Learning:** In Supabase, function-to-function calls via `supabase.functions.invoke` are authenticated by the platform using the service role key, but the receiving function MUST still manually verify this key (e.g., via `isServiceRole(req)`) to prevent unauthorized public access via direct HTTP calls.
**Prevention:** Always apply `isServiceRole(req)` check to any Edge Function endpoint intended for administrative or internal service-to-service use.
