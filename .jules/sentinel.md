# Sentinel's Critical Security Journal

## 2026-05-25 - Implicit Trust Vulnerability in Internal Services
**Vulnerability:** Edge Functions designed strictly for backend-to-backend orchestration or serverless cron jobs lacked explicit caller verification on public HTTP requests, allowing public invocations to execute admin or execution routines.
**Learning:** Cloud-based edge platforms do not inherently isolate internally routed serverless function endpoints from direct public endpoints unless programmatic validation is strictly enforced at runtime.
**Prevention:** Always verify incoming authorization tokens in internal edge functions using a timing-safe, length-gated `isServiceRole(req)` utility.

## 2026-05-25 - Redact-After-Truncate Diagnostic PII Leak
**Vulnerability:** Applying character-based substring truncation to log strings prior to executing pattern-based PII redaction allowed split/truncated PII tokens to escape regex sanitization and leak into diagnostic tables or standard outputs.
**Learning:** String slicing can inadvertently split critical pattern markers (such as email domain names or phone digits), preventing full match detection.
**Prevention:** Perform pattern-based redaction on the raw full string first, and only truncate the finalized sanitized string afterward.

## 2026-07-28 - Local Security Audit Scanner False Positives
**Vulnerability:** The local security scanner parsed the `vercel.json` headers array using a fixed single index, causing header mismatches. It also scanned local `setup.ts` testing files, resulting in false positive flags for dummy JWT variables.
**Learning:** Static configuration audits must comprehensively traverse multiple matched route blocks, and mock data in dedicated test directories must be explicitly filtered out of production security assessments.
**Prevention:** Use robust array flat-mapping (`.flatMap()`) for security header routing scans and exclude test setup modules (`setup.ts`) from standard hardcoded secret checks.
