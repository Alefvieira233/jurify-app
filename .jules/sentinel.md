# Sentinel's Security Journal

Critical learnings and security vulnerability patterns for Jurify.

## 2026-09-17 - Fix Critical Supply Chain Vulnerabilities and Audit Script Header Resolution
**Vulnerability:** A critical vulnerability in the `tar` package (GHSA-vmf3-w455-68vh) allowed file smuggling and DoS vectors. Additionally, `scripts/security-audit.cjs` suffered from false negative security header checks by inspecting only the first block in `vercel.json`, and produced false positive secret warnings on `src/tests/setup.ts`.
**Learning:** Dependency overrides in `package.json` must be kept updated to patch deep transitive dependencies like `tar`. Custom security scripts must inspect all array blocks in configuration files (`flatMap`) and exclude test mocks.
**Prevention:** Keep `tar` overridden to `>=7.5.22` and ensure security audit scripts handle multi-block JSON array configurations.
