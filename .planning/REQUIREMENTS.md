# Requirements: Jurify — Tech Debt Remediation

**Defined:** 2026-03-29
**Core Value:** Harden security, reduce financial risk, improve code quality and UX consistency across the platform

## v1.1 Requirements

### Security (Phase 8)

- [ ] **SEC-01**: `create-portal-session` validates return URL against allowed origins (closes open redirect)
- [ ] **SEC-02**: `chat-completion` sanitizes user messages before sending to OpenAI (closes prompt injection)
- [ ] **SEC-03**: `assistant` tool queries use `escapeLike()` on all user-derived ilike values
- [ ] **SEC-04**: `kapso-manager` ilike queries use `escapeLike()` consistently
- [ ] **SEC-05**: `send-email` HTML-escapes all template data values (closes XSS in emails)
- [ ] **SEC-06**: `create-portal-session` has rate limiting (10 req/min)
- [ ] **SEC-07**: `google-calendar` Edge Function has rate limiting (20 req/min)
- [ ] **SEC-08**: Rate limiting added to all user-facing Edge Functions currently missing it (`encrypt-data`, `decrypt-data`, `create-drive-folder`, `extract-document-text`, `ingest-document-from-file`, `send-push-notification`)
- [ ] **SEC-09**: `TesteRealAgenteIA` component gated behind admin-only role check
- [ ] **SEC-10**: `charge-refunded` email template added to `send-email` Edge Function
- [ ] **SEC-11**: RBAC route restrictions added to `/conexoes`, `/fluxos`, `/regras`, `/agentes`, `/base-conhecimento`, `/departamentos`

### Financial Risk (Phase 9)

- [ ] **FIN-01**: Per-tenant daily AI token budget tracked in database
- [ ] **FIN-02**: AI Edge Functions check budget before making OpenAI calls
- [ ] **FIN-03**: Admin dashboard shows per-tenant AI usage and spending
- [ ] **FIN-04**: Alert notification when tenant reaches 80% of daily budget

### Code Quality (Phase 10)

- [ ] **QUAL-01**: Supabase types regenerated — all current tables included in `types.ts`
- [ ] **QUAL-02**: All 12 local `supabase as any` casts replaced with canonical `supabaseUntyped` import
- [ ] **QUAL-03**: Dead `src/utils/logger.ts` and its test deleted
- [ ] **QUAL-04**: Monitoring utilities consolidated into single `src/lib/monitoring.ts`
- [ ] **QUAL-05**: Unused `rrule` and `@types/rrule` removed from `package.json`
- [ ] **QUAL-06**: 14 hooks migrated from useState+useEffect to React Query
- [ ] **QUAL-07**: 5 stray `console.log/error/warn` calls replaced with logger
- [ ] **QUAL-08**: 7 Edge Function calls with ignored errors now surface failures via toast
- [ ] **QUAL-09**: `hasPermission` in AuthContext changed to synchronous return

### UX Consistency (Phase 11)

- [ ] **UX-01**: All 17+ native `<select>` elements replaced with shadcn `<Select>`
- [ ] **UX-02**: All 3 `window.confirm()` usages replaced with `<ConfirmDialog>`
- [ ] **UX-03**: `ConexoesManager` delete wired through `<ConfirmDialog>`
- [ ] **UX-04**: 20+ `h-screen` usages fixed to `h-[calc(100vh-var(--topbar-h))]` or flex layout
- [ ] **UX-05**: Hover-only action buttons in `FluxosManager` and `RegrasManager` made touch-accessible
- [ ] **UX-06**: `ContratosManager` inline font references removed, uses design token fonts
- [ ] **UX-07**: `FlowEditor` colorMode reads from system theme instead of hardcoded `"dark"`
- [ ] **UX-08**: `BaseConhecimento` stub page replaced with "coming soon" state or functional upload
- [ ] **UX-09**: Missing error states added to `Dashboard`, `HomePage`, `ContatosTable`
- [ ] **UX-10**: Deprecated `onKeyPress` in `EnhancedAIChat` replaced with `onKeyDown`

## v1.2 Requirements (Deferred)

### Architecture Refactoring

- **ARCH-01**: 45+ misplaced components moved to their feature directories
- **ARCH-02**: 52 direct Supabase calls in components extracted to hooks
- **ARCH-03**: AuthContext split into state + actions contexts
- **ARCH-04**: God components (11 files 500+ lines) split into sub-components
- **ARCH-05**: 100 migrations squashed into baseline

### Observability

- **OBS-01**: Sentry initialized in all 32 Edge Functions (currently only 2)
- **OBS-02**: `VITE_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` configured in Vercel
- **OBS-03**: Source maps uploaded during CI/CD build

### Testing

- **TEST-01**: Tests for Automations feature (RuleEditor, FlowEditor, FluxosManager)
- **TEST-02**: Tests for LeadForm component
- **TEST-03**: Tests for ContratosManager lifecycle

## Out of Scope

| Feature | Reason |
|---------|--------|
| i18n / internationalization | App is Brazil-only market; adds complexity without current need |
| Mobile responsive sidebar | Requires design spec; deferred to dedicated mobile sprint |
| Pagination for all views | Only high-volume tables need it; bounded tables are fine without |
| ZapSign webhook handler | Integration is alpha; needs product decision first |
| Google Calendar rate limiting beyond basic | Needs usage data to set appropriate limits |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 8 | Pending |
| SEC-02 | Phase 8 | Pending |
| SEC-03 | Phase 8 | Pending |
| SEC-04 | Phase 8 | Pending |
| SEC-05 | Phase 8 | Pending |
| SEC-06 | Phase 8 | Pending |
| SEC-07 | Phase 8 | Pending |
| SEC-08 | Phase 8 | Pending |
| SEC-09 | Phase 8 | Pending |
| SEC-10 | Phase 8 | Pending |
| SEC-11 | Phase 8 | Pending |
| FIN-01 | Phase 9 | Pending |
| FIN-02 | Phase 9 | Pending |
| FIN-03 | Phase 9 | Pending |
| FIN-04 | Phase 9 | Pending |
| QUAL-01 | Phase 10 | Pending |
| QUAL-02 | Phase 10 | Pending |
| QUAL-03 | Phase 10 | Pending |
| QUAL-04 | Phase 10 | Pending |
| QUAL-05 | Phase 10 | Pending |
| QUAL-06 | Phase 10 | Pending |
| QUAL-07 | Phase 10 | Pending |
| QUAL-08 | Phase 10 | Pending |
| QUAL-09 | Phase 10 | Pending |
| UX-01 | Phase 11 | Pending |
| UX-02 | Phase 11 | Pending |
| UX-03 | Phase 11 | Pending |
| UX-04 | Phase 11 | Pending |
| UX-05 | Phase 11 | Pending |
| UX-06 | Phase 11 | Pending |
| UX-07 | Phase 11 | Pending |
| UX-08 | Phase 11 | Pending |
| UX-09 | Phase 11 | Pending |
| UX-10 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after milestone v1.1 creation*
