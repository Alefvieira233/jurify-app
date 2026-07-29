# Sentinel's Security Journal 🛡️

This journal records critical security learnings, vulnerability patterns, and architectural security insights specific to the Jurify project.

## 2026-07-29 - Hardening Security Audit Script & Resolving Static Analysis Gaps
**Vulnerability:** Static analysis scripts parsing configuration files (like `vercel.json`) only inspected the first block of headers, leading to false negatives where security headers defined in other blocks were entirely bypassed. Simultaneously, scanning all files for secrets without exceptions caused false positive flags on dummy JWTs in testing files like `src/tests/setup.ts`, disrupting CI pipelines.
**Learning:** Naive static analysis parsing or regex checks on complex nested JSON configs are fragile and can result in significant blind spots or false positives. This occurs because files are not treated as full structured representations, and test environments often require synthetic secrets for mock executions.
**Prevention:** Ensure static analysis scripts parse and inspect config trees comprehensively (e.g. using `.flatMap()` to search all header array objects rather than index `[0]`) and explicitly exclude well-known local test directories and test configuration paths (`setup.ts`) from strict secret scanners.
