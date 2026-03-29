# Jurify — Requirements

> Auto-generated | 2026-03-29

## Functional Requirements

### LíderHub Redesign (Phases 1-4, 7)
- FR-1: New color palette (white/blue LíderHub aesthetic) via CSS custom properties
- FR-2: Restructured sidebar matching LíderHub navigation (collapsible groups, icons, referral CTA)
- FR-3: Global TopBar with workspace selector, search (Ctrl+K), notifications bell, avatar dropdown
- FR-4: Route-aware breadcrumbs on all inner pages
- FR-5: Redesigned Dashboard with StatCards (sparklines) and SankeyChart (lead flow)
- FR-6: New HomePage with greeting, stats summary, quick actions
- FR-7: WhatsAppIA with tab navigation (IA/Ativos/Pendentes/Grupos) and advanced filters
- FR-8: New ContatosTable replacing CRM Dashboard
- FR-9: Tarefas module with CRUD, Zod validation, RLS
- FR-10: Enhanced Classes/Status system
- FR-11: Suporte tickets module with CRUD
- FR-12: Base de Conhecimento page for RAG documents

### Kapso Migration (Phases 5-6)
- FR-13: Replace all Evolution API calls with Kapso Cloud API
- FR-14: Normalize Kapso webhook events to existing message schema
- FR-15: Update media download/upload for Kapso URLs
- FR-16: Kapso health check endpoint
- FR-17: Conexões page redesign (table + detail drawer with 4 tabs)
- FR-18: WhatsApp setup flow updated for Kapso
- FR-19: DB migration (evolution references → kapso)
- FR-20: CI/CD secrets migration (EVOLUTION_* → KAPSO_*)

## Non-Functional Requirements
- NFR-1: All 1009+ existing tests must keep passing
- NFR-2: Zero TypeScript errors, zero lint warnings
- NFR-3: Bundle size under 4MB
- NFR-4: RBAC and RLS unchanged
- NFR-5: Atomic git commits per task
- NFR-6: No breaking changes to existing Edge Function contracts
