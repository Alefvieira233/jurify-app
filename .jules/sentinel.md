# Sentinel Security Journal

## 2026-09-14 - Dependency Override Vulnerabilities & Audit False Negatives
**Vulnerability:** Dependency overrides in `package.json` pinned `tar` to `^7.5.13` (vulnerable to PAX size override file smuggling and DoS, CVEs <= 7.5.20). Additionally, `scripts/security-audit.cjs` evaluated only the first header configuration block (`vercelJson.headers[0]`), incorrectly marking security headers missing while flagging test setup mocks.
**Learning:** Package overrides can stall security patches if not updated to non-vulnerable versions. Security audit tools must parse all array entries (`.flatMap()`) to avoid false negative reports.
**Prevention:** Update package overrides to secure releases (`tar@^7.5.22`) and ensure security verification scripts evaluate all route header blocks in `vercel.json` while excluding test mock paths.
