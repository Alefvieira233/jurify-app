---
phase: 06-kapso-frontend-conexoes-redesign
plan: "01"
subsystem: whatsapp-frontend
tags: [kapso, frontend, conexoes, migration, cleanup]
dependency_graph:
  requires: [05-kapso-backend-migration]
  provides: [kapso-native-frontend]
  affects: [src/hooks/useConexoes.ts, src/features/whatsapp/WhatsAppKapsoSetup.tsx, src/features/conexoes/ConexoesManager.tsx, src/features/conexoes/ConnectionTypeChooser.tsx]
tech_stack:
  added: []
  patterns: [supabaseUntyped cast for new tables, STATUS_BADGE record pattern, TIPO_LABEL display map]
key_files:
  created: []
  modified:
    - src/hooks/useConexoes.ts
    - src/features/whatsapp/WhatsAppKapsoSetup.tsx
    - src/features/conexoes/ConexoesManager.tsx
    - src/features/conexoes/ConnectionTypeChooser.tsx
    - src/features/whatsapp/__tests__/WhatsAppKapsoSetup.test.tsx
decisions:
  - "WhatsAppKapsoSetup now reads conexoes_whatsapp with status values connected/disconnected (not ativa/inativa)"
  - "extractInstanceName helper removed; instance_name field read directly from conexoes_whatsapp"
  - "STATUS_BADGE column added to ConexoesManager table; uses same pattern as ConnectionDetailsDrawer"
  - "Kapso QR / Kapso Oficial branding applied in empty state cards and ConnectionTypeChooser"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 5
---

# Phase 06 Plan 01: Remove Legacy configuracoes_integracoes Fallback Summary

## One-Liner

Frontend fully Kapso-native: useConexoes and WhatsAppKapsoSetup query conexoes_whatsapp directly, with status badge column and Kapso branding in ConexoesManager.

## What Was Done

Completed the frontend migration to Kapso-only by removing all configuracoes_integracoes fallbacks from connection hooks and components, and polishing the ConexoesManager UI with consistent status display and Kapso branding.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove legacy configuracoes_integracoes fallback | 452f820 | useConexoes.ts, WhatsAppKapsoSetup.tsx |
| 2 | Status badge + Kapso branding in ConexoesManager | e8369e7 | ConexoesManager.tsx, ConnectionTypeChooser.tsx |
| 3 | Full test suite + build validation | 6f29d73 | WhatsAppKapsoSetup.test.tsx |

## Key Changes

### useConexoes.ts
- Removed the 30-line fallback block that caught errors from `conexoes_whatsapp` and fell back to querying `configuracoes_integracoes`
- Query now throws directly on error, consistent with all other hooks in the codebase
- No functional change for connected systems — the table exists and works

### WhatsAppKapsoSetup.tsx
- Mount `useEffect` now queries `conexoes_whatsapp` (with `tipo = 'kapso'`) instead of `configuracoes_integracoes`
- Added `supabaseUntyped` cast (same pattern as useConexoes.ts)
- Removed `extractInstanceName` helper — now reads `instance_name` field directly
- Status mapping updated to `connected`/`disconnected` values matching the new table schema

### ConexoesManager.tsx
- Added `STATUS_BADGE` and `TIPO_LABEL` constants (reusing pattern from ConnectionDetailsDrawer)
- Added STATUS column to connection table with colored Badge (connected=default, disconnected=destructive, error=destructive)
- Connection name row now shows tipo label + phone: e.g., "Kapso QR | +55 11 99999-0000"
- Empty state cards updated: "API Não Oficial" -> "Kapso QR", "API Oficial" -> "Kapso Oficial"

### ConnectionTypeChooser.tsx
- Labels updated: "API Não Oficial" -> "Kapso QR", "API Oficial (Cloud API)" -> "Kapso Oficial (Cloud API)"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WhatsAppKapsoSetup test mock chain insufficient for two .eq() calls**
- **Found during:** Task 3 (test suite run)
- **Issue:** The `supabase.from().select().eq().maybeSingle()` mock didn't support two chained `.eq()` calls needed by the new `conexoes_whatsapp` query. Also, mock data used old `configuracoes_integracoes` field names (status: 'ativa', observacoes).
- **Fix:** Refactored mock to use a recursive `makeEqChain()` function that returns `.eq()` and `.maybeSingle()` at any level. Updated test data to use `status: 'connected'` and `instance_name: 'jurify_abc'`.
- **Files modified:** `src/features/whatsapp/__tests__/WhatsAppKapsoSetup.test.tsx`
- **Commit:** 6f29d73

## Verification Results

- `grep -ri "configuracoes_integracoes" src/hooks/useConexoes.ts` — 0 matches
- `grep -ri "configuracoes_integracoes" src/features/whatsapp/WhatsAppKapsoSetup.tsx` — 0 matches
- `grep -ri "evolution" src/` — 0 matches
- `npm test -- --run` — 1202 passed, 2 skipped, 0 failed
- `npm run lint` — exit code 0, 0 warnings
- `npm run build` — success (16.93s)

## Known Stubs

None — all data is wired to real `conexoes_whatsapp` queries.

## Self-Check: PASSED

- All 5 key files exist on disk
- All 3 task commits verified in git log (452f820, e8369e7, 6f29d73)
