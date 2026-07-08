# Sentinel's Security Journal 🛡️

This journal records critical security learnings, vulnerability patterns, and reusable security patterns for the Jurify project.

## 2026-05-27 - [HIGH] Implicit Trust in Internal Edge Functions
**Vulnerability:** Edge Functions intended for internal use (`google-calendar` service methods, `analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio`) lacked explicit `Authorization` header verification, relying on implicit platform-level isolation.
**Learning:** In Supabase, Edge Functions are publicly accessible via URL unless explicitly protected in code. Functions called via `supabase.functions.invoke` with the service key still need to verify that key internally to be secure against direct external calls.
**Prevention:** Always use `isServiceRole(req)` at the entry point of internal-only functions or administrative methods. Use a global try-catch to mask raw errors and prevent internal detail leakage.
