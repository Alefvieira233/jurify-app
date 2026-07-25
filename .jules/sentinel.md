# Sentinel's Security Journal

🛡️ Security-focused learnings and findings for Jurify.

## 2026-05-25 - [Implicit Trust Risk in Edge Functions]
**Vulnerability:** Edge Functions intended strictly for internal call chains were initially unprotected, relying on the platform's isolation.
**Learning:** All endpoints and Edge Functions, whether internal or public, must enforce explicit authentication or signature checks (e.g. `isServiceRole(req)`) rather than assuming perimeter security.
**Prevention:** Explicitly check the `Authorization` header for service role keys at the entry point of helper/internal Edge Functions.
