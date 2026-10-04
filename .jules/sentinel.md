# Sentinel's Security Journal

Critical learnings and security vulnerability entries for Jurify Legal SaaS.

## 2026-05-25 - Dependency Package Overrides for Tar Vulnerabilities
**Vulnerability:** CVE in `tar` package (`<=7.5.20`) allows PAX size override leading to potential file smuggling and DoS.
**Learning:** Secondary dependencies pulling outdated `tar` versions bypass standard root dependency constraints.
**Prevention:** Explicitly define package `overrides` in `package.json` for critical packages and match direct `devDependencies` versions when applicable.
