---
phase: 03-liderhub-atendimento
plan: "01"
subsystem: whatsapp-ui
tags: [whatsapp, filters, components, refactor]
dependency_graph:
  requires: []
  provides: [ConversationFilters component, functional filter state]
  affects: [src/features/whatsapp/WhatsAppIA.tsx]
tech_stack:
  added: []
  patterns: [controlled component, lifted state, shadcn Select]
key_files:
  created:
    - src/features/whatsapp/ConversationFilters.tsx
  modified:
    - src/features/whatsapp/WhatsAppIA.tsx
decisions:
  - Removed Responsavel select — no data source exists yet per plan spec
  - Status filter uses __all__ sentinel to map to empty string (Radix Select requires non-empty value)
  - Tab filter for 'ia' uses agent_status field (processing/waiting_human) matching plan spec
metrics:
  duration: 8min
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_changed: 2
---

# Phase 03 Plan 01: Conversation Filters Extraction Summary

**One-liner:** Extracted WhatsApp conversation filter bar into a controlled ConversationFilters component with functional tab+status filtering via agent_status and status fields.

## What Was Built

- `ConversationFilters.tsx`: New controlled component exporting `ConversationFilterState` interface and `ConversationFilters` component. Renders 4-tab Tabs bar (Todos/IA/Ativos/Pendentes with counts) and a shadcn Select for status filtering.
- `WhatsAppIA.tsx`: Replaced `activeFilter` state with `ConversationFilterState { tab, status }`. Rewrote `filteredConversations` useMemo with AND logic across tab filter, status filter, and search filter. Removed raw `<select>` elements and stale `Tabs` import. Updated `ConversationList` props.

## Filter Logic

| Tab | Condition |
|-----|-----------|
| todos | all pass |
| ia | agent_status === 'processing' OR 'waiting_human' |
| ativos | status === 'ativo' |
| pendentes | status === 'aguardando' |
| Status select | empty = no extra filter; otherwise conv.status must match |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all filters are wired to real conversation data.

## Self-Check: PASSED

- `src/features/whatsapp/ConversationFilters.tsx` exists and exports both `ConversationFilterState` and `ConversationFilters`
- `src/features/whatsapp/WhatsAppIA.tsx` imports and uses `ConversationFilters`
- `npx tsc --noEmit` returns 0 errors
- Commits afb045a and c1838de confirmed in git log
