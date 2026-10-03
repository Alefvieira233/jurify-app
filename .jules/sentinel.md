## 2026-10-03 - TruffleHog Action Custom CLI Arguments
**Vulnerability:** TruffleHog GitHub Action failing in CI with `trufflehog: error: flag 'fail' cannot be repeated`.
**Learning:** `trufflesecurity/trufflehog` Action v3+ appends `--fail` automatically by default in its entrypoint docker execution string; adding `--fail` in `extra_args` causes a CLI parsing error.
**Prevention:** In `.github/workflows/pre-commit-check.yml` (and any GitHub Actions workflows utilizing `trufflesecurity/trufflehog`), omit `--fail` from `extra_args`.
