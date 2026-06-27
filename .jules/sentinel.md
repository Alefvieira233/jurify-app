## 2026-05-15 - [Critical] Administrative Auth Bypass in Edge Functions
**Vulnerability:** Service-only methods in the `google-calendar` Edge Function were accessible to external unauthenticated callers because they relied on implicit platform security that wasn't enforced.
**Learning:** Never assume the environment or platform automatically secures internal routes. Always explicitly verify the `Authorization` header using `isServiceRole(req)` for administrative or cross-function calls.
**Prevention:** Standardize a "Security First" entry point for all Edge Functions that categorizes methods by required permission level and validates them before any business logic executes.

## 2026-05-15 - [Enhancement] Robust Security Header Auditing
**Vulnerability:** The `security-audit.cjs` script was producing false negatives (reporting missing headers) because it only checked the first block of `vercel.json`.
**Learning:** Security tooling must be as robust as the systems they monitor. Configuration files like `vercel.json` or `nginx.conf` often use multiple blocks, and tools must scan all of them to ensure compliance.
**Prevention:** When writing custom security scanners, always parse the full configuration structure and use Sets/Collections to aggregate findings across all relevant sections.
