# Sentinel Security Journal

## 2026-05-25 - Fix Critical CVE in node-tar and Harden Security Audit Script
**Vulnerability:** Vulnerable `tar` package version (<=7.5.20) allowed file smuggling and DoS (GHSA-vmf3-w455-68vh), and `scripts/security-audit.cjs` missed security headers due to only checking the first `vercel.json` header block.
**Learning:** `package.json` overrides must be updated to `^7.5.22` or higher to fix critical tar vulnerabilities, and audit scripts must aggregate all header blocks (`flatMap`) and filter out dummy test tokens to prevent false positives.
**Prevention:** Keep dependency overrides updated for nested dependencies and ensure security audit scripts inspect all environment and configuration blocks comprehensively.
