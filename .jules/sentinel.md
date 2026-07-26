## 2026-07-20 - Custom Security Audit Hardening and Package Vulnerability Fix
**Vulnerability:** Weak script-based validation logic for security headers (which missed additional blocks) and a critical vulnerability in the dependency package `tar`.
**Learning:** Checking only the first block of headers `headers?.[0]` in a `vercel.json` structure causes false negatives if security headers are placed under later matching rules (e.g., `/(.*)`). Custom scanner scripts need to parse all header blocks in full.
**Prevention:** Use `.flatMap()` to aggregate headers across all configuration blocks within deployment descriptors, and routinely audit and upgrade overrides in `package.json` to preempt supply chain issues.
