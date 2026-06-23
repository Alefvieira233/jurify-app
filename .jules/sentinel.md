## 2026-05-25 - Explicit Service Role Verification for Administrative Methods
**Vulnerability:** Administrative methods (e.g., `createEventForResponsavel`) in the `google-calendar` Edge Function were relying on the platform's internal invocation path and did not explicitly verify the `service_role` key, making them potentially accessible to anyone who discovered the function URL.
**Learning:** Supabase Edge Functions do not automatically restrict access to the `service_role` key; any function can be called publicly unless explicitly protected. Administrative paths that bypass user authentication (JWT) must be manually hardened.
**Prevention:** Always use `isServiceRole(req)` from `_shared/supabase-client.ts` to protect internal-only or administrative methods in Edge Functions that do not use standard user auth.

## 2026-05-25 - TruffleHog CI Configuration Conflict
**Vulnerability:** Duplicate `--fail` flag in TruffleHog CI configuration caused the CLI to exit with an error, blocking security checks.
**Learning:** The `trufflesecurity/trufflehog` GitHub Action already includes `--fail` in its base command. Adding it to `extra_args` causes a "flag cannot be repeated" error.
**Prevention:** Avoid repeating flags that are already part of a GitHub Action's base command.

## 2026-05-25 - E2E Testing Robustness
**Vulnerability:** Playwright E2E "strict mode" violations due to ambiguous labels (e.g., multiple "Senha" inputs during registration) caused test instability.
**Learning:** Over-reliance on generic labels in complex forms (like auth with password/confirm password) leads to selection collisions.
**Prevention:** Use unique `data-testid` attributes for stable element selection in E2E tests, especially for similarly labeled inputs.
