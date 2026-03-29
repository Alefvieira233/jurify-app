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
**Status:** Not Started (HomePage partially exists)
**Scope:** HomePage redesign, Dashboard with StatCards + SankeyChart, /home route
**Files:** HomePage.tsx, Dashboard.tsx, StatCard.tsx (new), SankeyChart.tsx (new), App.tsx
**Depends on:** Phase 1 (design tokens)
**Estimated tasks:** 2-3 atomic plans

## Phase 3: LíderHub Atendimento
**Status:** Not Started
**Scope:** WhatsAppIA tabs + filters, Contatos table, Kanban visual polish
**Files:** WhatsAppIA.tsx, ConversationFilters.tsx (new), ContatosTable.tsx (new), KanbanCard.tsx, KanbanColumn.tsx
**Depends on:** Phase 1 (design tokens)
**Estimated tasks:** 3 atomic plans

## Phase 4: LíderHub New Features (Tarefas, Classes, Suporte)
**Status:** Partially Done (TarefasPage, SuportePage exist)
**Scope:** DB migrations, hooks, schemas, enhance existing pages, Classes system
**Files:** tarefas migration, useTarefas.ts, TarefasPage.tsx, SuportePage.tsx, StatusManager.tsx
**Depends on:** Phase 1 (design tokens)
**Estimated tasks:** 2-3 atomic plans

## Phase 5: Kapso Backend Migration
**Status:** Planning Complete
**Goal:** Remove all Evolution API legacy code, rename types to Kapso, fix media upload path, update tests and DB constraint to finalize Kapso-only backend
**Scope:** Clean Evolution remnants from send-whatsapp-message, whatsapp-webhook; update integration tests; final DB migration; full verification sweep
**Files:** 6 Edge Functions + shared modules + DB migration + integration tests
**Depends on:** Nothing (independent of UI phases)
**Requirements:** [FR-13, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-1, NFR-2, NFR-6]
**Plans:** 3 plans

Plans:
- [ ] 05-01-PLAN.md — Clean Evolution legacy from webhook + sender, fix media upload
- [ ] 05-02-PLAN.md — Update integration tests to Kapso naming, final DB migration
- [ ] 05-03-PLAN.md — Verification sweep + full test suite validation

## Phase 6: Kapso Frontend + Conexões Redesign
**Status:** Not Started
**Scope:** ConexoesManager redesign, WhatsAppKapsoSetup, update hooks/types, CI/CD secrets migration
**Files:** ConexoesManager.tsx, ConnectionTypeChooser.tsx, QRCodeWizard.tsx, useConexoes.ts, CI workflows
**Depends on:** Phase 5 (backend must be migrated first)
**Estimated tasks:** 2-3 atomic plans

## Phase 7: LíderHub Routes + Final Integration
**Status:** Not Started
**Scope:** Wire all new routes in App.tsx, final sidebar nav, Conexões + Automações pages, testing + cleanup
**Files:** App.tsx, Sidebar.tsx, tests
**Depends on:** Phases 1-6
**Estimated tasks:** 2 atomic plans

---

## Parallelism Strategy
- **Phases 1-4** (UI) and **Phases 5-6** (Kapso) can run in parallel — they're independent
- Phase 7 is the integration phase that ties everything together
