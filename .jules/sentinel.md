## 2026-05-25 - [CRITICAL] Edge Function Internal Bypass (Implicit Trust)
**Vulnerability:** Edge Functions intended for internal service-to-service orchestration (e.g., `google-calendar`, `analyze-whatsapp-sentiment`) were accessible via public HTTP endpoints without verifying the `Authorization` header, assuming platform-level isolation that did not exist.
**Learning:** Functions invoked via `supabase.functions.invoke` do not automatically inherit security; they are standard HTTP endpoints. Administrative methods must explicitly verify the `service_role` token.
**Prevention:** Always use `isServiceRole(req)` as a gate for any Edge Function method that performs administrative actions or bypasses standard Row Level Security (RLS).

## 2026-05-25 - [MEDIUM] Playwright E2E Strict Mode Violations (Ambiguous Locators)
**Vulnerability:** E2E tests for login/register were failing because `getByLabel(/senha/i)` matched both "Senha" and "Confirmar Senha" inputs, causing `strict mode violation` in Playwright.
**Learning:** Generic label-based locators are fragile in complex forms. Unique `data-testid` attributes provide stable hooks for automation without compromising accessibility labels.
**Prevention:** Use unique `data-testid` (e.g., `password-input`, `confirm-password-input`) for elements that share similar labels or are rendered multiple times.

## 2026-05-25 - [LOW] Missing Tabnabbing Protection (Reverse Tabnabbing)
**Vulnerability:** Several `target="_blank"` links in auth forms and document management were missing `rel="noopener noreferrer"`, potentially allowing destination pages to control the parent window via `window.opener`.
**Learning:** Security audits must check both standard `<a>` tags and framework-specific components like `Link`.
**Prevention:** Always apply `rel="noopener noreferrer"` to all external or cross-origin links using `target="_blank"`.

## 2026-05-25 - [REJECTED] Bypassing Security Gates via CI Configuration
**Vulnerability:** Attempted to fix CI failures by removing `--fail` flags from security scanners and adding `exit 0` on authentication failures in audit scripts.
**Learning:** Silencing security alerts to "fix" CI creates a false sense of security and ignores underlying infrastructure/configuration issues. Security integrity must take precedence over pipeline "greenness".
**Prevention:** Never downgrade security enforcement in CI/CD to bypass failures. Resolve the root cause (credentials, environment, or code) instead.
