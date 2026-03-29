# Jurify — Roadmap

> Auto-generated | 2026-03-29

## Phase 1: LíderHub Visual Foundation
**Status:** Planning Complete
**Goal:** Establish the visual foundation (design tokens, font, sidebar polish, TopBar dropdowns) that all subsequent UI phases build upon
**Scope:** Design tokens, Tailwind config, TopBar, Breadcrumbs, Sidebar restructure
**Files:** index.css, tailwind.config.ts, Sidebar.tsx, Layout.tsx, TopBar.tsx, Breadcrumbs.tsx, index.html
**Depends on:** Nothing
**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — Design tokens (accent neutral gray), Inter font, Sidebar polish, Breadcrumbs
- [ ] 01-02-PLAN.md — TopBar workspace selector dropdown, avatar dropdown, accessibility

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
**Status:** Not Started (kapso-client.ts + kapso-manager already exist)
**Scope:** Replace Evolution API in send-whatsapp-message, whatsapp-webhook, health-check, process-prazos-alerts, media-processor
**Files:** 6 Edge Functions + shared modules + DB migration
**Depends on:** Nothing (independent of UI phases)
**Estimated tasks:** 3-4 atomic plans

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
