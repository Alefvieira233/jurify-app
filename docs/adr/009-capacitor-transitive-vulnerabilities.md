# ADR 009 — Capacitor Transitive Vulnerabilities

## Status
Accepted — 2026-04

## Context
`npm audit` reports approximately 12 vulnerabilities, all originating from transitive dependencies within `@capacitor/*` packages. These are not direct dependencies we control; they live deep in Capacitor's dependency tree.

Capacitor is used for native mobile shell support (safe area insets, push notifications). The vulnerabilities are in packages like `follow-redirects`, `cross-spawn`, and similar transitive deps that Capacitor pulls in.

## Decision
**Accept the risk and do not override or patch these dependencies.**

Rationale:
1. **Transitive only** — None of our code directly imports the vulnerable packages.
2. **Not user-reachable** — These packages are used at build time or in Capacitor's native bridge, not in browser-executed code.
3. **No upstream fix available** — The fix must come from Capacitor updating their own dependencies. Overriding with `npm overrides` risks breaking Capacitor's native builds.
4. **Monitoring** — We will re-evaluate when Capacitor releases a major update.

## Consequences
- `npm audit` will continue to show these warnings — this is expected.
- CI pipeline uses `--audit-level=high` with known exceptions.
- When Capacitor publishes an update that resolves these, we should upgrade promptly.
- If any vulnerability is reclassified as critical with a user-reachable attack vector, we must reassess immediately.
