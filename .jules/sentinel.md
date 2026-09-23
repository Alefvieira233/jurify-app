## 2026-09-23 - TruffleHog Duplicate --fail Flag CI Failure
**Vulnerability:** Pre-commit security pipeline fails during TruffleHog execution with `error: flag 'fail' cannot be repeated`.
**Learning:** The official `trufflesecurity/trufflehog@v3.88.0` GitHub Action includes `--fail` in its internal `docker run` command template by default. Adding `--fail` to `extra_args` in workflow files causes a duplicate flag argument error that breaks the CI pipeline.
**Prevention:** Omit `--fail` from `extra_args` when configuring `trufflesecurity/trufflehog` in GitHub Actions workflows; secret detection failure behavior remains fully enabled via the action's default template.
