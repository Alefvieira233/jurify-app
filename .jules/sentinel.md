# Sentinel's Journal - Critical Security Learnings

## 2026-03-04 - Cryptographically Secure Randomness for PII Masking
**Vulnerability:** Use of `Math.random()` in `SanitizerEngine.ts` to generate PII redaction tokens.
**Learning:** `Math.random()` is PRNG and not cryptographically secure, potentially allowing attackers to predict masking tokens and potentially reverse-engineer masked data if enough samples are collected or the seed is compromised.
**Prevention:** Always use `crypto.getRandomValues()` for security-sensitive identifiers, even for internal masking placeholders.

## 2026-03-04 - TruffleHog CLI Argument Collision in GitHub Actions
**Vulnerability:** CI blockage due to redundant configuration.
**Learning:** The `trufflesecurity/trufflehog` GitHub Action automatically includes the `--fail` flag in its internal docker execution. Adding `--fail` to `extra_args` causes a CLI error ("flag 'fail' cannot be repeated") which stops the security scan from completing.
**Prevention:** Do not add `--fail` to `extra_args` in TruffleHog action configuration as it is already provided by the action runner.
