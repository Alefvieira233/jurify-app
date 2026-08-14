## 2026-05-25 - Critical Tar Override Vulnerability
**Vulnerability:** Critical vulnerabilities in `tar` package `<=7.5.20` (PAX numeric path type confusion, decompression DoS, PAX size override file smuggling).
**Learning:** The package override in `package.json` was pegged to `^7.5.13`, which failed security audits (`npm audit --audit-level=high`).
**Prevention:** Maintain dependency overrides at `^7.5.22` or higher to pass automated npm security audit checks.

## 2026-05-25 - TruffleHog GitHub Action --fail Flag Conflict
**Vulnerability:** Duplicate `--fail` flag when invoking TruffleHog GitHub Action (`trufflesecurity/trufflehog@v3.88.0`).
**Learning:** `trufflesecurity/trufflehog@v3.88.0` internally appends `--fail` to its execution command. Explicitly passing `--fail` in `extra_args` causes `trufflehog: error: flag 'fail' cannot be repeated`, resulting in CI job failure.
**Prevention:** Do not include `--fail` in `extra_args` for `trufflesecurity/trufflehog` actions as `--fail` is already enabled by default by the action wrapper.
