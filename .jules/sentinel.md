# Sentinel's Journal - Critical Security Learnings

## 2026-03-04 - Cryptographically Secure Randomness for PII Masking
**Vulnerability:** Use of `Math.random()` in `SanitizerEngine.ts` to generate PII redaction tokens.
**Learning:** `Math.random()` is PRNG and not cryptographically secure, potentially allowing attackers to predict masking tokens and potentially reverse-engineer masked data if enough samples are collected or the seed is compromised.
**Prevention:** Always use `crypto.getRandomValues()` for security-sensitive identifiers, even for internal masking placeholders.

## 2026-03-04 - Destructive Lockfile Changes in Sandboxed Runners
**Vulnerability:** Accidental commitment of a pruned `package-lock.json`.
**Learning:** Running `npm install` in an environment where optional or platform-specific dependencies are missing can cause the package manager to remove those entries from the lockfile.
**Prevention:** Avoid committing `package-lock.json` unless intentional dependency changes were made. Use `git restore package-lock.json` after environment setup commands to maintain repository integrity.
