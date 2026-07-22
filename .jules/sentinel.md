## 2026-07-28 - Audit Verification Header Block Parsing Gap
**Vulnerability:** Security audit tool logic flaw (false negatives in security header auditing).
**Learning:** The custom security audit script (`scripts/security-audit.cjs`) parsed only the first header block defined in `vercel.json`. Because security headers were defined in a subsequent wildcard route match block (`/(.*)`), the verification script failed to see them, leading to false reporting or incorrect validation logic.
**Prevention:** Always use flatMap or search exhaustively across all blocks when programmatically auditing configuration structures (like `vercel.json` headers arrays) to ensure complete audit coverage.
