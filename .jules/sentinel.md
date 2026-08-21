# Sentinel Security Journal - Critical Learnings Only

## 2026-08-21 - [TruffleHog GitHub Action Duplicate Flag]
**Vulnerability:** Duplicate CLI flags causing TruffleHog CI job failure.
**Learning:** The `trufflesecurity/trufflehog@v3.88.0` GitHub Action automatically includes `--fail` internally in its entrypoint execution script. Adding `--fail` explicitly to `extra_args` in `.github/workflows/pre-commit-check.yml` causes TruffleHog to crash with `flag 'fail' cannot be repeated`.
**Prevention:** Do not add `--fail` to `extra_args` when configuring the `trufflesecurity/trufflehog` GitHub Action.

## 2026-08-21 - [E2E Helper Secret Fallback]
**Vulnerability:** E2E test suite total failure when environment secrets `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` are missing.
**Learning:** Hard-failing in `e2e/helpers/auth.ts` when environment variables are omitted blocks all Playwright E2E tests in PR environments where secrets aren't exposed.
**Prevention:** Use standard dummy credential fallback expressions (`process.env.E2E_TEST_EMAIL || 'test@jurify.com'`) in helper routines.
