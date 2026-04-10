# Jurify — UX/UI Audit

**Date:** 2026-04-10
**Auditor:** Uma (@ux-design-expert)
**Scope:** Code-level audit (no browser). Frontend React 18 + TypeScript + shadcn/ui + Tailwind CSS.
**Working dir:** `E:\Jurify`

---

## Executive Summary

Jurify has a **mature, well-architected frontend** with strong foundational UX primitives: shared `EmptyState`, `ErrorState`, `LoadingState`, `CRUDManagerLayout`, `ErrorBoundary`, `FeatureErrorBoundary`, skeleton coverage across 42 files, Breadcrumbs with `aria-current`, a dedicated `ThemeToggle` with persisted preference, and a well-structured 404 page. Forms use `react-hook-form + zod` across 24 files. Portuguese (pt-BR) consistency is strong with only 2 trivial English leaks inside shadcn primitives.

The main UX risks come from **(a) a scattered subset of components that bypass the shared primitives**, **(b) inline-validation inconsistency** (only 6 of 24 `react-hook-form` files use the `FormMessage` primitive — the rest roll their own `errors.x && <p>` spans), **(c) icon-only DropdownMenuTrigger buttons missing `aria-label` / `sr-only`**, and **(d) one print-only report using raw `<table>` + hardcoded grays**.

No blocking issues. Dark mode is supported and includes a defensive legacy-gray override layer in `index.css`.

---

## UX Health Score: **78 / 100**

| Dimension | Score | Notes |
|---|---|---|
| Loading states | 9/10 | 42 files use Skeleton, `CRUDManagerLayout` provides default skeletons, `<Suspense fallback>` on routes |
| Empty states | 9/10 | Shared `EmptyState` primitive used in 23 files with icon + CTA |
| Error states | 8/10 | `ErrorState` + `FeatureErrorBoundary` per route, `OfflineBanner`, `ErrorBoundary` global; inconsistent retry wiring |
| Form validation | 6/10 | Inline errors shown, but only 6/24 forms use shadcn `FormMessage` primitive — accessibility + styling drift |
| Accessibility | 7/10 | Good: `aria-label` in key places, `Breadcrumbs` nav, `ScreenReaderAnnounce`, semantic `<nav>/<ol>`. Gaps: icon-only dropdown triggers, 2 English `sr-only` strings in shadcn primitives |
| Consistency | 8/10 | Strong shadcn adherence except `LeadReport.tsx` (raw `<table>` + hardcoded grays) and some inline `style` on avatars/colors |
| Mobile responsiveness | 7/10 | Hamburger menu, responsive grids, `lg:hidden` controls. Gaps: some tables lack `overflow-x-auto` wrappers |
| Toasts | 8/10 | Single source (`use-toast` + shadcn `<Toaster />`). Dead `sonner.tsx` wrapper exists but is not mounted — minor dead code |
| Navigation | 9/10 | Breadcrumbs, 404 page, route redirects for legacy paths, `DeepLinkHandler` for Capacitor |
| Brazilian Portuguese | 10/10 | Only 2 shadcn-primitive English leaks (`Close` in `dialog.tsx` / `sheet.tsx`) — inside `sr-only` spans |
| Decomposed components cohesion | 9/10 | All 7 recently decomposed components stayed < 250 lines, share `CRUDManagerLayout`, keep visual tokens |
| Dark mode | 8/10 | `ThemeToggle` persists to `localStorage`, `.dark` CSS vars defined, legacy-gray override layer in `index.css`. Print views intentionally light-only |

---

## Findings

### P0 — Critical (block ship or seriously degrade UX)

**None.** No blocking UX defects found at code level.

---

### P1 — High (should fix this sprint)

**P1-01 — Form validation drift: only 25% of forms use shadcn `FormMessage` primitive**
- **Files (sample):**
  - `src/features/tarefas/NovaTarefaForm.tsx:71` — `{errors.titulo && <p className="text-xs text-destructive mt-1">...}`
  - `src/features/tarefas/EditTarefaDialog.tsx`
  - `src/features/honorarios/components/NovoHonorarioForm.tsx`
  - `src/features/scheduling/components/NovoAgendamentoForm.tsx`
  - `src/features/processos/components/NovoProcessoForm.tsx`
  - `src/features/prazos/components/NovoPrazoForm.tsx`
  - `src/features/ai-agents/components/NovoAgenteForm.tsx`
  - `src/features/contracts/components/NovoContratoForm.tsx`
  - `src/features/settings/configuracoes/PerfilSection.tsx`
  - `src/features/settings/configuracoes/SegurancaSection.tsx`
  - `src/features/settings/configuracoes/EscritorioSection.tsx`
  - `src/features/settings/configuracoes/MinhaContaSection.tsx`
  - `src/features/documentos/components/UploadDocumentoForm.tsx`
  - `src/features/settings/sections/StatusFormDialog.tsx`
  - `src/features/departamentos/DepartamentoForm.tsx`
  - `src/features/tags/TagForm.tsx`
  - `src/pages/Auth.tsx`
- **Evidence:** Grep `useForm|zodResolver` → 24 files; `FormMessage` → 6 files. Delta = 18 files.
- **Impact:** Inline errors still display, but: (1) inconsistent styling/spacing, (2) missing `aria-invalid` / `aria-describedby` wiring that `Form` primitive provides automatically, (3) no keyboard focus management on first error, (4) accessibility issue — screen readers don't announce error association. Some forms (`LoginForm`, `RegisterForm`, lead forms) already do this correctly — migrate the rest.
- **Fix:** Wrap fields in `<FormField>` / `<FormItem>` / `<FormControl>` / `<FormMessage>` from `@/components/ui/form`. Template exists in `src/components/forms/lead/LeadBasicInfo.tsx`.

**P1-02 — Icon-only `DropdownMenuTrigger` buttons missing accessible name**
- **Files:**
  - `src/features/conexoes/ConexoesManager.tsx:237` — `<Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal ... /></Button>` (no aria-label, no sr-only)
  - `src/features/departamentos/DepartamentosManager.tsx:152` — same pattern
  - `src/features/users/UsuariosManager.tsx:302` — same pattern
  - `src/features/automations/RuleConditionEditor.tsx:100` — inspect
  - `src/features/automations/RuleActionEditor.tsx:307` — inspect
  - `src/features/automations/components/FlowConfigPanel.tsx:81` — inspect
  - `src/features/settings/integrations/CustomIntegrations.tsx:91,94,97` — 3 icon buttons (edit / sync / delete) rely on icon alone
- **Contrast:** `src/features/tarefas/TarefasPage.tsx:237` does it right with `<span className="sr-only">Ações</span>`.
- **Impact:** Screen readers announce "button" with no label. WCAG 2.1 failure (4.1.2).
- **Fix:** Add `aria-label="Mais ações"` or `<span className="sr-only">Ações</span>` to all icon-only triggers. Consider a lint rule or shared `IconButton` component that requires a label prop.

**P1-03 — `LeadReport.tsx` uses raw `<table>` + hardcoded grays, bypasses shadcn primitives**
- **File:** `src/features/reports/LeadReport.tsx:124-205` — 3 raw `<table>` instances with `border-collapse`, `text-gray-900`, `border-gray-300`, inline `style={{ color: '#dc2626' }}` (line 169)
- **Note:** This IS a print-only PDF export view (has `print:text-black` classes) so the hardcoded light palette is intentional for print. However:
  - The 3 raw tables bypass `Table` / `TableHeader` / `TableCell` primitives — harder to maintain and visually inconsistent if viewed on-screen before printing
  - The inline `style={{ color: (p.dias_restantes ?? 999) <= 5 ? '#dc2626' : '#059669' }}` is the only inline-style color in the whole codebase — either move to semantic tokens (`text-destructive` / `text-success`) with `print:text-red-600 print:text-green-600` overrides
- **Impact:** Low for end users (print only), medium for maintainability
- **Fix:** Migrate to shadcn `Table` primitives with `print:*` modifiers; use design tokens for colors

**P1-04 — Tables without `overflow-x-auto` wrappers on mobile**
- **Files:**
  - `src/features/tarefas/TarefasPage.tsx:162` — `<Table>` with 8 columns inside `<div className="border border-border rounded-lg overflow-hidden">` (note: `overflow-hidden`, not `overflow-x-auto`)
  - `src/features/contatos/ContatosTable.tsx:185` — virtualized table, 5 cols, no horizontal scroll
  - `src/features/settings/configuracoes/PermissionsMatrix.tsx` — inspect
  - `src/features/settings/configuracoes/UsersList.tsx` — inspect
  - `src/features/settings/configuracoes/NotificacoesSection.tsx` — inspect
- **Impact:** On narrow mobile viewports, table cells get squished or the last columns clip off-screen. Users on phones can't see the Actions column.
- **Fix:** Wrap tables in `<div className="w-full overflow-x-auto">` or provide a mobile card variant (EquipeManager already has `MobileMemberCard.tsx` — good precedent).

**P1-05 — Dead `sonner` wrapper component**
- **File:** `src/components/ui/sonner.tsx`
- **Evidence:** Only 1 file imports from sonner (`sonner.tsx` itself). `App.tsx:167` mounts `<Toaster />` from `@/components/ui/toaster` (shadcn reducer-based), not from sonner. The sonner component is defined but never rendered anywhere. All 241 `toast.x()` calls across 50 files go through `use-toast` / shadcn.
- **Impact:** Dead code, `next-themes` dep is pulled in for nothing, confuses future devs
- **Fix:** Delete `src/components/ui/sonner.tsx` and the `sonner` + `next-themes` packages if unused elsewhere. OR adopt sonner consistently and delete the shadcn toaster. Currently the codebase has both imported — pick one.

---

### P2 — Medium (nice to fix)

**P2-01 — English strings in shadcn primitives**
- `src/components/ui/dialog.tsx:47` — `<span className="sr-only">Close</span>`
- `src/components/ui/sheet.tsx:68` — `<span className="sr-only">Close</span>`
- **Impact:** Screen reader users on pt-BR locale hear "Close" instead of "Fechar". Minor since they'll hear it once per dialog.
- **Fix:** Change to `Fechar`. These are shadcn defaults that weren't localized.

**P2-02 — `index.css` uses `!important` override layer for legacy gray classes**
- `src/index.css:297-339` — `.dark .text-gray-900 { color: hsl(var(--foreground)) !important; }` + 6 more overrides
- **Impact:** Band-aid for files that use `text-gray-*` instead of semantic tokens. Works, but hides the underlying inconsistency and carries CSS specificity debt.
- **Evidence:** 60 files still use `text-gray-*` / `bg-gray-*` / `text-white` / `bg-white` in `src/features/`
- **Fix:** Gradually migrate to semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`) and remove the override layer.

**P2-03 — `LoadingState.tsx` hardcoded `text-blue-600` spinner color**
- `src/components/LoadingState.tsx:38` — `'animate-spin text-blue-600'`
- **Impact:** Blue spinner doesn't follow theme/brand token. Breaks visual consistency if theme primary changes.
- **Fix:** Change to `text-primary`.

**P2-04 — `OfflineBanner` uses hardcoded yellow, unstyled for dark mode**
- `src/App.tsx:157` — `bg-yellow-500 text-yellow-950`
- **Impact:** Works in both themes but not a semantic warning token.
- **Fix:** Use `bg-warning text-warning-foreground` or define one.

**P2-05 — Inline `style={{ backgroundColor: avatarColor }}` for generated avatar colors**
- `src/features/users/UsuariosManager.tsx:296`, `src/features/equipe/components/MemberCardHeader.tsx`, etc.
- **Impact:** Acceptable since colors are dynamic (hashed from user ID), but worth wrapping in a helper component (`<Avatar fallbackColor={...} />`) to avoid inline style sprawl. Grep shows 40 files use `style={{ }}` — most are dynamic widths / positions for charts / progress bars, which is fine.

**P2-06 — No keyboard-trap verification in custom modals**
- Standard `Dialog` / `Sheet` from shadcn handle focus trap via Radix. Custom drawers in `LeadDrawer.tsx` and `LeadDetailPanel.tsx` should be verified — they use Sheet so likely fine, but worth E2E testing with keyboard-only navigation.

**P2-07 — `AnalyticsDashboard` lacks explicit error state**
- `src/features/dashboard/components/analytics/AnalyticsDashboard.tsx` — I didn't see an `ErrorState` usage in the orchestrator. Uses `isLoading` but no `isError` branch visible in first 80 lines.
- **Fix:** Inspect and add `ErrorState` with retry.

**P2-08 — Breadcrumbs route labels hardcoded in component**
- `src/components/Breadcrumbs.tsx:4-32` — 30+ route labels in a static `ROUTE_LABELS` object
- **Impact:** Adding a new route requires editing Breadcrumbs. Unknown routes fall back to capitalized segment (acceptable default).
- **Fix:** Consider moving labels to a route config alongside `App.tsx` routes, or to a central `navigation.ts`.

**P2-09 — `Breadcrumbs` hidden on `/` and `/home` but not on deeply nested settings pages**
- `src/components/Breadcrumbs.tsx:39` — good for top level, but settings has `:section/:subsection` with up to 3 crumbs which will crowd mobile at the current `text-xs`.
- **Fix:** Verify mobile overflow — add `overflow-x-auto whitespace-nowrap` to `<ol>`.

**P2-10 — No `max-length` / character counter feedback on textareas**
- Forms use Zod for max length validation but don't surface live character counts to users. E.g., `descricao` field in `NovaTarefaForm.tsx:75`.
- **Impact:** Users only learn they hit a limit on submit.
- **Fix:** Add an optional counter helper for textareas with max lengths.

**P2-11 — Toast tone/timing consistency not centralized**
- 241 `toast()` calls across 50 files. Each call decides its own title / description / variant.
- **Impact:** Inconsistent tone ("Sucesso!" vs "Tudo certo" vs "Agente Criado"), inconsistent duration.
- **Fix:** Create a `src/lib/notify.ts` helper with `notify.success(action, entity)` / `notify.error(action, entity, err)` that produces consistent phrasing.

**P2-12 — `TesteRealAgenteIA.tsx` has non-Portuguese copy**
- `src/features/ai-agents/components/TesteRealAgenteIA.tsx:58` — `title: "Dados Incompletos"` (OK pt-BR)
- `src/features/ai-agents/components/TesteRealAgenteIA.tsx:127` — `"Teste Executado!"` / `via N8N` — "N8N" is a proper name, but mentions deprecated stack (Jurify now uses Kapso v2 per memory). Cosmetic.

---

## Strengths (what's working well)

1. **Shared UX primitives** — `CRUDManagerLayout`, `EmptyState`, `ErrorState`, `LoadingState`, `ScreenReaderAnnounce`, `ConfirmDialog`, `PaginationControls` are used consistently across 20+ features.
2. **Error boundaries** — Global `ErrorBoundary` + per-feature `FeatureErrorBoundary` on every route in `App.tsx`. Users never see a white screen on feature crash.
3. **Route-level suspense** — `<Suspense fallback={<LoadingSpinner fullScreen />}>` ensures no blank flash during lazy chunk loads. `lazyWithRetry` handles chunk failures gracefully.
4. **Offline detection** — `OfflineBanner` + `useNetworkStatus` + `useNetworkBanner` — fixed top banner surfaces network outages site-wide.
5. **Skeleton coverage** — 42 files use Skeleton primitives. `CRUDManagerLayout` provides automatic 3-card grid default.
6. **Screen reader announcements** — `ScreenReaderAnnounce` fires on filter changes with live region — good a11y touch.
7. **Focus management** — `useFocusOnRouteChange` hook is wired in `Layout.tsx` for route transitions.
8. **Keyboard shortcuts** — `useKeyboardShortcuts` + `KeyboardShortcutsHelp` — power user support.
9. **Theme toggle** — `ThemeToggle` in `TopBar`, persists to `localStorage`, respects system preference, animated icon transition.
10. **Breadcrumbs** — semantic `<nav aria-label="Breadcrumb">` + `<ol>` + `aria-current="page"` on last item + hides on root/home.
11. **pt-BR consistency** — only 2 `Close` strings escaped (both in shadcn primitives' `sr-only` spans).
12. **Draft persistence** — `useDraftPersistence` + `DraftRecoveryBanner` — rare and premium touch for form-heavy apps.
13. **Optimistic mutations** — `useOptimisticMutation` hook reduces perceived latency.
14. **Realtime sync** — `useRealtimeSync` auto-invalidates queries, so users don't need to refresh manually.
15. **Recently decomposed components stayed small** — verified: RegrasManager (169 lines), AIAssistantChat (199), CalendarPanel (212), AnalyticsDashboard (232), OnboardingFlow (188), EquipeManager (183). All consistently use shared primitives and match sibling visual conventions.
16. **No `window.confirm/alert/prompt`** — all destructive actions go through `ConfirmDialog`. Professional.
17. **404 page** — branded Jurify card with two CTAs (Home + Back), uses semantic tokens.

---

## Recommendations (prioritized)

1. **Adopt `FormMessage` project-wide** (P1-01). Replace ad-hoc `errors.x && <p>` with `<FormField>` — biggest single a11y + consistency win.
2. **Add `sr-only` / `aria-label` to all `DropdownMenuTrigger` icon buttons** (P1-02). One-day sweep, consider an ESLint rule or a shared `<IconButton label>` wrapper.
3. **Wrap all data tables in `overflow-x-auto`** (P1-04). Small fix, big mobile win.
4. **Kill dead sonner wrapper** (P1-05). Decide: keep shadcn Toaster OR migrate to sonner — don't keep both.
5. **Create `notify.ts` helper** (P2-11) to enforce toast tone/timing consistency.
6. **Gradual migration off hardcoded `text-gray-*` / `bg-white`** (P2-02) — then delete the `!important` override layer.
7. **Migrate `LeadReport.tsx` to shadcn `Table` primitives** (P1-03) with `print:*` modifiers for print-only styling.

---

## What I did NOT verify (out of scope — code-only audit)

- Visual pixel regressions (no browser access)
- Actual contrast ratios in live rendering (grep can't measure)
- Animation jank / frame rates
- Touch target sizes on real devices
- Screen reader walkthroughs (would need NVDA/VoiceOver)
- Color blindness simulation
- Load time perceived performance
- Real keyboard trap verification in modals

Recommend follow-up with `/qa` skill + `browse` for live validation after fixes land.
