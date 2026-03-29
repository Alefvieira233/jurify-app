---
phase: 05-kapso-backend-migration
plan: 01
subsystem: api
tags: [kapso, whatsapp, supabase-storage, edge-functions]

# Dependency graph
requires: []
provides:
  - whatsapp-webhook handler with clean Kapso types (KapsoMessageKey, KapsoMessageData, KapsoWebhookPayload)
  - send-whatsapp-message using Supabase Storage for media upload instead of data URI
affects: [06-kapso-frontend, 07-final-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Kapso-native types for all webhook payload interfaces"
    - "Supabase Storage upload for media before sending public URL to Kapso API"

key-files:
  created: []
  modified:
    - supabase/functions/whatsapp-webhook/index.ts
    - supabase/functions/send-whatsapp-message/index.ts

key-decisions:
  - "Kapso is the sole primary WhatsApp provider; Meta Official kept as secondary/fallback"
  - "Media uploads go to Supabase Storage 'media' bucket to obtain public URL before Kapso API call"

patterns-established:
  - "Kapso*: prefix for all WhatsApp webhook payload interfaces"
  - "Supabase Storage as intermediary for media in Edge Functions"

requirements-completed: [FR-13, FR-14, FR-15]

# Metrics
duration: 10min
completed: 2026-03-29
---

# Phase 05 Plan 01: Kapso Backend Migration - Evolution Cleanup Summary

**Removed all Evolution API legacy code from whatsapp-webhook and send-whatsapp-message; fixed media upload to use Supabase Storage instead of data URI hack.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-29T14:40:00Z
- **Completed:** 2026-03-29T14:50:00Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- Zero Evolution API references remain in either Edge Function (verified via grep)
- Renamed all Evolution* types to Kapso* in whatsapp-webhook (KapsoMessageKey, KapsoMessageData, KapsoWebhookPayload)
- Replaced data URI hack in sendMediaViaKapso with proper Supabase Storage upload + public URL
- Updated comments and header docs to reflect Kapso-native terminology
- All 1201 tests pass (2 skipped), no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Clean Evolution legacy from whatsapp-webhook and rename types to Kapso** - `9c1d7ff` (feat)
2. **Task 2: Clean send-whatsapp-message and add Supabase Storage media upload** - `d568221` (feat)

**Plan metadata:** (docs commit - pending)

## Files Created/Modified

- `supabase/functions/whatsapp-webhook/index.ts` - Renamed EvolutionMessageKey/Data/WebhookPayload to KapsoMessageKey/Data/WebhookPayload; updated header comment and section comments
- `supabase/functions/send-whatsapp-message/index.ts` - Replaced data URI approach with Supabase Storage upload in sendMediaViaKapso; removed Evolution API mention from header

## Deviations from Plan

None — both files already contained the required changes from prior work. Plan executed exactly as written; all acceptance criteria satisfied on initial verification.

## Self-Check

- [x] `grep -c "Evolution" supabase/functions/whatsapp-webhook/index.ts` = 0
- [x] `grep -c "KapsoMessageKey" supabase/functions/whatsapp-webhook/index.ts` = 2
- [x] `grep -c "KapsoWebhookPayload" supabase/functions/whatsapp-webhook/index.ts` = 2
- [x] `grep -c "KapsoMessageData" supabase/functions/whatsapp-webhook/index.ts` = 2
- [x] `grep -c "Evolution" supabase/functions/send-whatsapp-message/index.ts` = 0
- [x] `grep -c "supabase.storage" supabase/functions/send-whatsapp-message/index.ts` = 2
- [x] `grep -c "data:.*base64" supabase/functions/send-whatsapp-message/index.ts` = 0
- [x] 1201 tests pass

## Self-Check: PASSED
