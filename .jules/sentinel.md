# Sentinel Security Journal

## 2026-05-25 - [Remediation of Critical Tar Vulnerability & Audit Header Flattening]
**Vulnerability:** Critical vulnerabilities in `tar` <= 7.5.20 allowed PAX size header smuggling and parser differential exploits (GHSA-vmf3-w455-68vh). Additionally, `scripts/security-audit.cjs` failed to inspect all header configuration blocks in `vercel.json` due to indexing only `headers[0]`.
**Learning:** `package.json` overrides require periodic patch updates to keep transitive security gates passing. Security audit scripts reading JSON configurations with multi-route header arrays must use `.flatMap()` to aggregate headers across all route definitions.
**Prevention:** Keep dependency overrides up to date (`tar >= 7.5.22`) and ensure custom audit scripts evaluate complete configuration blocks rather than single indices.
