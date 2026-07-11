# Sentinel's Security Journal 🛡️

## 2026-05-25 - [Implicit Trust in Edge Functions]
**Vulnerability:** Internal-only Edge Functions (`analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio`) were publicly accessible without authentication.
**Learning:** Functions intended for internal/background use (fire-and-forget) often lack authentication because they "trust" the internal network or the platform to isolate them. However, they are still reachable via public URLs.
**Prevention:** Always implement explicit `isServiceRole(req)` checks for internal-only endpoints in Supabase Edge Functions. Use timing-safe comparisons for tokens.
