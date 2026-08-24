# Sentinel's Security Journal

## 2026-08-24 - Upgraded tar package override to fix critical vulnerability
**Vulnerability:** Critical severity vulnerabilities in `tar` package (<=7.5.20, including PAX size override / file smuggling CVE-2026-vmf3-w455-68vh and DoS vectors).
**Learning:** Overrides in `package.json` must be periodically audited and updated to latest releases (`^7.5.22`) to prevent critical CVEs from passing npm audit checks undetected or staying pinned to vulnerable patch versions.
**Prevention:** Keep package overrides aligned with security updates and run `npm audit --audit-level=high` in CI pipelines.
