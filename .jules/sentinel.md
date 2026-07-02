## 2026-05-25 - [CRITICAL] Internal Edge Function Exposure
**Vulnerability:** Edge Functions intended for internal service-to-service calls (`analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio`, and `google-calendar` service methods) were publicly accessible without authentication.
**Learning:** Supabase Edge Functions do not inherit automatic isolation from public access just because they are intended for internal use. If they use `supabase-js` with the service role key internally but don't verify the caller's key, they become an open proxy for administrative actions.
**Prevention:** Always verify the `Authorization` header using the `isServiceRole(req)` utility at the entry point of any function that performs administrative tasks or consumes paid API credits (like OpenAI/Whisper).
