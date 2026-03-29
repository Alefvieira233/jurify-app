# UI Audit -- Jurify

**Analysis Date:** 2026-03-29
**Status:** COMPLETE -- All feature directories and key components audited.

---

## Executive Summary

Audited 30+ feature directories and 100+ TSX files. The codebase has solid patterns for loading/error/empty states in most modules. Key systemic issues:

1. **Inconsistent styling paradigm** -- ContratosManager uses inline `fontFamily` and `hsl(var(...))` patterns not used anywhere else
2. **Native `<select>` vs shadcn `<Select>`** -- 17+ files use raw `<select>` elements instead of the `<Select>` component
3. **`window.confirm()` anti-pattern** -- 3 files use browser confirm dialogs instead of `ConfirmDialog`
4. **Deprecated `onKeyPress`** -- Used in EnhancedAIChat instead of `onKeyDown`
5. **`h-screen` conflicts** -- 20+ feature files use `h-screen` which conflicts with sidebar layout
6. **Minimal aria-labels** -- Only 5 feature files have any `aria-label` attributes (across 100+ files)
7. **No i18n** -- All strings are hardcoded in Portuguese with no extraction layer
8. **Delete without confirmation** -- ConexoesManager deletes connections without ConfirmDialog

---

## Sidebar (previously audited)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Referral CTA has `cursor-pointer` but no `onClick` handler | `src/components/Sidebar.tsx` L374-382 | Medium |
| 2 | Notification badge wired in code but no nav item uses `badge: 'notification'` | `src/components/Sidebar.tsx` L262 | Medium |
| 3 | `disabled` items bypass RBAC visibility check | `src/components/Sidebar.tsx` L173 | Low |
| 4 | No mobile responsiveness -- fixed `w-[220px]`, no hamburger/drawer | `src/components/Sidebar.tsx` | High |
| 5 | `base-conhecimento` nav item may not route to a real page | `src/components/Sidebar.tsx` | Low |

---

## Cross-Cutting Issues

### 1. Native `<select>` Instead of shadcn `<Select>` (CONSISTENCY)

The app has a proper `<Select>` component from shadcn/ui but 17+ feature files use raw HTML `<select>` elements with manually styled classes. This creates inconsistent styling, no keyboard navigation matching shadcn patterns, and accessibility gaps.

| File | Lines |
|------|-------|
| `src/features/audit/AuditTrail.tsx` | L101-109 |
| `src/features/contracts/ContratosManager.tsx` | L313-323 |
| `src/features/honorarios/HonorariosManager.tsx` | L243-251 |
| `src/features/processos/ProcessosManager.tsx` | L311-330 |
| `src/features/prazos/PrazosManager.tsx` | L265-287 |
| `src/features/documentos/DocumentosManager.tsx` | L182-190 |
| `src/features/tarefas/TarefasPage.tsx` | L117-137 |
| `src/features/suporte/SuportePage.tsx` | L108-118, L188-195 |
| `src/features/logs/LogsPanel.tsx` | filter selects |
| `src/features/scheduling/AgendamentosManager.tsx` | status filter |
| `src/features/pipeline/PipelineJuridico.tsx` | filters |
| `src/features/leads/LeadsPanel.tsx` | filters |
| `src/features/timeline/TimelineConversas.tsx` | filter |

**Fix:** Replace all native `<select>` with shadcn `<Select>` / `<SelectTrigger>` / `<SelectContent>` / `<SelectItem>`.

### 2. `window.confirm()` Anti-Pattern (UX)

Three files use the browser's native confirm dialog instead of the app's `ConfirmDialog` component. This breaks the UI theme, is not styleable, and varies across browsers.

| File | Line | Action |
|------|------|--------|
| `src/features/tarefas/TarefasPage.tsx` | L76 | Delete tarefa |
| `src/features/settings/sections/StatusManager.tsx` | L55 | Delete status |
| `src/components/BackupRestore.tsx` | L142 | Restore backup |

**Fix:** Replace `window.confirm()` with `<ConfirmDialog>` (already imported in most files).

### 3. Delete Without Confirmation (UX)

| File | Line | Action |
|------|------|--------|
| `src/features/conexoes/ConexoesManager.tsx` | L338 | `void handleDelete(conexao)` called directly without confirmation dialog |

**Fix:** Add `ConfirmDialog` wrapper before calling `handleDelete`.

### 4. `h-screen` in Nested Layouts (RESPONSIVE)

20+ feature files use `h-screen` as their root container. Since these are rendered inside a sidebar layout, the actual available height is `100vh - topbar`. This causes content to overflow or be cut off, particularly visible when content is scrollable.

**Affected files:** `NotificationsPanel.tsx`, `CRMDashboard.tsx`, `LogsPanel.tsx`, `BaseConhecimento.tsx`, `ConfiguracoesPage.tsx`, `ConfiguracoesGerais.tsx`, `RelatoriosGerenciais.tsx`, `FollowUpPanel.tsx`, `ContatosTable.tsx`, `LeadDetailPanel.tsx`, `AgendamentosManager.tsx`, `PipelineJuridico.tsx`

**Fix:** Use `h-[calc(100vh-var(--topbar-height))]` or `flex-1 overflow-auto` within a parent flex container, or the pattern `h-[calc(100vh-4rem)]` used by `FlowEditor.tsx`.

### 5. Hardcoded Portuguese Strings (I18N)

All UI text is hardcoded in Portuguese. There is no i18n extraction layer. This is acceptable for a Brazilian market app but blocks international expansion.

**Scope:** Every feature file. No `t()` or `<Trans>` calls detected.

### 6. Minimal Accessibility (A11Y)

Only 5 out of 100+ feature files contain any `aria-label` attributes. Most interactive elements (icon-only buttons, toggle switches, drag handles) lack accessible names.

**Worst offenders:**

| File | Issue |
|------|-------|
| `src/features/leads/LeadsKanban.tsx` | Only 1 aria-label on edit button; drag handles have no labels |
| `src/features/automations/FlowEditor.tsx` | Drag-and-drop palette items have no aria labels |
| `src/features/pipeline/KanbanOperacional.tsx` | Drag-and-drop columns lack role/aria |
| `src/features/crm/CRMDashboard.tsx` | Pipeline stage buttons lack aria-label |
| All tables | No `<caption>` elements on any `<Table>` |
| All icon-only buttons | Most lack `aria-label` (only `title` attribute used) |

### 7. Deprecated `onKeyPress` (CODE QUALITY)

| File | Line |
|------|------|
| `src/features/ai-agents/EnhancedAIChat.tsx` | L254 |

**Fix:** Replace `onKeyPress` with `onKeyDown`. `onKeyPress` is deprecated and does not fire for all keys in all browsers.

---

## Per-Feature Findings

### `src/features/ai-agents/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `BaseConhecimento.tsx` -- static stub, "Adicionar Documento" button has no handler | `BaseConhecimento.tsx` L19-21 | High |
| 2 | `BaseConhecimento.tsx` -- native `<input type="checkbox">` without label or aria | `BaseConhecimento.tsx` L40 | Medium |
| 3 | `BaseConhecimento.tsx` -- uses `h-screen`, conflicts with sidebar layout | `BaseConhecimento.tsx` L12 | Medium |
| 4 | `EnhancedAIChat.tsx` -- fixed height `h-[600px]`, not responsive | `EnhancedAIChat.tsx` L144 | Medium |
| 5 | `EnhancedAIChat.tsx` -- hardcoded gradient colors `from-gray-50 to-blue-50` not dark-mode safe | `EnhancedAIChat.tsx` L144 | Low |
| 6 | `EnhancedAIChat.tsx` -- constantly running ping animation wastes battery on mobile | `EnhancedAIChat.tsx` L149 | Low |
| 7 | `AgentesIAManager.tsx` -- metric cards use emoji (`📊`, `🏆`) in UI instead of Lucide icons | `AgentesIAManager.tsx` L234, L246 | Low |

### `src/features/audit/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | No pagination -- loads up to 50 logs only, no "load more" or pagination controls | `AuditTrail.tsx` L47 | Medium |
| 2 | Uses native `<select>` for tipo filter | `AuditTrail.tsx` L101-109 | Low |

### `src/features/automations/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `FlowEditor.tsx` -- hardcoded `colorMode="dark"` on ReactFlow canvas | `FlowEditor.tsx` L396 | Medium |
| 2 | `FlowEditor.tsx` -- palette drag items have no keyboard alternative (drag-only interaction) | `FlowEditor.tsx` L355-370 | Medium |
| 3 | `FlowEditor.tsx` -- left palette `w-[200px]` and right panel `w-[280px]` are fixed widths, no responsive | `FlowEditor.tsx` L351, L429 | Medium |
| 4 | `FluxosManager.tsx` -- action buttons (Edit/Delete) on cards only visible on hover -- touch devices cannot access them | `FluxosManager.tsx` L467-491 | High |
| 5 | `RegrasManager.tsx` -- same hover-only actions pattern | `RegrasManager.tsx` L438-456 | High |

### `src/features/billing/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `SubscriptionStatus.tsx` -- navigates to `/planos` but Pricing page may not be the correct route | `SubscriptionStatus.tsx` L44 | Low |
| 2 | Minimal component -- no loading state, no error handling | `SubscriptionStatus.tsx` | Low |

### `src/features/conexoes/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Delete connection has NO confirmation dialog -- calls `handleDelete` directly | `ConexoesManager.tsx` L338 | High |
| 2 | Inline SVG WhatsApp icons repeated 2x instead of extracted component | `ConexoesManager.tsx` L207-209, L237-239 | Low |
| 3 | `GripVertical` icon in table suggests drag-reorder but no DnD is wired | `ConexoesManager.tsx` L283 | Low |

### `src/features/contatos/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | No error state -- only loading and success states | `ContatosTable.tsx` | Medium |
| 2 | No export/bulk actions for contacts | `ContatosTable.tsx` | Low |

### `src/features/contracts/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Inline `fontFamily` styles referencing fonts not loaded (`Cormorant Garamond`, `Space Grotesk`) | `ContratosManager.tsx` L244, L253, L270, L282, L288-289 | High |
| 2 | Inline `hsl(var(--accent))` CSS used instead of Tailwind class equivalents -- inconsistent with rest of app | `ContratosManager.tsx` L160-164, L224, L276 | Medium |
| 3 | `className="fade-in"` on L239 -- custom animation class not defined anywhere standard | `ContratosManager.tsx` L239 | Low |
| 4 | Eye and Edit buttons both trigger `handleOpenDetails` -- Edit does nothing different | `ContratosManager.tsx` L383-387 | Medium |
| 5 | Error state has hardcoded `bg-red-50` (not dark-mode safe) | `ContratosManager.tsx` L170 | Low |
| 6 | Multiple action buttons per card clutter on small screens, no responsive collapse | `ContratosManager.tsx` L382-420 | Medium |

### `src/features/crm/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `CRMDashboard.tsx` -- uses `h-screen` root, conflicts with sidebar | `CRMDashboard.tsx` L94, L120 | Medium |
| 2 | `CRMDashboard.tsx` -- `FollowUpPanel` rendered twice (once in tab, once in Sheet) | `CRMDashboard.tsx` L402, L510 | Low |
| 3 | `ContatosTable.tsx` (CRM version) -- separate file from `src/features/contatos/ContatosTable.tsx` -- code duplication | `src/features/crm/ContatosTable.tsx` vs `src/features/contatos/ContatosTable.tsx` | Medium |

### `src/features/dashboard/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | No loading skeleton -- if `leads` is null/loading the page just renders empty cards with 0 values | `Dashboard.tsx` | Medium |
| 2 | No error state | `Dashboard.tsx` | Medium |

### `src/features/departamentos/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Well-structured with RBAC, skeletons, and `ConfirmDialog` | `DepartamentosManager.tsx` | None found |

### `src/features/documentos/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | PDF/office preview not available -- only images can be previewed inline | `DocumentosManager.tsx` L296-309 | Low |
| 2 | No drag-and-drop upload area | `DocumentosManager.tsx` | Low |

### `src/features/equipe/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Uses `supabase as any` type cast | `EquipeManager.tsx` L19 | Low |

### `src/features/home/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | No error state for failed data fetches | `HomePage.tsx` | Medium |
| 2 | `greeting()` function recalculates on every render -- no memoization needed since it's cheap, but `today` variable uses `toISOString()` which is UTC, not local time -- could show wrong day near midnight | `HomePage.tsx` L32 | Low |

### `src/features/honorarios/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | P&L summary grid `grid-cols-3` does not collapse on mobile | `HonorariosManager.tsx` L203 | Medium |
| 2 | Uses native `<select>` for status filter | `HonorariosManager.tsx` L243-251 | Low |

### `src/features/leads/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `LeadsKanban.tsx` -- responsible name shows as "---" even when `responsavel_id` exists (no lookup) | `LeadsKanban.tsx` L118-120 | Medium |
| 2 | Kanban columns `min-w-[210px]` are small for complex cards | `LeadsKanban.tsx` L176 | Low |
| 3 | No horizontal scroll indicator on Kanban | `LeadsKanban.tsx` L170 | Low |

### `src/features/logs/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Uses `h-screen` root -- conflicts with sidebar | `LogsPanel.tsx` L47, L76 | Medium |

### `src/features/mission-control/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Component appears to be demo/internal tooling with SpaceX-themed styling | `MissionControl.tsx` | Low |

### `src/features/notifications/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Uses `h-screen` root | `NotificationsPanel.tsx` L32, L61 | Medium |
| 2 | No pagination -- renders all notifications at once | `NotificationsPanel.tsx` | Low |

### `src/features/pipeline/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `PipelineJuridico.tsx` uses `h-screen` | `PipelineJuridico.tsx` L73 | Medium |

### `src/features/prazos/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Emoji `⚠️` used in urgentes warning instead of Lucide icon | `PrazosManager.tsx` L247 | Low |
| 2 | Uses native `<select>` for status and tipo filters | `PrazosManager.tsx` L265-287 | Low |

### `src/features/processos/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Uses native `<select>` for status and tipo filters | `ProcessosManager.tsx` L311-330 | Low |
| 2 | Stats queries fire 3 separate count queries to Supabase instead of a single aggregation | `ProcessosManager.tsx` L87-125 | Low (perf) |

### `src/features/reports/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Uses `h-screen` root in multiple states | `RelatoriosGerenciais.tsx` L328, L347, L377 | Medium |
| 2 | Complex component with 3 lazy-loaded sub-dashboards -- large bundle potential | `RelatoriosGerenciais.tsx` | Low |

### `src/features/scheduling/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Uses `h-screen` root in multiple states | `AgendamentosManager.tsx` L83, L121, L160 | Medium |
| 2 | Search only matches `responsavel` field, not title/description | `AgendamentosManager.tsx` L38 | Low |

### `src/features/settings/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `ConfiguracoesGerais.tsx` and `ConfiguracoesPage.tsx` both exist -- unclear which is used | Both files | Low |
| 2 | `StatusManager.tsx` uses `window.confirm()` for delete | `sections/StatusManager.tsx` L55 | Medium |

### `src/features/suporte/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | New ticket form lacks title field -- only has tipo + conteudo | `SuportePage.tsx` L184-215 | Low |
| 2 | No form validation -- empty submit just returns silently | `SuportePage.tsx` L65 | Medium |
| 3 | Uses native `<select>` for tipo filter and form | `SuportePage.tsx` L108, L188 | Low |

### `src/features/tags/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Well-structured -- RBAC, ConfirmDialog, aria-labels on buttons | `TagsManager.tsx` | None found |

### `src/features/tarefas/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Uses `window.confirm()` for delete instead of ConfirmDialog | `TarefasPage.tsx` L76 | Medium |
| 2 | No pagination -- renders all tasks at once | `TarefasPage.tsx` | Low |
| 3 | Uses native `<select>` for filters | `TarefasPage.tsx` L117-137 | Low |

### `src/features/timeline/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Uses native `<select>` for filter | `TimelineConversas.tsx` | Low |

### `src/features/users/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Well-structured -- uses ConfirmDialog, RBAC checks | `UsuariosManager.tsx` | None found |

### `src/features/whatsapp/`

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `WhatsAppIA.tsx` is a large file (12k+ tokens) -- may need splitting | `WhatsAppIA.tsx` | Low |

---

## Priority Fix List

### P0 -- High Severity (fix first)

| # | Issue | Files | Impact |
|---|-------|-------|--------|
| 1 | Hover-only action buttons inaccessible on touch devices | `FluxosManager.tsx`, `RegrasManager.tsx` | Users on tablets/mobile cannot edit or delete items |
| 2 | Delete without confirmation | `ConexoesManager.tsx` | Accidental data loss |
| 3 | Sidebar has no mobile responsiveness | `Sidebar.tsx` | App unusable on mobile |
| 4 | `BaseConhecimento.tsx` is a non-functional stub but navigable | `BaseConhecimento.tsx` | Users see a dead page |
| 5 | Inline font references to unloaded fonts | `ContratosManager.tsx` | Broken visual hierarchy, FOUT |

### P1 -- Medium Severity (fix soon)

| # | Issue | Files | Impact |
|---|-------|-------|--------|
| 6 | `h-screen` conflicts with sidebar layout | 20+ files | Content overflow/cutoff |
| 7 | `window.confirm()` anti-pattern | 3 files | Inconsistent UX |
| 8 | Native `<select>` inconsistency | 17+ files | Inconsistent UI, poor keyboard nav |
| 9 | Missing error states | `Dashboard.tsx`, `HomePage.tsx`, `ContatosTable.tsx` | Silent failures |
| 10 | FlowEditor hardcoded `colorMode="dark"` | `FlowEditor.tsx` | Canvas always dark even in light mode |
| 11 | Duplicate `ContatosTable.tsx` | `src/features/crm/` vs `src/features/contatos/` | Maintenance burden |
| 12 | Eye and Edit buttons do the same thing in ContratosManager | `ContratosManager.tsx` | Confusing UX |

### P2 -- Low Severity (backlog)

| # | Issue | Files | Impact |
|---|-------|-------|--------|
| 13 | Minimal aria-labels across all features | All | Accessibility gap |
| 14 | Deprecated `onKeyPress` | `EnhancedAIChat.tsx` | May break in future browsers |
| 15 | Emoji icons instead of Lucide | `AgentesIAManager.tsx`, `PrazosManager.tsx` | Inconsistent icon style |
| 16 | No i18n layer | All | Blocks future internationalization |
| 17 | Kanban shows "---" for responsavel | `LeadsKanban.tsx` | Missing data presentation |
| 18 | No pagination in several views | `AuditTrail`, `NotificationsPanel`, `TarefasPage` | Performance with many records |

---

*UI audit complete -- 2026-03-29*
