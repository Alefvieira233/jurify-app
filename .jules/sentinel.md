# 🛡️ Sentinel's Journal - Critical Security Learnings

This journal tracks critical security vulnerabilities, patterns, and architectural gaps discovered and resolved in the Jurify codebase.

## 2026-02-23 - PII Leakage in Internal Audit Logs
**Vulnerability:** Assistant queries and AI agent prompts/results were being stored in persistent database logs (`assistant_audit`, `agent_ai_logs`) without PII redaction, potentially exposing sensitive Brazilian legal data (CPF, OAB, etc.) to anyone with database access.
**Learning:** Security utilities like `redactPII` must be applied not just to client-facing responses, but also to internal persistent logs to ensure data minimization and LGPD compliance.
**Prevention:** Centralize all database logging through a wrapper that automatically applies redaction patterns before insertion.
