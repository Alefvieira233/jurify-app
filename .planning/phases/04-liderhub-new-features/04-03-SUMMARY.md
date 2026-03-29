---
phase: 04-liderhub-new-features
plan: "03"
subsystem: settings/status-manager
tags: [crud, pipeline, settings, react-query, zod]
dependency_graph:
  requires: []
  provides: [useStatusManager, StatusFormDialog, StatusManager-DB-backed]
  affects: [src/features/settings/sections/StatusManager.tsx, crm_pipeline_stages]
tech_stack:
  added: []
  patterns: [tanstack-react-query mutations, zod-form-validation, shadcn-dialog]
key_files:
  created:
    - src/hooks/useStatusManager.ts
    - src/features/settings/sections/StatusFormDialog.tsx
    - src/features/settings/sections/__tests__/StatusManager.test.tsx
  modified:
    - src/features/settings/sections/StatusManager.tsx
decisions:
  - "Used two separate queries (stages + lead counts) to keep React Query cache granular"
  - "Lead count query depends on stages being non-empty to avoid redundant DB round-trips"
  - "mutateAsync used in dialog onSubmit so dialog closes only after server confirms success"
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-29T21:59:43Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 04 Plan 03: StatusManager DB-Backed CRUD Summary

DB-backed pipeline stage CRUD replacing hardcoded array: useStatusManager hook with React Query mutations, StatusFormDialog with Zod validation, full create/edit/delete/reorder support.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create useStatusManager hook | 4528273 | src/hooks/useStatusManager.ts |
| 2 | StatusFormDialog + StatusManager rewrite + tests | ee03b4f | StatusFormDialog.tsx, StatusManager.tsx, __tests__/StatusManager.test.tsx |

## What Was Built

### useStatusManager.ts
- React Query-based hook querying `crm_pipeline_stages` with tenant isolation
- `createStage` mutation: auto-generates slug, sets position to max+1
- `updateStage` mutation: re-generates slug when name changes
- `deleteStage` mutation: removes by id with tenant guard
- `reorderStages` mutation: batch position updates via Promise.all
- Separate `leadCounts` query returning `Map<stageId, count>` from bulk leads query (no N+1)
- Toast notifications on success/error for all mutations

### StatusFormDialog.tsx
- Create/edit dialog with Zod schema validation
- Fields: name (required, max 50), color (type=color), is_won/is_lost checkboxes (mutually exclusive), auto_followup_days (optional number)
- Uses `mutateAsync` so dialog closes only on server success

### StatusManager.tsx (rewritten)
- Hardcoded STATUSES array removed entirely
- Uses `useStatusManager` hook for DB-backed data
- Skeleton loading state (4 rows) while fetching
- Empty state messages (no results vs no stages)
- Each row: color badge, slug, type (Ganho/Perdido/-), lead count, follow-up days
- DropdownMenu per row: Editar (opens form in edit mode), Excluir (window.confirm then deleteStage)
- Search filter on stage name

### Tests
- 3 unit tests: renders list, empty state, search filter
- All 3 pass with mock hook via vi.mock

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed @typescript-eslint/no-misused-promises lint error in StatusFormDialog**
- **Found during:** Task 2 lint check
- **Issue:** `handleSubmit(onSubmit)` returns a Promise passed directly to `onSubmit` attribute (void expected)
- **Fix:** Wrapped with `void handleSubmit(onSubmit)(e)` inside an inline arrow function
- **Files modified:** src/features/settings/sections/StatusFormDialog.tsx
- **Commit:** ee03b4f

## Known Stubs

None — all CRUD operations wire directly to Supabase `crm_pipeline_stages` table. Lead counts fetch from live `leads` table.

## Self-Check: PASSED
