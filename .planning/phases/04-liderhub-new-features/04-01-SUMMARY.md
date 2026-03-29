---
phase: 04-liderhub-new-features
plan: 01
subsystem: tarefas
tags: [tarefas, crud, edit-dialog, priority-filter, tests]
dependency_graph:
  requires: []
  provides: [EditTarefaDialog, TarefasPage-full-crud]
  affects: [src/features/tarefas]
tech_stack:
  added: []
  patterns: [react-hook-form + zodResolver, DropdownMenu actions column, vi.fn() mock pattern for hooks]
key_files:
  created:
    - src/features/tarefas/EditTarefaDialog.tsx
    - src/features/tarefas/__tests__/TarefasPage.test.tsx
  modified:
    - src/features/tarefas/TarefasPage.tsx
decisions:
  - setupMock helper removed; vi.fn() module-level mock used directly in tests to avoid top-level await in non-async functions
metrics:
  duration: ~10 minutes
  completed: "2026-03-29T21:59:47Z"
  tasks: 2
  files: 3
---

# Phase 04 Plan 01: Tarefas CRUD Enhancement Summary

**One-liner:** Full CRUD for Tarefas — EditTarefaDialog with zodResolver+useEffect reset, DropdownMenu actions (edit/delete) per row, priority filter select, and 5 passing unit tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add EditTarefaDialog and enhance TarefasPage | e05921c | EditTarefaDialog.tsx (new), TarefasPage.tsx (modified) |
| 2 | Add TarefasPage unit tests | 46bb78d | __tests__/TarefasPage.test.tsx (new) |

## What Was Built

### EditTarefaDialog.tsx
- Accepts `{ tarefa: Tarefa | null; open: boolean; onOpenChange: (open: boolean) => void }`
- Uses `useForm` with `zodResolver(tarefaSchema)` and `useEffect` to reset form when `tarefa` prop changes
- On submit: calls `updateTarefa.mutate({ id: tarefa.id, ...data })` then closes dialog
- Same field layout as NovaTarefaForm: titulo, descricao, prazo, pontos, responsavel, prioridade
- Imports `useTeamMembers` for responsavel dropdown
- Button text: "Salvar Alteracoes"

### TarefasPage.tsx enhancements
- Added `prioridadeFilter` state with `<select>` (Todas as prioridades / Baixa / Media / Alta / Urgente)
- Updated `filtered` useMemo to check both `statusFilter` and `prioridadeFilter`
- Added `editingTarefa` (Tarefa | null) and `editOpen` (boolean) state
- Added `<DropdownMenu>` in Actions column per row with Editar and Excluir options
- Delete calls `window.confirm('Excluir tarefa?')` before `deleteTarefa.mutate(tarefa.id)`
- Renders `<EditTarefaDialog tarefa={editingTarefa} open={editOpen} onOpenChange={setEditOpen} />`
- colSpan updated from 7 to 8 for new Actions column

### TarefasPage.test.tsx
- 5 test cases: loading skeleton, empty state, row rendering, search filter, priority filter select
- Mocks: useTarefas (vi.fn() module-level), useTeamMembers, usePageTitle, AuthContext
- All 5 tests pass

## Verification

- `npx tsc --noEmit`: PASSED (zero errors)
- `npm run lint`: PASSED (zero warnings)
- `npx vitest run src/features/tarefas/`: PASSED (5/5 tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test file syntax error with await in non-async function**
- **Found during:** Task 2 first test run
- **Issue:** `setupMock` helper used `await import()` in a non-async function, causing SWC syntax error
- **Fix:** Removed `setupMock` helper; used module-level `vi.fn()` mock directly in `beforeEach` and individual tests
- **Files modified:** `src/features/tarefas/__tests__/TarefasPage.test.tsx`
- **Commit:** 46bb78d

## Known Stubs

None — all data flows are wired to real hooks (useTarefas, useTeamMembers).

## Self-Check: PASSED
