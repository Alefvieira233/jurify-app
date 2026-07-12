## 2026-07-28 - [Tabnabbing Protection & Security Audit Hardening]
**Vulnerability:** Reverse Tabnabbing (target="_blank" without rel="noopener noreferrer") and Security Audit tool limitation (checking only the first header block in vercel.json).
**Learning:** Modern SPAs often link to Terms and Privacy pages using `target="_blank"`. Forgetting the `rel` attribute allows the destination page to potentially hijack the opener tab. Additionally, simple regex-based security scripts can easily have false negatives if they don't account for the full structure of config files like `vercel.json`.
**Prevention:**
1. Always use `rel="noopener noreferrer"` with `target="_blank"`.
2. Use robust parsing (like `JSON.parse` and `flatMap`) in security audit scripts to ensure all configuration blocks are inspected.
3. Exclude known safe files (like test setups) from secret scanning to reduce noise and maintain trust in automated security tools.
