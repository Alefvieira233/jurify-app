# Jurify — Roadmap

> Auto-generated | 2026-03-29

## Phase 1: LíderHub Visual Foundation
**Status:** Complete
**Goal:** Establish the visual foundation (design tokens, font, sidebar polish, TopBar dropdowns) that all subsequent UI phases build upon
**Scope:** Design tokens, Tailwind config, TopBar, Breadcrumbs, Sidebar restructure
**Files:** index.css, tailwind.config.ts, Sidebar.tsx, Layout.tsx, TopBar.tsx, Breadcrumbs.tsx, index.html
**Depends on:** Nothing
**Plans:** 2/2 plans executed

Plans:
- [x] 01-01-PLAN.md — Design tokens (accent neutral gray), Inter font, Sidebar polish, Breadcrumbs
- [x] 01-02-PLAN.md — TopBar workspace selector dropdown, avatar dropdown, accessibility

## Phase 2: LíderHub Dashboard + Home
**Status:** In Progress
**Goal:** Redesign HomePage with real data from hooks and enhance Dashboard with SankeyChart lead flow visualization
**Scope:** HomePage redesign, Dashboard with StatCards + SankeyChart, /home route
**Files:** HomePage.tsx, Dashboard.tsx, StatCard.tsx, SankeyChart.tsx (new), App.tsx
**Depends on:** Phase 1 (design tokens)
**Requirements:** [FR-5, FR-6, NFR-1, NFR-2]
**Plans:** 2/2 plans complete

Plans:
- [x] 02-01-PLAN.md — HomePage redesign with real data (useLeads, useTarefas, useAgendamentos) + StatCard enhancement
- [x] 02-02-PLAN.md — SankeyChart component + Dashboard integration

## Phase 3: LíderHub Atendimento
**Status:** Ready to execute
**Goal:** Wire WhatsAppIA advanced filters into real state, extract ContatosTable as standalone component, apply LíderHub token polish to Kanban
**Scope:** WhatsAppIA tabs + filters, Contatos table, Kanban visual polish
**Files:** WhatsAppIA.tsx, ConversationFilters.tsx (new), ContatosTable.tsx (new), KanbanCard.tsx, KanbanColumn.tsx
**Depends on:** Phase 1 (design tokens)
**Requirements:** [FR-7, FR-8, NFR-1, NFR-2]
**Plans:** 3/3 plans complete

Plans:
- [x] 03-01-PLAN.md — ConversationFilters component + wire WhatsAppIA filter state
- [x] 03-02-PLAN.md — ContatosTable standalone component
- [x] 03-03-PLAN.md — KanbanCard + KanbanColumn visual polish (design tokens)

## Phase 4: LíderHub New Features (Tarefas, Classes, Suporte)
**Status:** Ready to execute
**Goal:** Enhance existing Tarefas and Suporte pages with full CRUD operations, and replace hardcoded StatusManager with DB-backed Classes system
**Scope:** TarefasPage edit/delete/filter, SuportePage detail/status/rating, StatusManager CRUD via crm_pipeline_stages
**Files:** TarefasPage.tsx, EditTarefaDialog.tsx, SuportePage.tsx, TicketDetailDialog.tsx, StatusManager.tsx, StatusFormDialog.tsx, useStatusManager.ts, useTicketsSuporte.ts
**Depends on:** Phase 1 (design tokens)
**Requirements:** [FR-9, FR-10, FR-11, NFR-1, NFR-2]
**Plans:** 3/3 plans complete

Plans:
- [x] 04-01-PLAN.md — Tarefas: edit dialog, delete confirmation, priority filter, tests
- [x] 04-02-PLAN.md — Suporte: ticket detail dialog, status update, rating, type filter, tests
- [x] 04-03-PLAN.md — Classes/Status: useStatusManager hook, StatusFormDialog, DB-backed StatusManager, tests

## Phase 5: Kapso Backend Migration
**Status:** Complete
**Goal:** Remove all Evolution API legacy code, rename types to Kapso, fix media upload path, update tests and DB constraint to finalize Kapso-only backend
**Scope:** Clean Evolution remnants from send-whatsapp-message, whatsapp-webhook; update integration tests; final DB migration; full verification sweep
**Files:** 6 Edge Functions + shared modules + DB migration + integration tests
**Depends on:** Nothing (independent of UI phases)
**Requirements:** [FR-13, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-1, NFR-2, NFR-6]
**Plans:** 3/3 plans complete

Plans:
- [x] 05-01-PLAN.md — Clean Evolution legacy from webhook + sender, fix media upload
- [x] 05-02-PLAN.md — Update integration tests to Kapso naming, final DB migration
- [x] 05-03-PLAN.md — Verification sweep + full test suite validation

## Phase 6: Kapso Frontend + Conexoes Redesign
**Status:** Planning Complete
**Goal:** Remove legacy configuracoes_integracoes fallbacks from frontend, make hooks/components Kapso-native against conexoes_whatsapp table, add Kapso branding, and add test coverage for Conexoes feature
**Scope:** useConexoes cleanup, WhatsAppKapsoSetup migration, ConexoesManager polish, ConnectionTypeChooser branding, test coverage
**Files:** useConexoes.ts, WhatsAppKapsoSetup.tsx, ConexoesManager.tsx, ConnectionTypeChooser.tsx, ConnectionDetailsDrawer.tsx
**Depends on:** Phase 5 (backend must be migrated first)
**Requirements:** [FR-17, FR-18, FR-20, NFR-1, NFR-2]
**Plans:** 2/2 plans complete

Plans:
- [x] 06-01-PLAN.md — Remove legacy fallbacks, Kapso-only hooks/components, status badges, Kapso branding
- [x] 06-02-PLAN.md — Test coverage for ConexoesManager, ConnectionDetailsDrawer; update WhatsAppKapsoSetup tests

## Phase 7: LíderHub Routes + Final Integration
**Status:** Planning Complete
**Goal:** Wire all new sidebar nav sections (Jurídico, Relatórios), fix Tarefas route, add missing deep link paths, E2E smoke tests for all LíderHub routes, production build validation
**Scope:** Sidebar nav sections, App.tsx deep link set, E2E smoke spec, build gate
**Files:** App.tsx, Sidebar.tsx, e2e/liderhub-smoke.spec.ts
**Depends on:** Phases 1-6
**Requirements:** [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, NFR-1, NFR-2, NFR-3, NFR-4]
**Plans:** 1/2 plans executed

Plans:
- [x] 07-01-PLAN.md — Sidebar: add Jurídico + Relatórios sections, fix Tarefas leaf
- [ ] 07-02-PLAN.md — App.tsx deep links, E2E smoke spec, production build validation

---

## Parallelism Strategy
- **Phases 1-4** (UI) and **Phases 5-6** (Kapso) can run in parallel -- they're independent
- Phase 7 is the integration phase that ties everything together
