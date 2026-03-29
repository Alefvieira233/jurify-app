# Jurify — Roadmap

> Auto-generated | 2026-03-29

---

## Milestone v1.0: LíderHub Redesign + Kapso Migration (COMPLETE)

<details>
<summary>Phases 1-7 (all complete)</summary>

### Phase 1: LíderHub Visual Foundation -- COMPLETE
### Phase 2: LíderHub Dashboard + Home -- COMPLETE
### Phase 3: LíderHub Atendimento -- COMPLETE
### Phase 4: LíderHub New Features -- COMPLETE
### Phase 5: Kapso Backend Migration -- COMPLETE
### Phase 6: Kapso Frontend + Conexoes Redesign -- COMPLETE
### Phase 7: LíderHub Routes + Final Integration -- COMPLETE

</details>

---

## Milestone v1.1: Tech Debt Remediation

Source: `.planning/codebase/` audit reports (Quality, UI, Integrations, Architecture)

## Phase 8: Security Hardening
**Status:** Planned
**Goal:** Close all critical and high-severity security findings from the integrations and architecture audits
**Scope:** Open redirect fix, input sanitization, rate limiting for 8+ Edge Functions, RBAC route restrictions, email template fix, admin-gate debug component
**Files:** 12+ Edge Functions, App.tsx, SistemaSection.tsx, send-email
**Depends on:** Nothing
**Requirements:** [SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11]
**Plans:** 3 plans

Plans:
- [ ] 08-01-PLAN.md — Input sanitization: open redirect, prompt injection, LIKE escaping, email XSS, charge-refunded template
- [ ] 08-02-PLAN.md — Rate limiting for 8 unprotected Edge Functions
- [ ] 08-03-PLAN.md — RBAC route restrictions + admin-gate TesteRealAgenteIA

**Success Criteria:**
1. `create-portal-session` rejects return URLs not matching allowed origins
2. `chat-completion` applies `sanitizeInput()` to all user messages
3. All `ilike()` calls in `assistant` and `kapso-manager` use `escapeLike()`
4. `send-email` HTML-escapes template data; `charge-refunded` template exists
5. 8+ previously unprotected Edge Functions have rate limiting
6. `/conexoes`, `/fluxos`, `/regras`, `/agentes`, `/base-conhecimento`, `/departamentos` have RBAC restrictions
7. `TesteRealAgenteIA` only accessible to admin role
8. All 1227+ tests still pass, 0 TS errors

## Phase 9: Financial Controls (AI Spending Caps)
**Status:** Blocked by Phase 8
**Goal:** Prevent unbounded OpenAI costs by adding per-tenant daily AI budget tracking and enforcement
**Scope:** New DB table for token tracking, budget check in AI Edge Functions, admin usage dashboard, alert system
**Files:** New migration, assistant, chat-completion, whatsapp-webhook, ai-agent-processor, new admin component
**Depends on:** Phase 8 (rate limiting patterns established)
**Requirements:** [FIN-01, FIN-02, FIN-03, FIN-04]

**Success Criteria:**
1. `ai_usage` table tracks tokens per tenant per day
2. AI Edge Functions reject requests when daily budget exceeded (with friendly error)
3. Admin can view per-tenant AI usage in settings
4. Notification fires when tenant reaches 80% of daily budget
5. All existing tests pass

## Phase 10: Code Quality
**Status:** Ready to plan (independent of Phase 8-9)
**Goal:** Eliminate type safety gaps, remove dead code, standardize data fetching patterns
**Scope:** Regenerate Supabase types, remove `as any` casts, migrate 14 hooks to React Query, clean dead code, fix error handling
**Files:** types.ts, 12 hooks with local casts, 14 hooks to migrate, package.json, utils/logger.ts, utils/monitoring.ts
**Depends on:** Nothing (can run in parallel with Phase 9)
**Requirements:** [QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, QUAL-08, QUAL-09]

**Success Criteria:**
1. `supabase gen types typescript` regenerates types.ts with all current tables
2. Zero `supabase as any` casts remain in the codebase
3. `src/utils/logger.ts` and `src/utils/monitoring.ts` deleted/consolidated
4. `rrule` removed from package.json
5. All 14 hooks use `useQuery`/`useMutation` instead of manual state
6. Edge Function error returns are surfaced via toast in all callsites
7. All tests pass, 0 TS errors

## Phase 11: UX Consistency
**Status:** Ready to plan (independent of Phase 8-9)
**Goal:** Fix all cross-cutting UI inconsistencies found in the UI audit
**Scope:** Replace native selects with shadcn, fix h-screen layouts, replace window.confirm with ConfirmDialog, fix touch accessibility, remove inline fonts
**Files:** 17+ files with native select, 20+ files with h-screen, 3 files with window.confirm, FluxosManager, RegrasManager, ContratosManager, FlowEditor, BaseConhecimento, EnhancedAIChat
**Depends on:** Nothing (can run in parallel with Phase 9-10)
**Requirements:** [UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09, UX-10]

**Success Criteria:**
1. Zero native `<select>` elements in feature code (all use shadcn `<Select>`)
2. Zero `window.confirm()` calls (all use `<ConfirmDialog>`)
3. Zero `h-screen` in nested layout components (all use flex or calc)
4. `FluxosManager` and `RegrasManager` action buttons visible without hover
5. `ContratosManager` uses design token fonts only
6. `FlowEditor` respects system color mode
7. `BaseConhecimento` shows functional state (not dead stub)
8. All tests pass, 0 TS errors

---

## Parallelism Strategy

```
Phase 8 (Security) ────────┐
                            ├── Phase 9 (Financial) ──┐
Phase 10 (Quality) ────────┤                          ├── Done
Phase 11 (UX) ─────────────┘                          │
                                                       │
Phase 10 + 11 can start immediately ──────────────────┘
```

- **Phase 8** is the top priority — start here
- **Phase 9** depends on Phase 8 (reuses rate limiting patterns)
- **Phases 10 and 11** are independent — can run in parallel with each other and with Phase 9
- All phases must maintain: 1227+ tests passing, 0 TS errors, 0 lint warnings, build < 4MB
