# Sentinel Security Journal 🛡️

This journal records critical, project-specific security learnings.

## 2026-07-28 - Custom Security Audit Script Hardening
**Vulnerability:** False negatives in vercel.json security header parsing and false positives in test mock files (setup.ts) secret scanning.
**Learning:** Checking only the first block `headers?.[0]` in `vercel.json` is fragile as route blocks can define security headers in subsequent fallback rules (e.g., `/(.*)`). Test environment mock files containing dummy keys (e.g., `setup.ts`) can trigger false positives in secret detection scanners.
**Prevention:** Use `.flatMap()` to collect all header key definitions across all rule blocks in Vercel config. Filter out the specific test `setup.ts` file path from custom security scanning results to distinguish between actual production hardcoded secrets and mock test credentials.
