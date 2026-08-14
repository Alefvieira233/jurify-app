## 2026-05-25 - Critical Tar Override Vulnerability
**Vulnerability:** Critical vulnerabilities in `tar` package `<=7.5.20` (PAX numeric path type confusion, decompression DoS, PAX size override file smuggling).
**Learning:** The package override in `package.json` was pegged to `^7.5.13`, which failed security audits (`npm audit --audit-level=high`).
**Prevention:** Maintain dependency overrides at `^7.5.22` or higher to pass automated npm security audit checks.
