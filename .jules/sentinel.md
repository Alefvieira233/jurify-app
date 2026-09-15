# Sentinel Security Journal

## 2026-09-15 - Security Audit Header Scanning & Critical Package Override
**Vulnerability:** Critical PAX header file smuggling in `tar` <=7.5.20 and false negative in `scripts/security-audit.cjs` header scanning logic.
**Learning:** Checking only the first block of array-based headers in deployment configs (`vercel.json`) allows missing global security headers, while failing to exclude test setup files causes false secret detection.
**Prevention:** Always use `.flatMap()` when validating nested configuration array blocks in security scripts, explicitly exclude known test mock files from static secret scanning, and ensure package overrides enforce patched dependency versions for critical CVEs.
