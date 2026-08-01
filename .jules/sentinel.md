# Sentinel Security Journal

This journal records critical security learnings and vulnerability patterns specific to this codebase.

## 2026-05-25 - Incorrect Vercel Security Header Verification
**Vulnerability:** The custom security audit script (`scripts/security-audit.cjs`) used to verify security headers on Vercel had a logic flaw where it only checked the first block in the `headers` array (`vercelJson.headers?.[0]?.headers`). As a result, security headers configured in subsequent routing blocks (such as the standard fallback or root route `/(.*)`) were ignored, leading to false negatives and incorrect security reporting.
**Learning:** Checking hardcoded indices in multi-block routing configurations (like `vercel.json` or `netlify.toml`) assumes a single layout structure that is prone to break as soon as multiple sources or asset-specific headers are introduced.
**Prevention:** Always use flat mapping (e.g., `.flatMap()`) or complete list lookups when parsing configuration files containing multi-block header rules to ensure all matching patterns are processed.
