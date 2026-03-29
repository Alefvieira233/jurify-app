# Jurify — GSD Project

> Auto-generated | 2026-03-29

## Overview
Legal SaaS platform (React 18 + TypeScript + Supabase + shadcn/ui) currently at ~95% functionality.
Two major initiatives pending: UI/UX redesign and WhatsApp provider migration.

## Objectives
1. **LíderHub UI Redesign** — Transform the UI to match LíderHub platform aesthetic (white/blue, restructured nav, new features)
2. **Kapso WhatsApp Migration** — Replace Evolution API with Kapso (official Meta Cloud API proxy) across entire stack

## Constraints
- Zero backend logic changes in redesign (frontend + DB schema only)
- Kapso migration must maintain 100% message delivery continuity
- 1009+ existing tests must keep passing
- RBAC and RLS must remain intact
- No breaking changes to deployed Edge Functions without migration plan

## Tech Stack
React 18.3.1 | TypeScript 5.5.3 (strict) | Vite 7.3.1 | Supabase | TanStack React Query 5 | shadcn/ui + Radix | Tailwind 3.4 | Vitest 4 | Playwright

## References
- Design spec: `docs/superpowers/specs/2026-03-24-liderhub-redesign-design.md`
- LíderHub plan: `docs/superpowers/plans/2026-03-24-liderhub-redesign.md`
- Kapso plan: `docs/superpowers/plans/2026-03-25-kapso-migration-conexoes-redesign.md`
- Codebase map: `.planning/codebase/`
