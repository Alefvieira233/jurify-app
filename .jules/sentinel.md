# SENTINEL'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-04-10 - [Prompt Injection & PII Redaction Hardening]
**Vulnerability:** Documented gaps in `sanitizeInput` allowed "ignore all previous prompts" variants and 1→i homoglyph substitutions. `redactPII` was missing CNPJ, OAB, and Processo CNJ patterns.
**Learning:** Security utilities in edge functions lacked parity with frontend sanitizers and failed to account for multi-word injection patterns or common character substitutions.
**Prevention:** Hardened regex patterns to allow up to 3 intermediate words in injection detection. Expanded homoglyph map and PII pattern list to cover regional (Brazilian) legal data requirements.

## 2026-05-07 - [TruffleHog CLI flag collision in GitHub Actions]
**Vulnerability:** Redundant CLI flags in CI workflows can cause complete bypass of security checks if the tool exits with an error before scanning.
**Learning:** The `trufflesecurity/trufflehog` GitHub Action automatically appends `--fail` to the `extra_args` in its internal logic. Manually including `--fail` in `extra_args` leads to `error: flag 'fail' cannot be repeated`, causing the job to fail.
**Prevention:** Never include `--fail` in `extra_args` when using the standard TruffleHog GitHub Action. Always verify tool logs for 'repeated flag' errors when modifying CI workflows.
