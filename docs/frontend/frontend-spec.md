# Frontend Specification -- Jurify Legal SaaS

> **Phase 3 -- Brownfield Discovery** | @ux-design-expert (Uma)
> Generated: 2026-04-03 | Codebase: React 18 + TypeScript + Vite + shadcn/ui

---

## Executive Summary

Jurify is a mature Legal SaaS frontend with **512 TypeScript/TSX files**, **30 feature modules**, **47 lazy-loaded routes**, and a comprehensive design system built on shadcn/ui. The codebase follows a feature-based architecture with strong patterns for RBAC, error handling, and state management via React Query.

**Strengths:**
- Consistent use of shadcn/ui + Radix primitives across 53 UI components
- Robust error handling: ErrorBoundary on every route + Sentry integration + global handlers
- Well-structured lazy loading with `lazyWithRetry()` (auto-retry + deploy recovery)
- Clean design token system in CSS custom properties (light + dark themes)
- PWA-ready with service worker, manifest, Capacitor native support
- RBAC integrated at sidebar, route, and component levels
- Feature flag system ready for progressive rollouts

**Key Concerns:**
- i18n migration only ~3% complete (4 of ~130 component files use `useTranslation`)
- React.memo applied to only 19 files; many list components lack memoization
- EmptyState reusable component used in only 5 of 30 features
- Hardcoded Portuguese strings throughout feature modules (~70+ occurrences)
- STATUS_COLORS defined independently in 8 files with inconsistent values
- Limited keyboard navigation beyond Ctrl+K search and 4 sidebar shortcuts
- Accessibility coverage sparse -- 64 ARIA attributes across 37 files for a 512-file codebase

---

## Component Inventory

### Total Counts

| Category | Files | Notes |
|----------|-------|-------|
| **Shared components** (`src/components/`) | 45 | Includes forms, admin, auth, billing, configuracoes sub-dirs |
| **shadcn/ui primitives** (`src/components/ui/`) | 53 | Standard shadcn/ui + 3 custom (password-strength, skeletons, thinking-indicator) |
| **Feature components** (`src/features/`) | 129 | Across 30 modules |
| **Pages** (`src/pages/`) | ~8 | Auth, ResetPassword, NotFound, Pricing, legal pages, AdminStatus, AgentsPlayground |
| **Hooks** (`src/hooks/`) | 68 | Domain hooks + utility hooks |
| **Schemas** (`src/schemas/`) | 7 | Zod validation schemas |
| **Total TSX/TS** | 512 | Full codebase |

### Shared Components (src/components/)

**Layout & Navigation:**
- `Layout.tsx` -- Main shell: TopBar + Sidebar + Outlet + Breadcrumbs
- `TopBar.tsx` -- Header: logo, search trigger (Ctrl+K), notifications, avatar dropdown, theme toggle
- `Sidebar.tsx` -- Collapsible nav with sections, RBAC filtering, notification badges
- `Breadcrumbs.tsx` -- Auto-generated from route path, non-interactive (no links)
- `GlobalSearch.tsx` -- Ctrl+K command palette, searches leads/contracts/agendamentos/agentes

**State Management UI:**
- `LoadingSpinner.tsx` -- Full-screen branded spinner (Scale icon + pulse)
- `LoadingState.tsx` -- Inline loading with Loader2 spinner
- `EmptyState.tsx` -- Card with icon, title, description, CTA
- `ErrorBoundary.tsx` -- Class component, Sentry integration, i18n, dev-mode error details
- `ErrorState.tsx` -- Inline error card with retry button
- `ConfirmDialog.tsx` -- AlertDialog wrapper with destructive variant

**Feature Components:**
- `OnboardingFlow.tsx` -- 6-step checklist (profile, office, WhatsApp, lead, agent, team)
- `CookieBanner.tsx` -- LGPD-compliant consent banner
- `AIAssistantChat.tsx` -- Floating AI chat with quick actions, markdown rendering
- `KeyboardShortcutsHelp.tsx` -- Shortcut reference dialog
- `ThemeToggle.tsx` -- Light/dark animated toggle
- `PaginationControls.tsx` -- Prev/next with count
- `TagSelect.tsx` -- Tag picker component

**Forms (src/components/forms/):**
- `LeadForm.tsx` -- Lead creation/edit with zodResolver

**Admin/Config:**
- `configuracoes/` -- PerfilSection, EscritorioSection, IntegracoesSection, UsuariosPermissoesSection, NotificacoesSection, AssinaturaSection

### Feature Components by Module

| Module | Key Components | Pattern |
|--------|---------------|---------|
| **ai-agents** | AgentesIAManager, AgentesIACard (memo), BaseConhecimento, KnowledgeBaseSection, EnhancedAIChat | Manager + Card pattern |
| **automations** | FluxosManager, RegrasManager, FlowEditor, TriggerNode/ActionNode/ConditionNode/DelayNode (all memo) | Visual flow editor with React Flow |
| **billing** | (routes to configuracoes/plano) | Redirect pattern |
| **conexoes** | ConexoesManager, ConnectionDetailsDrawer (6 tab components), ConnectionLogsTab, ConnectionAlertasTab, ConnectionDiagnosticoTab | Drawer + tabs |
| **contatos** | ContatosTable | Table + drawer |
| **contracts** | ContratosManager, NovoContratoForm, DetalhesContrato, UploadContratos | CRUD + upload |
| **crm** | CRMDashboard, ContatosTable, FollowUpPanel (memo), LeadDetailPanel, FollowUpSequenceEditor | Complex CRM |
| **dashboard** | Dashboard, StatCard, SankeyChart, PrazosUrgentesWidget | Analytics |
| **departamentos** | DepartamentosManager, DepartamentoForm, MembrosSection | CRUD |
| **documentos** | DocumentosManager, UploadDocumentoForm | CRUD + upload |
| **equipe** | EquipeManager | Team management |
| **home** | HomePage | Greeting + quick stats + action cards |
| **honorarios** | HonorariosManager, NovoHonorarioForm | Legal fees |
| **leads** | LeadDrawer (complex), LeadDrawerNotas, LeadDrawerHistorico, LeadDrawerOperacional, ArquivadosView, ArquivarLeadDialog, LeadsPanel, LeadsKanban | Multi-panel drawer |
| **logs** | LogsPanel | Activity log viewer |
| **mission-control** | MissionControl | Admin system health |
| **notifications** | NotificationsPanel | Filtered notification list |
| **pipeline** | KanbanOperacional (DnD), KanbanCard (memo), KanbanColumn (memo), KanbanToolbar, PipelineJuridico (classic), PipelineCard (memo), PipelineColumn (memo) | Kanban with @hello-pangea/dnd |
| **prazos** | PrazosManager, PrazosDashboard, PrazosCalendario, NovoPrazoForm | Deadlines + calendar |
| **processos** | ProcessosManager, ProcessoDetalhes, NovoProcessoForm, EncerrarProcessoDialog | Legal case management |
| **reports** | RelatoriosGerenciais, MetricasOperacionais, ReportFilters, ReportChartPanel | Analytics + charts |
| **scheduling** | AgendamentosManager | Calendar + scheduling |
| **settings** | ConfiguracoesPage, IntegracoesConfig, StatusManager, StatusFormDialog, HorarioComercialSection, UsoSection | Settings hub |
| **suporte** | SuportePage, TicketDetailDialog | Support tickets |
| **tags** | TagsManager, TagForm, TagBadge | Tag CRUD |
| **tarefas** | TarefasPage, NovaTarefaForm, EditTarefaDialog | Task management |
| **timeline** | TimelineConversas | Conversation timeline |
| **users** | UsuariosManager | User management |
| **whatsapp** | WhatsAppIA, ConversationList (memo), MessageView (memo + virtual), ChatInput, WhatsAppSetup, WhatsAppKapsoSetup, WhatsAppErrorBoundary | Real-time chat |

---

## Design System Analysis

### shadcn/ui Usage (53 components)

All standard shadcn/ui primitives are present: accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip.

**Custom additions:**
- `password-strength.tsx` -- Password strength indicator with validation
- `skeletons.tsx` -- DashboardSkeleton, TableSkeleton, FormSkeleton presets
- `thinking-indicator.tsx` -- AI thinking animation
- `typing-text.tsx` -- Typewriter text effect

### Design Tokens (CSS Custom Properties)

**Light Theme ("LiderHub -- Clean White + Blue"):**
- Background: `#ffffff` (pure white)
- Foreground: `hsl(222, 47%, 11%)` (gray-900)
- Primary: `hsl(217, 91%, 60%)` (#3b82f6 blue-500)
- Destructive: `hsl(0, 84%, 60%)` (red)
- Success: `hsl(160, 84%, 39%)` (green)
- Warning: `hsl(38, 92%, 50%)` (amber)
- Border: `hsl(220, 13%, 91%)` (gray-200)
- Radius: `0.5rem` (8px)

**Dark Theme ("Lex Obsidian -- The Silent Authority"):**
- Background: `hsl(222, 55%, 10%)` (#0b1326 deep navy)
- Primary: `hsl(226, 93%, 55%)` (#2253f8)
- Card: `hsl(223, 38%, 15%)` (#171f33)
- Border: `hsl(231, 13%, 30%)` ("Ghost Border")

**Shadow System (4 levels):**
- `--shadow-card`: Subtle 1px border effect
- `--shadow-card-hover`: Light elevation on hover
- `--shadow-sm`: Minimal shadow
- `--shadow-md`: Medium elevation

**Status Colors (6 pipeline stages):**
- novo-lead (blue), qualificacao (amber), proposta (indigo), contrato (green), atendimento (cyan), arquivado (red)

### Custom CSS Classes (index.css @layer components)

| Class | Purpose |
|-------|---------|
| `.page-container` | Standard page wrapper: p-6, space-y-6, max-w-1920 |
| `.page-header` | Flex row for title + actions |
| `.page-title` | 2xl semibold foreground |
| `.page-subtitle` | sm muted-foreground |
| `.metric-card` | KPI card with border, shadow, hover |
| `.metric-value` | 3xl bold tabular-nums |
| `.metric-label` | xs uppercase muted |
| `.section-card` | Content section wrapper |
| `.status-dot` | 8px colored circle |
| `.scrollbar-thin` | Thin custom scrollbar |
| `.card-monolith` / `.card-hover` | Elevated card with hover shadow |
| `.btn-sharp` | Active scale-down button |

### Theming

- Theme toggle in TopBar via `ThemeToggle` component
- Class-based dark mode (`darkMode: ["class"]`)
- Persists to localStorage
- Respects system preference on first visit
- Dark theme overrides for legacy gray-* utility classes in index.css

### Typography

- **Font:** Inter (400, 600) loaded via Google Fonts with performance optimization (preconnect, preload, print-swap trick)
- **Headings:** Inter, semibold, tracking-tight, line-height 1.25
- **Body:** line-height 1.6, antialiased

### Icon System

- **Library:** Lucide React (consistent across all modules)
- **Size convention:** h-4 w-4 (inline), h-5 w-5 (nav), h-8 w-8 (empty states), h-12 w-12 (error states)
- No icon duplication or mixed icon libraries

---

## Routing & Navigation

### Route Structure

**Public routes (no auth):**
- `/auth` -- Login/signup
- `/auth/google/callback` -- OAuth callback
- `/reset-password` -- Password reset
- `/termos`, `/privacidade` -- Legal pages
- `/precos` -- Pricing page

**Protected routes (inside Layout):**
- `/` (index) -- HomePage
- `/dashboard` -- Dashboard analytics
- `/conexoes` -- WhatsApp connections (ProtectedRoute)
- `/whatsapp` -- Chat interface (WhatsAppErrorBoundary)
- `/crm` -- Contacts table
- `/crm/lead/:leadId` -- Lead detail
- `/pipeline` -- Kanban board
- `/pipeline/classico` -- Classic pipeline view
- `/agendamentos`, `/tarefas` -- Scheduling & tasks
- `/contratos`, `/processos`, `/prazos`, `/honorarios`, `/documentos` -- Legal modules
- `/agentes`, `/base-conhecimento`, `/fluxos`, `/regras` -- AI & automation (ProtectedRoute)
- `/configuracoes`, `/configuracoes/:section`, `/configuracoes/:section/:subsection` -- Settings hub
- `/notificacoes`, `/relatorios`, `/metricas` -- Reports & notifications
- `/equipe`, `/departamentos`, `/tags`, `/arquivados` -- Organization
- `/suporte` -- Support
- `/admin/*` -- Admin-only routes (playground, mission-control, status)

**Role-restricted routes:**
- `admin` + `manager`: usuarios, logs, auditoria, honorarios, equipe
- `admin` only: admin/playground, admin/mission-control, admin/status

**Redirects (legacy URL cleanup):**
- `/leads` -> `/pipeline`
- `/timeline` -> `/crm`
- `/planos` -> `/billing` -> `/configuracoes/plano`
- `/analytics` -> `/relatorios`
- `/painel-prazos` -> `/prazos?tab=painel`
- `/administracao` -> `/configuracoes`
- `/crm/followups` -> `/crm`

### Lazy Loading Strategy

All feature routes use `lazyWithRetry()`:
- **Retry logic:** Up to 3 retries with 1.5s interval
- **Deploy recovery:** After all retries fail, forces single page reload (via sessionStorage flag) to pick up new asset manifest
- **Tab visibility guard:** Only reloads if tab is visible (prevents browser-throttled false failures)

**Prefetch on idle:** 6 most-used routes prefetched via `requestIdleCallback` on non-native platforms:
- PipelineJuridico, AgendamentosManager, CRMDashboard, RelatoriosGerenciais, ProcessosManager, PrazosManager

### Navigation Components

**Sidebar:** Collapsible nav organized into sections:
- Flat items: Home, Dashboard, Conexoes, Tarefas, Configuracoes, Suporte
- Expandable sections: Atendimento (3 items), Automacoes (2 items), Juridico (4 items), Relatorios (2 items)
- RBAC filtering: items hidden based on user permissions
- Notification badge on sidebar
- User profile card at bottom with role label

**TopBar:** Fixed header with:
- Mobile hamburger (lg:hidden)
- Workspace selector (single workspace, "Mais workspaces" disabled)
- Search trigger (Ctrl+K)
- Theme toggle
- Notification bell with unread count badge
- User avatar dropdown (Minha Conta, Sair)

**Breadcrumbs:** Auto-generated from pathname, static (non-clickable). Hidden on home/root.

**Deep Links:** Capacitor deep link handler supports 30+ routes via `ALLOWED_DEEP_LINK_PATHS` whitelist.

---

## Forms & Validation

### Zod Schema Files (7)

| Schema | Fields | Notable Validations |
|--------|--------|-------------------|
| `leadSchema.ts` | 17 fields | Phone digit extraction, CPF/CNPJ, enum constraints, regex name validation |
| `processoSchema.ts` | 17 fields | CNJ format regex, enum types/phases/positions |
| `agenteSchema.ts` | Agent fields | Agent configuration |
| `documentoSchema.ts` | Document fields | Upload validation |
| `honorarioSchema.ts` | Fee fields | Currency validation |
| `prazoSchema.ts` | Deadline fields | Date constraints |
| `tarefaSchema.ts` | Task fields | Status/priority enums |

### Form Library Pattern

- **react-hook-form** + **@hookform/resolvers/zod** used in 15 form components
- shadcn/ui `<Form>` component wraps all forms
- `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` for consistent error display

### Form Component Locations (15 files with useForm)

- `src/components/forms/LeadForm.tsx`
- `src/components/configuracoes/PerfilSection.tsx`
- `src/components/configuracoes/EscritorioSection.tsx`
- `src/components/NovoContratoForm.tsx`
- `src/components/NovoAgendamentoForm.tsx`
- `src/features/departamentos/DepartamentoForm.tsx`
- `src/features/tarefas/NovaTarefaForm.tsx`
- `src/features/tarefas/EditTarefaDialog.tsx`
- `src/features/tags/TagForm.tsx`
- `src/features/documentos/components/UploadDocumentoForm.tsx`
- `src/features/honorarios/components/NovoHonorarioForm.tsx`
- `src/features/processos/components/NovoProcessoForm.tsx`
- `src/features/settings/sections/StatusFormDialog.tsx`
- `src/features/prazos/components/NovoPrazoForm.tsx`

### Draft Persistence

`useDraftPersistence` hook exists but is only used in 1 component (`NovoAgenteForm.tsx`). No other forms preserve draft state on unmount.

---

## State Management Patterns

### React Query (TanStack Query v5)

**Global configuration:**
```
retry: 2
retryDelay: exponential backoff (max MAX_RETRY_DELAY_MS)
refetchOnWindowFocus: false
staleTime: QUERY_STALE_TIME_MS
gcTime: QUERY_GC_TIME_MS
```

**68 domain hooks** in `src/hooks/` covering:
- CRUD: useLeads, useContratos, useProcessos, usePrazosProcessuais, useHonorarios, useDocumentosJuridicos, useTarefas, useAgendamentos, useAgentesIA
- CRM: useCRMActivities, useCRMPipeline, useCRMTags, useFollowUps, useFollowUpSequences, useLeadHistorico, useLeadNotas, useLeadScoring, useLeadTagsBatch
- System: useNotifications, useRealtimeNotifications, useRealtimeSync, useSystemHealth, useSystemSettings
- Analytics: useDashboardMetricsFast, useMRR, useAgentesMetrics, useAgendaMetrics, useResponseTime
- Config: useIntegracoesConfig, useApiKeys, useConexoes, useDepartamentos, useTeamMembers, useTags
- Infrastructure: useNetworkStatus, useNetworkBanner, useCapacitor, useBiometrics, usePushNotifications

### Realtime

`useRealtimeSync()` hook in Layout auto-invalidates React Query cache when Supabase Realtime events fire on core tables.

### Context

Single context: `AuthContext` providing `user`, `profile`, `loading`, `signIn`, `signUp`, `signOut`, `hasPermission`.

### Local State Patterns

- `useState` for UI toggles (drawers, dialogs, filters, search terms)
- `useDebounce` (300ms default) for search inputs
- `useMemo` for derived data (filtered lists, lookup maps)
- `useCallback` for event handlers in performance-critical components

---

## UI Consistency Audit

### Consistent Patterns

| Pattern | Consistency | Notes |
|---------|------------|-------|
| Page titles | HIGH | `usePageTitle()` used in all 30 feature managers (82 occurrences) |
| Loading (route level) | HIGH | `<Suspense fallback={<LoadingSpinner fullScreen />}>` on all routes |
| Error boundaries | HIGH | Every route wrapped in `<ErrorBoundary>` |
| Toast notifications | HIGH | `useToast()` used in 113 call sites across 30+ files |
| shadcn/ui Button | HIGH | Consistent variant usage (default, outline, ghost, destructive) |
| shadcn/ui Card | HIGH | Used in all feature pages |
| Skeleton loading | HIGH | 194 usages across 40 files |
| Debounced search | HIGH | `useDebounce(term, 300)` pattern in all searchable views |
| Confirm dialogs | HIGH | `ConfirmDialog` used for all destructive actions |

### Inconsistent Patterns

| Pattern | Issue | Files Affected |
|---------|-------|---------------|
| STATUS_COLORS definitions | Duplicated with different values in 8 files | ContatosTable, ProcessosManager, HonorariosManager, SuportePage, etc. |
| Color token usage | Mix of `hsl(var(--*))` (153 occurrences in features) and raw Tailwind colors (`text-gray-*`: 16, `text-white`: 38) | 12+ feature files use legacy gray-* |
| EmptyState component | Shared component exists but only used in 5/30 features | Most features have inline empty states |
| ErrorState component | Shared component exists but rarely used; most features have inline error handling | Custom error UIs in each feature |
| Page padding | Most use `p-6` but some use custom values | Inconsistent across features |
| Card header patterns | Some use CardHeader/CardTitle, others use custom divs | Mixed patterns |

---

## Responsiveness Analysis

### Breakpoints

| Breakpoint | Value | Usage |
|------------|-------|-------|
| `xs` | 475px | Custom (tailwind.config.ts) |
| `sm` | 640px | Default Tailwind |
| `md` | 768px | Default Tailwind, mobile breakpoint in `useIsMobile` |
| `lg` | 1024px | Sidebar show/hide breakpoint |
| `2xl` | 1400px | Container max-width |

### Mobile Support

- **Sidebar:** Slide-in drawer on mobile (lg:hidden), fixed sidebar on desktop
- **Menu overlay:** Dark backdrop with blur on mobile menu open
- **Body scroll lock:** Prevents background scroll when mobile menu is open
- **Escape key:** Closes mobile menu
- **Safe areas:** CSS env() variables for Capacitor native (notch, home indicator)
- **Android back button:** Handled via Capacitor listener (close menu -> navigate back -> exit app)
- **Search:** Hidden on small screens (sm:hidden for TopBar search trigger)
- **Main content:** `min-w-0` prevents overflow, `max-w-[1920px]` caps width

### Capacitor Native Support

- `useCapacitor()` hook detects native platform
- `usePushNotifications()` for native push
- `useBiometrics()` for biometric auth
- `useNativeShare()` for native sharing
- Safe area utilities: `.safe-top`, `.safe-bottom`, `.mobile-bottom-safe`
- `useLocalPrazosNotifications()` for local deadline notifications

### Gaps

- WhatsApp chat panel has mobile-specific show/hide logic but most feature pages do NOT have mobile-optimized layouts
- Tables (ContatosTable, ProcessosManager, etc.) use standard `<Table>` without horizontal scroll or responsive card views
- Calendar components may not render well on small screens
- KanbanOperacional columns may overflow horizontally without scroll container

---

## Accessibility (a11y) Audit

### Present

| Feature | Implementation |
|---------|---------------|
| ARIA labels | 64 instances across 37 files (buttons, toggles, alerts) |
| `role="alert"` | ErrorBoundary, ProtectedRoute access denied |
| `role="status"` | LoadingSpinner with `aria-busy="true"` |
| `role="listitem"` | Sidebar nav items |
| `aria-hidden="true"` | Mobile overlay backdrop |
| `sr-only` | Screen reader text in LoadingSpinner |
| Keyboard: Ctrl+K | Global search |
| Keyboard: Ctrl+D/L/A/P | Navigation shortcuts |
| Keyboard: Escape | Close mobile menu, close search |
| `lang="pt-BR"` | HTML element |
| Semantic HTML | `<header>`, `<main>`, `<nav>`, `<button>` used correctly |

### Missing

| Gap | Impact |
|-----|--------|
| Skip-to-content link | No way to skip sidebar/topbar navigation |
| Focus management on route change | Focus not moved to main content on navigation |
| Focus trap in modals | Relies on Radix (good), but custom modals (WhatsApp chat, AI assistant) may lack traps |
| `tabIndex` / `onKeyDown` | Only 8 occurrences total -- most interactive elements lack keyboard navigation |
| Color contrast | Status badges use light background colors that may fail WCAG AA on white cards |
| Form error announcements | Form errors displayed visually but not announced to screen readers via `aria-live` |
| Table sorting | No keyboard-accessible sort controls |
| Kanban drag-and-drop | @hello-pangea/dnd has a11y support but needs configuration |
| Alt text for avatars | AvatarFallback uses initials but no meaningful alt text |
| Reduced motion | No `prefers-reduced-motion` media query support |

---

## Loading, Error & Empty States

### Loading States

| Level | Component | Pattern |
|-------|-----------|---------|
| Route (full screen) | `LoadingSpinner` | Scale icon + pulse + spinner + text |
| Route (Suspense) | `LoadingSpinner fullScreen` | Lazy route fallback |
| Inline | `LoadingState` | Loader2 spinner + text |
| Skeleton (dashboard) | `DashboardSkeleton` | Cards + chart placeholders |
| Skeleton (table) | `TableSkeleton` | Row placeholders with avatar + text |
| Skeleton (form) | `FormSkeleton` | Label + input placeholders |
| Inline skeletons | `<Skeleton>` component | 194 usages across 40 files |

### Error States

| Level | Component | Pattern |
|-------|-----------|---------|
| App-level | `ErrorBoundary` (main.tsx) | Catches all unhandled errors |
| Route-level | `ErrorBoundary` per route | Prevents cascade, allows retry |
| WhatsApp-specific | `WhatsAppErrorBoundary` | Custom recovery for chat |
| Inline | `ErrorState` component | Card with retry button |
| Global JS errors | `window.addEventListener('error')` | Sentry capture |
| Unhandled rejections | `window.addEventListener('unhandledrejection')` | Sentry capture |
| Toast errors | `toast({ variant: "destructive" })` | Ephemeral error messages |
| User-facing messages | `toUserMessage()` sanitizer | Strips technical details |

### Empty States

| Component | Used In |
|-----------|---------|
| `EmptyState` (shared) | documentos, prazos, processos, honorarios, fluxos |
| Inline empty states | Most other features use custom inline empty UIs |

**Gap:** 25 features use ad-hoc empty state markup instead of the shared `EmptyState` component.

### Offline State

- `useNetworkStatus()` hook detects online/offline
- Red banner: "Sem conexao com a internet" (Layout)
- Green reconnection banner with animation
- `OfflineBanner` component in App.tsx for public routes
- Service worker provides cached responses when offline

---

## Performance UX

### Optimizations Present

| Technique | Implementation |
|-----------|---------------|
| Lazy loading | 47 routes via `lazyWithRetry()` |
| Prefetching | 6 key routes on `requestIdleCallback` |
| React.memo | 19 components memoized |
| Virtual scrolling | MessageView uses `@tanstack/react-virtual` |
| Debounced search | 300ms debounce on all search inputs |
| Query dedup | React Query prevents duplicate requests |
| Skeleton loading | Perceived speed via skeleton screens |
| Font optimization | Preconnect + preload + print-swap for Google Fonts |
| CSS animations | GPU-accelerated transforms (translateY, blur) |
| Bundle splitting | Calendar (268KB) + flow (164KB) isolated |

### Animations

| Animation | Duration | Easing |
|-----------|----------|--------|
| `fade-blur-in` | 0.45s | cubic-bezier(0.16, 1, 0.3, 1) |
| `slide-in-left` | 0.3s | cubic-bezier(0.16, 1, 0.3, 1) |
| `accordion-down/up` | 0.2s | ease-out |
| Sidebar mobile | 0.3s | ease-in-out |
| Theme toggle icons | 0.5s | CSS transition |
| Reconnection banner | built-in | animate-in fade-in |

### Gaps

- Only 1 component uses `@tanstack/react-virtual` (MessageView); long lists in other features (leads, contracts, processes) render all items
- React.memo in 19 files, but ContatosTable, ProcessosManager, ContratosManager, and other list-heavy pages lack memoization
- No `useDeferredValue` or `useTransition` usage for search filtering
- No image lazy loading or placeholder strategy (avatars use fallback initials)

---

## Key User Flows

### 1. Authentication Flow

1. `/auth` -- Login/Signup form with email/password
2. Password strength indicator on signup
3. LGPD consent checkbox required for registration
4. Email confirmation flow (pending state UI)
5. Biometric login on Capacitor native
6. Google OAuth via callback route
7. Forgot password dialog -> reset password page
8. On success, redirect to `/` (home)

### 2. Onboarding Flow

6-step checklist displayed as a floating card on home:
1. Configure profile
2. Configure office
3. Connect WhatsApp
4. Create first lead
5. Activate AI agent
6. Add team member

Progress bar with completion percentage. Auto-detects completed steps.

### 3. Lead Management Flow

1. `/crm` -- ContatosTable: search, filter, paginate leads
2. Click lead -> LeadDrawer: full detail panel with tabs (notes, history, operational)
3. `/pipeline` -- KanbanOperacional: drag-and-drop between columns
4. Group by: status, department, responsible, origin, priority, connection
5. `/crm/lead/:leadId` -- LeadDetailPanel: full-page detail view
6. Create lead: LeadForm dialog with Zod validation

### 4. Legal Process Flow

1. `/processos` -- ProcessosManager: list with search, status filter, type filter
2. Create: NovoProcessoForm with CNJ number validation
3. View: ProcessoDetalhes dialog
4. Close: EncerrarProcessoDialog with outcome selection
5. Delete: ConfirmDialog
6. Pagination: PaginationControls

### 5. Billing/Settings Flow

1. `/configuracoes` -- Settings hub with sidebar navigation
2. Groups: PERFIL (Minha Conta, Seguranca, Notificacoes), EMPRESA (Geral, Classes, Templates, Membros, Integracoes, Horario Comercial), COBRANCA (Plano, Uso)
3. Nested routing: `/configuracoes/:section/:subsection`
4. SubscriptionManager for plan management

---

## i18n Status

### Current State: ~3% Migrated

- **Framework:** react-i18next configured with single locale (`pt`)
- **Translation file:** `src/i18n/locales/pt.json` with ~58 keys (common, auth, errors, cookies sections)
- **Components using `useTranslation()`:** 4 shared components only (LoadingSpinner, GlobalSearch, ConfirmDialog, CookieBanner)
- **ErrorBoundary:** Uses `<Translation>` render prop for i18n

### Gap: Hardcoded Portuguese

~70+ occurrences of hardcoded Portuguese strings in feature modules:
- "Carregando...", "Erro ao carregar dados", "Nenhum resultado", "Salvar", "Cancelar", "Confirmar"
- All sidebar labels, page titles, form labels, status labels, toast messages
- All Zod validation error messages in schema files

### Recommendation

Full i18n migration needed if multi-language support is planned. The framework is in place but only covers the shared component layer.

---

## PWA Status

### Manifest

- `manifest.webmanifest` configured with standalone display, blue theme
- 7 icon sizes (48 to 512px) in WebP format with `any maskable` purpose
- Start URL: `/`

### Service Worker (`public/sw.js`)

- **Static assets:** CacheFirst strategy (30-day cache)
- **Google Fonts:** CacheFirst (365-day cache)
- **Supabase REST API:** NetworkFirst with 5-minute cache fallback
- **HTML navigation:** NetworkFirst (24-hour cache)
- **Edge Functions:** Excluded from caching (never cached)
- **Install:** Precaches `/` and `/index.html`

### Registration

- Production only (skipped in dev)
- Registered on `window.load` event
- Silent failure handling (app works without SW)

### Offline Support

- Network status detection via `useNetworkStatus()`
- Visual banners for offline/reconnection
- Cached API responses available offline (5-min stale)
- No explicit offline data mutation queue

---

## Debitos Tecnicos Identificados

### DEB-UX-001: STATUS_COLORS Duplication

| Campo | Valor |
|-------|-------|
| Area | Frontend/UX |
| Severidade | HIGH |
| Componente(s) | ContatosTable, ProcessosManager, HonorariosManager, SuportePage, CRM LeadDetailPanel, TicketDetailDialog, ProcessoDetalhes, constants.ts |
| Impacto UX | Inconsistent status badge colors across features; maintenance burden when adding new statuses |
| Esforco | 4 horas |
| Recomendacao | Extract all STATUS_COLORS into a single `src/constants/statusColors.ts` and import everywhere. Align with CSS custom property `--status-*` tokens defined in index.css. |

### DEB-UX-002: i18n Migration Incomplete (~97% Hardcoded)

| Campo | Valor |
|-------|-------|
| Area | Frontend/UX |
| Severidade | HIGH |
| Componente(s) | All 30 feature modules, 7 Zod schemas, sidebar labels, page titles |
| Impacto UX | Blocks multi-language support; inconsistent translation patterns |
| Esforco | 40 horas |
| Recomendacao | Expand pt.json with all feature-specific keys. Migrate features in phases: (1) shared components, (2) navigation labels, (3) form labels/errors, (4) feature-specific strings. |

### DEB-UX-003: EmptyState Component Underused

| Campo | Valor |
|-------|-------|
| Area | Frontend/UX |
| Severidade | MEDIUM |
| Componente(s) | 25+ feature pages with inline empty states |
| Impacto UX | Inconsistent empty state appearance; some features show raw text instead of structured empty state |
| Esforco | 8 horas |
| Recomendacao | Replace all inline empty state markup with the shared `EmptyState` component. Add feature-specific icons and CTAs. |

### DEB-UX-004: Limited Keyboard Navigation

| Campo | Valor |
|-------|-------|
| Area | Accessibility |
| Severidade | HIGH |
| Componente(s) | KanbanOperacional, ContatosTable, all feature tables, AI chat |
| Impacto UX | Power users cannot navigate efficiently; a11y compliance gap |
| Esforco | 16 horas |
| Recomendacao | Add keyboard navigation to: (1) tables (arrow keys for row selection), (2) kanban (arrow keys between columns/cards), (3) global keyboard shortcut help (? key), (4) skip-to-content link. |

### DEB-UX-005: Missing Skip-to-Content and Focus Management

| Campo | Valor |
|-------|-------|
| Area | Accessibility |
| Severidade | HIGH |
| Componente(s) | Layout.tsx, router |
| Impacto UX | Screen reader users must tab through entire sidebar on every page; no focus reset on navigation |
| Esforco | 4 horas |
| Recomendacao | Add `<a href="#main-content" className="sr-only focus:not-sr-only">` skip link. Set `id="main-content"` on `<main>`. Manage focus on route change via `useEffect` with `document.getElementById('main-content')?.focus()`. |

### DEB-UX-006: Tables Not Mobile-Responsive

| Campo | Valor |
|-------|-------|
| Area | Responsiveness |
| Severidade | MEDIUM |
| Componente(s) | ContatosTable, ProcessosManager, ContratosManager, HonorariosManager, EquipeManager, UsuariosManager |
| Impacto UX | Table columns overflow or get clipped on mobile; no card view alternative |
| Esforco | 20 horas |
| Recomendacao | Implement responsive table pattern: (1) horizontal scroll wrapper with `overflow-x-auto`, (2) optional card view for mobile using `useIsMobile()` hook, (3) hide non-essential columns on small screens. |

### DEB-UX-007: Draft Persistence Not Utilized

| Campo | Valor |
|-------|-------|
| Area | Frontend/UX |
| Severidade | MEDIUM |
| Componente(s) | All form components except NovoAgenteForm |
| Impacto UX | Users lose form data on accidental navigation, tab switch, or browser crash |
| Esforco | 8 horas |
| Recomendacao | Apply `useDraftPersistence` hook to all major forms: LeadForm, NovoContratoForm, NovoProcessoForm, NovoPrazoForm, NovoHonorarioForm. Auto-clear on successful submit. |

### DEB-UX-008: Missing React.memo on List Components

| Campo | Valor |
|-------|-------|
| Area | Performance |
| Severidade | MEDIUM |
| Componente(s) | ContatosTable rows, ProcessosManager cards, ContratosManager cards, NotificationsPanel items |
| Impacto UX | Re-renders on filter/search changes cause visible jank on large datasets |
| Esforco | 6 horas |
| Recomendacao | Extract row/card components and wrap with `React.memo`. Add `useCallback` for event handlers passed as props. Consider `@tanstack/react-virtual` for lists >100 items. |

### DEB-UX-009: Hardcoded Color Values vs. Design Tokens

| Campo | Valor |
|-------|-------|
| Area | Design System |
| Severidade | MEDIUM |
| Componente(s) | 12 feature files using `text-gray-*`/`bg-gray-*`, 20+ using `text-white` |
| Impacto UX | Dark mode may break in components using hardcoded colors instead of design tokens |
| Esforco | 8 horas |
| Recomendacao | Replace all `text-gray-*` with `text-foreground`/`text-muted-foreground`. Replace `bg-gray-*` with `bg-background`/`bg-muted`/`bg-card`. Replace `text-white` with `text-primary-foreground` where applicable. The index.css dark overrides with `!important` are a symptom of this issue. |

### DEB-UX-010: No prefers-reduced-motion Support

| Campo | Valor |
|-------|-------|
| Area | Accessibility |
| Severidade | LOW |
| Componente(s) | All animated components (fade-blur-in, slide-in, accordion, theme toggle) |
| Impacto UX | Users with vestibular disorders cannot disable animations |
| Esforco | 2 horas |
| Recomendacao | Add `@media (prefers-reduced-motion: reduce)` to disable or simplify all animations. Tailwind's `motion-reduce:` variant can be used. |

### DEB-UX-011: Breadcrumbs Not Interactive

| Campo | Valor |
|-------|-------|
| Area | Navigation |
| Severidade | LOW |
| Componente(s) | Breadcrumbs.tsx |
| Impacto UX | Users cannot click breadcrumb segments to navigate up the hierarchy |
| Esforco | 2 horas |
| Recomendacao | Wrap non-terminal breadcrumb segments in `<Link>` components with correct routes. Only the last segment should be static text. |

### DEB-UX-012: Inconsistent Error Handling Patterns

| Campo | Valor |
|-------|-------|
| Area | Frontend/UX |
| Severidade | LOW |
| Componente(s) | Feature pages |
| Impacto UX | Some pages show inline error with retry; others show toast only; some show neither |
| Esforco | 6 horas |
| Recomendacao | Standardize: use `ErrorState` component for page-level errors (with retry), `toast({ variant: "destructive" })` for action errors, `ErrorBoundary` for unexpected crashes. Document pattern in CONTRIBUTING.md. |

### DEB-UX-013: Missing Virtual Scrolling for Large Lists

| Campo | Valor |
|-------|-------|
| Area | Performance |
| Severidade | MEDIUM |
| Componente(s) | ContatosTable (all leads rendered), ArquivadosView, NotificationsPanel |
| Impacto UX | Rendering 500+ items causes visible performance degradation |
| Esforco | 12 horas |
| Recomendacao | Apply `@tanstack/react-virtual` to all list/table views that can exceed 100 items. MessageView already uses it as reference implementation. |

---

## Metricas

| Metric | Value |
|--------|-------|
| Total TSX/TS files | 512 |
| Feature modules | 30 |
| Shared components | 45 |
| shadcn/ui components | 53 |
| Feature components | 129 |
| Hooks | 68 |
| Zod schemas | 7 |
| Lazy-loaded routes | 47 |
| React.memo components | 19 |
| Forms with react-hook-form | 15 |
| i18n coverage | ~3% (4/130 component files) |
| ARIA attributes | 64 across 37 files |
| Toast call sites | 113 across 30+ files |
| Skeleton usages | 194 across 40 files |
| EmptyState usages | 5 features |
| ErrorBoundary wrappings | All routes + app-level |
| STATUS_COLORS duplications | 8 files |
| Hardcoded Portuguese in features | ~70+ occurrences |
| Keyboard shortcuts | 6 (Ctrl+K, Ctrl+D/L/A/P, Escape) |
| CSS custom properties (tokens) | ~50 |
| PWA icons | 7 sizes |
| Capacitor native hooks | 5 |

---

## Perguntas para @architect

1. **Multi-language priority:** Is i18n beyond Portuguese (English, Spanish) planned for v1.3+? This determines whether DEB-UX-002 is HIGH or CRITICAL priority.

2. **Mobile app strategy:** With Capacitor support already in place, is there a timeline for publishing to Play Store/App Store? This impacts mobile responsiveness priority (DEB-UX-006).

3. **Design system formalization:** Should we extract the design tokens into a separate package or Storybook for cross-team consistency?

4. **Virtual scrolling threshold:** What is the expected maximum dataset size per tenant? (leads, contracts, processes). This determines whether DEB-UX-013 is MEDIUM or HIGH.

5. **Accessibility compliance level:** Is WCAG 2.1 AA compliance a legal/contractual requirement for law firm clients? This would elevate DEB-UX-004, DEB-UX-005, and DEB-UX-010.

6. **Query key factory:** The memory notes mention query key factory as tech debt. Should this be prioritized alongside the UX debits for v1.3?

7. **Feature flags rollout:** `useFeatureFlag` exists but appears unused in feature modules. Are there planned features that should use progressive rollout?
