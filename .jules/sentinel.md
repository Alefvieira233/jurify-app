# Sentinel Security Journal

Critical security learnings and codebase-specific vulnerability patterns for Jurify.

## 2026-05-25 - Dependency Security Audit Gate
**Vulnerability:** `tar` package version `<=7.5.20` had critical CVEs involving PAX size overrides and parser differentials leading to file smuggling / process crash.
**Learning:** Overrides in `package.json` must be maintained at `>=7.5.22` to avoid breaking `npm audit --audit-level=high` checks during CI security gates.
**Prevention:** Regularly run `npm run test:security` and keep override specs in `package.json` synchronized with upstream security releases.
