# Sentinel Security Journal

This journal records codebase-specific critical security vulnerabilities, patterns, and learnings.

## 2026-08-11 - Custom Auditor Multi-Block Header Blind Spot
**Vulnerability:** A local security auditing script (`scripts/security-audit.cjs`) verified essential production security headers (e.g., `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, etc.) by inspecting only the first block/element (`vercelJson.headers[0]`) in `vercel.json`. Because assets caching header rules were defined first, the security headers defined under general routing (`/(.*)`) in the second block were missed, causing false positives/negatives in the verification pipelines.
**Learning:** Security auditor scripts must comprehensively inspect all nested configuration blocks. Rigidly referencing hardcoded array indices introduces blind spots when configuration layout evolves.
**Prevention:** Use array aggregation patterns (like `.flatMap()`) in auditing tools to flatten all defined blocks before matching patterns or checking for properties.
