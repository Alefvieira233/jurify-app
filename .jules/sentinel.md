# Sentinel Security Journal

## 2026-05-25 - Upgraded `tar` dependency override to fix critical CVEs
**Vulnerability:** `node-tar` versions `<=7.5.20` contained critical PAX header interpretation differential (file smuggling) and process crash DoS vulnerabilities (GHSA-vmf3-w455-68vh, GHSA-w8wr-v893-vjvp).
**Learning:** Permissive dependency override version bounds (e.g., `^7.5.13`) allowed vulnerable `7.5.13` through `7.5.20` releases to satisfy lockfile resolution, leaving critical CVEs active in dependency trees.
**Prevention:** Pin or set lower bounds on package overrides to non-vulnerable versions (e.g., `^7.5.22`) and enforce `npm audit --audit-level=high` in security test pipelines.
