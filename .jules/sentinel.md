# Sentinel's Critical Security Journal

## 2026-05-25 - Implicit Trust Vulnerability
**Vulnerability:** Edge Functions intended for internal use trusted incoming requests without verifying authorization headers.
**Learning:** Platform-level isolation does not prevent unauthorized invocation if functions are publicly routable.
**Prevention:** Always verify incoming authorization headers using `isServiceRole(req)`.
