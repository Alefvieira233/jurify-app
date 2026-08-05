# Sentinel's Security Journal 🛡️

This journal records critical security vulnerabilities, patterns, and architectural insights discovered in this codebase.

## 2026-07-20 - Rigid Prompt Injection Scanner Bypass and False Positive Audit Blocking
**Vulnerability:**
1. Prompt injection pattern detection in `_shared/security.ts` used a rigid pattern (`/ignore\s+(previous|all|above)\s+(instructions?|prompts?|rules?)/i`) which could be bypassed with simple variations like `"ignore these instructions"` or `"ignore all previous prompts"`. Additionally, homoglyph detection did not check the `"1"` character for `"i"` replacements.
2. The custom `security-audit.cjs` script suffered from false positive hardcoded secret flags in `src/tests/setup.ts` because it did not exclude setup test files. It also failed to read security headers from second or lower blocks in `vercel.json` due to rigid indexing (`vercelJson.headers?.[0]`), leading to false negatives where security headers actually existed but weren't scanned.

**Learning:**
Regex-based string scanners must account for flexible intermediate words using non-greedy wildcards (e.g., `(?:.*?\s+)?`) rather than exact lists, as malicious inputs naturally seek to evade strict keyword boundaries. Obfuscated characters like `"1"` must be mapped to `"i"` to defend against leetspeak transformations.
For security-audit scripts, relying on array-index-0 hardcoding for JSON files like `vercel.json` breaks when additional blocks are defined. Dummy JWT tokens used to bootstrap test environments must be ignored in production secret scanners.

**Prevention:**
1. Always use non-greedy flexible matching `(?:.*?\s+)?` for multi-token prompt injection checks in LLM gateway interfaces.
2. Maintain comprehensive mapping of homoglyphs (`1` to `i`, `0` to `o`, etc.) in the sanitizer engine.
3. Harden audit-tooling configuration scans by using robust array-traversal functions (like `.flatMap()`) instead of numeric indexing, and explicitly maintain a directory filter/exclude-list to avoid false positives on mock assets and test setup definitions.
