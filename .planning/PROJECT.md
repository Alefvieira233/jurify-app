# Jurify — GSD Project

> Auto-generated | 2026-03-29

## Overview
Legal SaaS platform (React 18 + TypeScript + Supabase + shadcn/ui) currently at ~95% functionality.
Two major initiatives completed in v1.0: UI/UX redesign and WhatsApp provider migration.

## Objectives
1. **LíderHub UI Redesign** — Transform the UI to match LíderHub platform aesthetic (white/blue, restructured nav, new features) -- COMPLETE
2. **Kapso WhatsApp Migration** — Replace Evolution API with Kapso (official Meta Cloud API proxy) across entire stack -- COMPLETE
3. **Tech Debt Remediation** — Harden security, reduce financial risk, improve code quality and UX consistency

## Current Milestone: v1.1 Tech Debt Remediation

**Goal:** Address critical findings from comprehensive codebase audit — security vulnerabilities, financial risk from unbounded AI costs, TypeScript type safety gaps, and UX inconsistencies.

**Target features:**
- Security hardening: close open redirect, add rate limiting to 8+ Edge Functions, sanitize inputs
- Financial controls: per-tenant AI spending caps with budget tracking
- Code quality: regenerate Supabase types (eliminate 92-file `as any`), migrate 14 hooks to React Query
- UX consistency: replace 17 native selects, fix 20+ h-screen layouts, standardize confirmations

**Source:** `.planning/codebase/` audit reports (QUALITY-AUDIT.md, UI-AUDIT.md, INTEGRATIONS-AUDIT.md, ARCHITECTURE-AUDIT.md)

## Constraints
- Zero backend logic changes in redesign (frontend + DB schema only)
- Kapso migration must maintain 100% message delivery continuity
- 1227 existing tests must keep passing
- RBAC and RLS must remain intact
- No breaking changes to deployed Edge Functions without migration plan

## Tech Stack
React 18.3.1 | TypeScript 5.5.3 (strict) | Vite 7.3.1 | Supabase | TanStack React Query 5 | shadcn/ui + Radix | Tailwind 3.4 | Vitest 4 | Playwright

## Key Decisions
- v1.0 phases 1-7: LíderHub redesign + Kapso migration (all complete)
- v1.1 phases 8-11: Tech debt remediation based on 4-dimension audit
- Priority order: Security > Financial Risk > Code Quality > UX

## References
- Design spec: `docs/superpowers/specs/2026-03-24-liderhub-redesign-design.md`
- LíderHub plan: `docs/superpowers/plans/2026-03-24-liderhub-redesign.md`
- Kapso plan: `docs/superpowers/plans/2026-03-25-kapso-migration-conexoes-redesign.md`
- Codebase map: `.planning/codebase/`
- Security audit: `security/2026-03-25-full-audit/SECURITY-AUDIT-REPORT.md`

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state
