---
phase: 07-liderhub-routes-final-integration
plan: "01"
subsystem: navigation
tags: [sidebar, nav, rbac, juridico, relatorios]
dependency_graph:
  requires: []
  provides: [sidebar-juridico-nav, sidebar-relatorios-nav, tarefas-leaf]
  affects: [src/components/Sidebar.tsx]
tech_stack:
  added: []
  patterns: [lucide-react icons, RBAC adminOnly+managerOk flags, MAIN_NAV section/leaf pattern]
key_files:
  created: []
  modified:
    - src/components/Sidebar.tsx
decisions:
  - "Tarefas leaf id changed from 'agendamentos' to 'tarefas' — routes to /tarefas per TarefasPage registration in App.tsx"
  - "honorarios child uses adminOnly: true + managerOk: true to mirror App.tsx requiredRoles: ['admin', 'manager']"
  - "Scale icon reused for Processos (already imported for logo); no alias needed"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-29T22:11:00Z"
  tasks_completed: 2
  files_modified: 1
---

# Phase 7 Plan 01: Sidebar Jurídico + Relatórios Nav Sections Summary

**One-liner:** Added Jurídico section (Processos, Prazos, Honorários, Documentos) and Relatórios section (Relatórios, Métricas) to MAIN_NAV, and fixed Tarefas leaf to route to /tarefas.

## What Was Built

Routes registered in App.tsx for Phase 2-4 features (processos, prazos, honorarios, documentos, tarefas, relatorios, metricas) were unreachable via the sidebar. This plan wired them all.

### Changes to src/components/Sidebar.tsx

1. **New imports:** `Briefcase, Calendar, FileText, BarChart2, Activity` added to lucide-react import block.

2. **Jurídico section** added after Automações:
   - Processos (Scale icon, all roles)
   - Prazos (Calendar icon, all roles)
   - Honorários (BarChart2 icon, adminOnly: true + managerOk: true)
   - Documentos (FileText icon, all roles)

3. **Relatórios section** added after Jurídico:
   - Relatórios (BarChart2 icon, all roles)
   - Métricas (Activity icon, all roles)

4. **Tarefas leaf** fixed: `id` changed from `'agendamentos'` to `'tarefas'` so `handleSectionChange('tarefas')` navigates to `/tarefas`.

### Final MAIN_NAV order

home → dashboard → conexoes → atendimento (section) → automacoes (section) → juridico (section) → relatorios-group (section) → tarefas (leaf) → configuracoes (leaf) → suporte (leaf)

## Verification Results

- `npx tsc --noEmit` — 0 errors
- `npm run lint` — 0 errors, 0 warnings
- `grep "id: 'juridico'"` — 1 match
- `grep "id: 'relatorios-group'"` — 1 match
- `grep "id: 'tarefas'"` — 1 match (leaf)
- `grep "id: 'agendamentos'"` — 0 matches
- `grep "adminOnly: true"` — 1 match (honorarios)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all nav items are wired to real routes registered in App.tsx.

## Commits

| Task | Description | Hash |
|------|-------------|------|
| 1 | Add Jurídico + Relatórios nav sections and fix Tarefas leaf | 9ebf627 |

## Self-Check: PASSED

- src/components/Sidebar.tsx — FOUND and modified
- Commit 9ebf627 — FOUND
