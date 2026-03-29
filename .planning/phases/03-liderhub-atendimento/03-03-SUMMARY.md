---
phase: 03-liderhub-atendimento
plan: "03"
subsystem: pipeline/kanban
tags: [ui, design-tokens, polish, kanban]
dependency_graph:
  requires: [01-liderhub-visual-foundation]
  provides: [token-aligned-kanban]
  affects: [src/features/pipeline]
tech_stack:
  added: []
  patterns: [CSS custom properties, Tailwind arbitrary values]
key_files:
  created: []
  modified:
    - src/features/pipeline/KanbanColumn.tsx
    - src/features/pipeline/KanbanCard.tsx
decisions:
  - "KanbanColumn header now uses bg-card token (Phase 1 CSS var handles dark mode automatically)"
  - "Drop zone max-h uses --topbar-h CSS var with 280px fallback for future Phase 7 topbar control"
  - "KanbanCard hover shadow uses hsl(var(--accent)/0.15) for token-aware depth; ring-border/30 adds subtle border ring"
metrics:
  duration: "5 minutes"
  completed: "2026-03-29"
  tasks_completed: 2
  files_modified: 2
---

# Phase 03 Plan 03: KanbanCard + KanbanColumn Visual Polish Summary

Apply Phase 1 design token alignment to KanbanColumn (bg-white → bg-card) and KanbanCard (hover shadow using hsl(var(--accent)/0.15) token).

## What Was Built

Both Kanban components now use Phase 1 design tokens exclusively. KanbanColumn's header no longer has a manual `dark:bg-card` override — the `bg-card` token handles both light and dark modes via CSS custom properties. KanbanCard gains a token-aware hover shadow and a subtle border ring on hover.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Polish KanbanColumn — bg-card token, --topbar-h var | 35ec0c5 | src/features/pipeline/KanbanColumn.tsx |
| 2 | Polish KanbanCard — token-aware hover shadow and ring | 0f9181c | src/features/pipeline/KanbanCard.tsx |

## Key Changes

**KanbanColumn.tsx:**
- Header div: `bg-white dark:bg-card` → `bg-card`
- Drop zone: `max-h-[calc(100vh-280px)]` → `max-h-[calc(100vh-var(--topbar-h,280px))]`

**KanbanCard.tsx:**
- Root div: `hover:shadow-sm transition-shadow` → `hover:shadow-[0_2px_8px_hsl(var(--accent)/0.15)] hover:ring-1 hover:ring-border/30 transition-all`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- src/features/pipeline/KanbanColumn.tsx — FOUND
- src/features/pipeline/KanbanCard.tsx — FOUND
- Commit 35ec0c5 — FOUND
- Commit 0f9181c — FOUND
- bg-white removed from KanbanColumn — CONFIRMED (grep returns no match)
- bg-card present on header div — CONFIRMED
- TypeScript: 0 errors
