# Sentinel Security Journal

Critical learnings and patterns discovered during security audits.

## 2026-08-26 - Vercel.json Header Inspection and Audit Filtering

**Vulnerability:**
`scripts/security-audit.cjs` previously inspected only `vercelJson.headers[0]`, causing false negative passes/failures when security headers were defined in subsequent header blocks (e.g. `/(.*)` catch-all route).

**Learning:**
Security configuration inspection scripts must flatten all header configuration arrays via `.flatMap()` rather than assuming a single top-level header object.

**Prevention:**
Always map over all header blocks when validating Vercel header security policies in audit scripts.
