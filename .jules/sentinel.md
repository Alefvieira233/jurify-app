# Sentinel's Security Journal 🛡️

This journal records critical security vulnerabilities, patterns, and architectural security learnings for the Jurify Legal SaaS Platform.

## 2026-05-25 - [Implicit Trust Risk in Internal Edge Functions]
**Vulnerability:** Service-role Edge Functions intended for internal administrative or orchestration access (such as `google-calendar`, `analyze-whatsapp-sentiment`, and `transcribe-whatsapp-audio`) were deployed with loose authentication, allowing unauthenticated public HTTP requests to trigger administrative routines.
**Learning:** Modern serverless architectures often assume platform-level isolation that does not exist on public endpoints. Developers must explicitly check request credentials regardless of internal invocation assumptions.
**Prevention:** Always verify the standard authorization headers inside internal service functions using `isServiceRole(req)` validation at their entrance.

## 2026-07-28 - [Local Test Environment URL Fallback Failures]
**Vulnerability:** Environment variable files (such as `.env`) holding default placeholder strings (e.g., `your_supabase_url`) cause URL parsing crashes (`TypeError: Invalid URL`) inside Vitest and Happy DOM test runs because they override mock-safe fallback values.
**Learning:** Testing harnesses inspect current process env vars which may have non-falsy placeholder values that are syntactically invalid, preventing the test setup fallback logic from injecting safe mock values.
**Prevention:** Hardened `.env` file verification ensures `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are left empty, prompting test files like `setup.ts` to fall back to safe local mock environments seamlessly.
