# Sentinel Security Journal 🛡️

## 2026-05-25 - [Audit Hardening] Security Audit false positive exclusions and full route headers scanning
**Vulnerability:** False negatives in Vercel.json route security headers check, and false positives in test-specific mock configurations (`setup.ts`).
**Learning:** Checking only the first route entry (`headers[0]`) in `vercel.json` misses headers defined in subsequent blocks (such as public assets vs root pages), while scanning test setup files for simulated JWTs/secrets causes false builds.
**Prevention:** Always parse all header blocks in configuration objects using flat-mapping arrays and explicitly exclude well-known mock files like `setup.ts` when running regex scans over production code paths.
