## 2026-05-25 - Critical CVE Resolution in Dependency Overrides
**Vulnerability:** The `tar` package version <=7.5.20 contained critical vulnerabilities (GHSA-vmf3-w455-68vh) allowing PAX size override file smuggling and process crash DoS.
**Learning:** Legacy dependency overrides in `package.json` had pinned `tar` to `^7.5.13`, preventing automated dependency resolution from upgrading to the secure release line.
**Prevention:** Always maintain dependency overrides in sync with latest security advisories and verify `npm audit --audit-level=high` regularly.
