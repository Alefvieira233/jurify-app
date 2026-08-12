# Sentinel's Critical Security Journal

## 2026-05-25 - Security Verification Script Hardening
**Vulnerability:** Script-level false negatives (missing security header validation in vercel.json by only auditing the first block) and false positives (erroneously flagging dummy test JWTs in `setup.ts`).
**Learning:** Checking only the first block in vercel.json (`headers[0]`) ignores subsequent route rules, causing silent failures to check core security headers like CSP and X-Frame-Options on the root route. Scan logic that does not ignore test setups forces developers to disable security audits or live with false positive warning noises.
**Prevention:** Flatten all headers config elements with `.flatMap()` for exhaustive validation, and explicitly exclude test files like `setup.ts` to prevent false positive noise on dummy credentials.
