---
phase: 02-liderhub-dashboard-home
plan: 01
subsystem: ui
tags: [react, dashboard, stats, sparkline, homepage, hooks]

# Dependency graph
requires:
  - phase: 01-l-derhub-visual-foundation
    provides: StatCard component, LiderHub design tokens, shadcn/ui components
provides:
  - Enhanced StatCard with optional sparkline (sparkData/sparkColor/className props)
  - Redesigned HomePage with real data from useLeads, useTarefas, useAgendamentos
  - Unit tests for HomePage covering greeting, stat labels, quick actions, stat values
affects: [02-02-liderhub-dashboard-home, any page that imports StatCard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "StatCard with inline SVG sparkline via MiniSparkline helper"
    - "HomePage aggregating multiple hooks with Skeleton loading states"
    - "Time-of-day greeting computed from new Date().getHours()"

key-files:
  created:
    - src/features/home/__tests__/HomePage.test.tsx
  modified:
    - src/features/dashboard/components/StatCard.tsx
    - src/features/home/HomePage.tsx

key-decisions:
  - "MiniSparkline kept as internal helper in StatCard, Dashboard.tsx retains its own inline version (Phase 2 scope boundary)"
  - "Agendamentos future count uses 24h lookback window (today + future) to avoid missing today's items"

patterns-established:
  - "StatCard accepts optional sparkData array for inline SVG sparkline rendering"
  - "HomePage aggregates useLeads/useTarefas/useAgendamentos with unified isLoading flag"

requirements-completed: [FR-6, NFR-1, NFR-2]

# Metrics
duration: 5min
completed: 2026-03-29
---

# Phase 02 Plan 01: Dashboard Home Summary

**HomePage redesigned with live counts from 3 hooks via 4 StatCards, quick actions, PrazosUrgentesWidget, and StatCard extended with optional inline SVG sparkline support.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-29T17:48:00Z
- **Completed:** 2026-03-29T17:53:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Enhanced StatCard with `sparkData`, `sparkColor`, `className` optional props and internal MiniSparkline SVG helper — fully backward compatible
- Redesigned HomePage to display a time-of-day greeting with user first name, 4 StatCards with real data (leadsHoje, totalLeads, tarefasPendentes, agendamentosFuturos), 4 quick action buttons, and PrazosUrgentesWidget
- Added 5 unit tests for HomePage covering greeting, first name, all 4 stat labels, quick action buttons, and stat values — all passing

## Task Commits

1. **Task 1: Enhance StatCard with sparkline and color props** - `72f9d50` (feat)
2. **Task 2: Redesign HomePage with real data and StatCard** - `b32d37b` (feat)

## Files Created/Modified

- `src/features/dashboard/components/StatCard.tsx` — Added sparkData/sparkColor/className props, MiniSparkline internal helper renders inline SVG
- `src/features/home/HomePage.tsx` — Redesigned with 4 StatCards, time-of-day greeting, quick actions, PrazosUrgentesWidget
- `src/features/home/__tests__/HomePage.test.tsx` — New test file with 5 tests covering all plan acceptance criteria

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all StatCard values are wired to real hook data.

## Self-Check: PASSED

- `src/features/dashboard/components/StatCard.tsx` — exists
- `src/features/home/HomePage.tsx` — exists
- `src/features/home/__tests__/HomePage.test.tsx` — exists
- Commit `72f9d50` — feat(02-01): enhance StatCard with sparkline and color props
- Commit `b32d37b` — feat(02-01): redesign HomePage with real data from hooks and StatCard
- TypeScript: 0 errors
- Tests: 10/10 passing (5 HomePage + 5 Dashboard)
