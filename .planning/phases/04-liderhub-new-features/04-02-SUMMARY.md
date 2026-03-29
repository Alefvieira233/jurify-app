---
phase: 04-liderhub-new-features
plan: 02
subsystem: suporte
tags: [suporte, tickets, dialog, rating, filter, tests]
dependency_graph:
  requires: []
  provides: [ticket-detail-dialog, ticket-status-update, ticket-rating, tipo-filter]
  affects: [src/features/suporte, src/hooks/useTicketsSuporte]
tech_stack:
  added: []
  patterns: [useMutation, Dialog, star-rating, table-row-click]
key_files:
  created:
    - src/features/suporte/TicketDetailDialog.tsx
    - src/features/suporte/__tests__/SuportePage.test.tsx
  modified:
    - src/hooks/useTicketsSuporte.ts
    - src/features/suporte/SuportePage.tsx
decisions:
  - "TicketDetailDialog calls useTicketsSuporte internally to get updateTicket — avoids prop-drilling mutation result"
  - "Rating buttons use native <button> not shadcn Button for minimal styling overhead on star icons"
  - "Status update buttons use variant=default for active state and variant=outline for inactive — clear visual differentiation"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-29T21:59:01Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 04 Plan 02: Suporte Ticket Detail + Rating Summary

**One-liner:** Full ticket lifecycle management via TicketDetailDialog with status update buttons, 5-star rating (on closed tickets), and tipo filter with clickable table rows.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add updateTicket mutation, TicketDetailDialog, enhance SuportePage | e125617 | useTicketsSuporte.ts, TicketDetailDialog.tsx, SuportePage.tsx |
| 2 | Add SuportePage unit tests | 9e0c645 | __tests__/SuportePage.test.tsx |

## What Was Built

### useTicketsSuporte.ts
Added `updateTicket` mutation accepting `{ id, status?, avaliacao? }`, calling Supabase `.update()` with `updated_at` timestamp, invalidating `['tickets-suporte']` query on success, toasting on error.

### TicketDetailDialog.tsx (new, 125 lines)
Dialog component showing ticket full content, tipo/status badges, formatted date. Three status update buttons (Aberto / Em Andamento / Fechado) with active state via `variant="default"`. Rating section (5 star buttons with filled/empty state) visible only when `status === 'fechado'`. Calls `updateTicket.mutate()` internally via `useTicketsSuporte()`.

### SuportePage.tsx
- Added `tipoFilter` state with `<select>` dropdown (Todos / Dúvida / Bug / Sugestão / Outro)
- Added `selectedTicket` and `detailOpen` state
- Table rows now have `cursor-pointer` and `onClick` handler
- Added Avaliação column showing star glyphs or dash
- Renders `<TicketDetailDialog>` at bottom

### SuportePage.test.tsx (new, 5 tests)
Covers: renders ticket list, empty state via search filter, tipo filter select exists, search text filtering, detail dialog opens on row click.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired to real Supabase mutations.

## Self-Check: PASSED
