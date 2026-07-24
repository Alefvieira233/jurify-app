# Sentinel's Security Journal 🛡️

This journal records codebase-specific critical security vulnerabilities, patterns, and learnings.

## 2026-05-25 - Implicit Trust on Administrative Edge Functions
**Vulnerability:** Edge Functions intended strictly for internal or administrative use (such as `google-calendar`, `analyze-whatsapp-sentiment`, and `transcribe-whatsapp-audio`) were deployed with administrative permissions but did not verify requests, leading to potential unauthorized access or privilege escalation.
**Learning:** Administrative methods and internal service functions do not inherit platform-level isolation and must be manually authenticated using standard auth patterns.
**Prevention:** Explicitly verify incoming headers using `isServiceRole(req)` or JWT tokens at the entry points of all administrative and service-role Edge Functions.
