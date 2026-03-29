---
phase: 05-kapso-backend-migration
plan: "02"
subsystem: whatsapp-testing-db
tags: [kapso, migration, testing, database, cleanup]
dependency_graph:
  requires: [05-01]
  provides: [clean-db-constraint, kapso-named-tests]
  affects: [whatsapp-webhook, conexoes_whatsapp]
tech_stack:
  added: []
  patterns: [supabase-migration-ddl, vitest-integration-tests]
key_files:
  created:
    - supabase/migrations/20260329000001_kapso_cleanup.sql
  modified:
    - src/tests/integration/whatsapp-webhook.test.ts
decisions:
  - Evolution references completely removed from integration test file
  - DB constraint finalized to only allow kapso/oficial/cloud_api
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_changed: 2
---

# Phase 05 Plan 02: Kapso Cleanup — Tests and DB Migration Summary

Renamed all Evolution API references to Kapso in the webhook integration tests and created the final DB migration to drop 'evolution' from the conexoes_whatsapp tipo constraint.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rename Evolution to Kapso in webhook integration tests | 8b28474 | src/tests/integration/whatsapp-webhook.test.ts |
| 2 | Create final DB migration to remove evolution from constraint | d707257 | supabase/migrations/20260329000001_kapso_cleanup.sql |

## Verification

- `grep -ci "evolution" src/tests/integration/whatsapp-webhook.test.ts` → 0
- `grep -c "MOCK_KAPSO_MESSAGE_UPSERT"` → 4
- `grep -c "isKapsoPayload"` → 8
- `grep -c "normalizeKapsoMessage"` → 11
- `grep -c "provider: 'kapso'"` → 3
- All 23 webhook integration tests pass
- Full test suite: 1201 passed, 2 skipped (exceeds 1009+ requirement)
- Migration constraint: `CHECK (tipo IN ('kapso', 'oficial', 'cloud_api'))` — no 'evolution'

## Deviations from Plan

### Auto-handled: Task 1 already completed in Plan 05-01

The test file was already updated during plan 05-01 execution (commit 9c1d7ff). The changes were present but not yet committed in this worktree. Task 1 was recognized as complete based on verified acceptance criteria, and the commit was created to formalize the task boundary. No re-work was needed.

## Known Stubs

None — all changes are complete and functional.

## Self-Check: PASSED

- src/tests/integration/whatsapp-webhook.test.ts: FOUND, 0 evolution references
- supabase/migrations/20260329000001_kapso_cleanup.sql: FOUND, constraint correct
- Commit 8b28474: FOUND
- Commit d707257: FOUND
