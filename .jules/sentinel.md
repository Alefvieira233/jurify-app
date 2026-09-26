# Sentinel Security Journal

## 2026-07-20 - Tar Dependency File Smuggling CVE & Security Audit Script False Positives
**Vulnerability:** Vulnerable `tar` versions `<=7.5.20` contained critical file smuggling and DoS flaws (GHSA-vmf3-w455-68vh), and `scripts/security-audit.cjs` evaluated only the first header array entry in `vercel.json` while failing static secret scans on test dummy tokens.
**Learning:** Overrides in package.json must be synced via `npm install` to update `package-lock.json`, and static auditing scripts must scan all route headers (`.flatMap()`) and ignore mock test environment setup files.
**Prevention:** Keep override versions updated to patch transitive vulnerabilities, update lockfiles in tandem, and exclude dedicated test setup modules (`/src/tests/setup.ts`) from static secret scanners.
