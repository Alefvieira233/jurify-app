## 2026-05-25 - [Auditing] Secure vercel.json Scanning in Custom Audits
**Vulnerability:** Multi-block headers parsing gap in custom auditing scripts.
**Learning:** Checking only the first block `headers?.[0]?.headers` in `vercel.json` during custom script audits leads to false negatives/positives if the actual security headers are located in subsequent routing blocks (e.g., generic wildcard `/(.*)`).
**Prevention:** Always scan all header blocks using `.flatMap()` to aggregate and verify all headers comprehensively, avoiding routing-path-dependent gaps.

## 2026-05-25 - [Testing] Environment Fallback Collision with Dummy Strings
**Vulnerability:** Testing environment initialization failures due to invalid dummy URLs.
**Learning:** Providing truthy but invalid dummy string values (like `your_supabase_url`) in `.env` blocks standard `!import.meta.env.VITE_SUPABASE_URL` checks in the test setup file, preventing the fallback logic from setting correct, valid local test URLs.
**Prevention:** Avoid configuring raw dummy strings for sensitive URLs in `.env` placeholders, or write fallback checks in test setup files to explicitly inspect for and override non-URL/unconfigured default strings.
