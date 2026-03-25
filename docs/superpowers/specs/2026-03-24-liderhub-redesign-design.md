# Jurify LíderHub Redesign — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Reference:** 32 screenshots from chat.liderhub.ai (C:\Users\User\Desktop\imagens para novo visual jurify\)

## 1. Objective

Transform Jurify's UI/UX to match the LíderHub platform structure, layout, and visual language. This is a comprehensive redesign covering navigation, pages, components, and a new customizable classification system — while preserving the existing React + Supabase + shadcn/ui + Tailwind stack and all backend logic.

## 2. New Sidebar Structure

Replace the current sidebar with the LíderHub navigation:

```
Logo + Workspace Selector (dropdown)
─────────────────────────────
Home                    (new)
Dashboard               (redesign)
Conexões                (new page)
Atendimento ▼
  Conversas             (redesign WhatsApp)
  Contatos              (redesign Leads)
  Kanban                (polish existing)
Automações ▼
  Agentes               (redesign existing)
  Base de Conhecimento  (new)
  Vozes                 (new)
Tarefas                 (new)
Configurações           (redesign)
Suporte                 (new)
Academy                 (external link)
─────────────────────────────
Indique Jurify (footer)
```

### Sidebar Visual Spec
- White background, no heavy shadows
- Hover: subtle gray highlight (`bg-gray-50`)
- Active item: blue text + blue left border
- Collapsible groups (Atendimento, Automações) with chevron
- Icons: Lucide outline style
- Bottom: referral CTA "Indique Jurify — Ganhe R$200 por indicação"

### Jurify-specific additions (inside "Sistema" or sub-menu)
- Processos, Prazos, Honorários, Documentos — existing legal modules stay accessible

## 3. Top Bar (Global Header)

```
[Logo] [Workspace: "ESCRITÓRIO X" ▼] .................. [🔍 Buscar... ⌘K] [Notifications 🔔] [Avatar]
```

- Workspace selector: dropdown to switch tenants (future multi-workspace)
- Search: existing GlobalSearch (Ctrl+K) — keep as-is
- Notifications bell with unread count badge
- Avatar with dropdown (Minha Conta, Sair)
- Breadcrumbs below top bar on inner pages (e.g., `Empresa > Classes > Status`)

## 4. Home Page (New)

Welcome/landing page with:
- Greeting: "Bom dia, [Nome]!"
- Quick stats row: Leads hoje, Conversas ativas, Tarefas pendentes, Agendamentos
- Quick actions: "+ Novo Lead", "+ Nova Conversa", "+ Nova Tarefa"
- Recent activity feed (últimas ações)

## 5. Dashboard (Redesign)

Based on LíderHub image 01:

### Cards Row (4 cards)
- Atendimentos Realizados (with sparkline)
- Em Andamento (with sparkline)
- Finalizados (with sparkline)
- Tempo Médio de Resposta (with sparkline)

### Charts
- **Evolução Temporal**: line chart, configurable period (7d/30d/90d)
- **Gráfico de Sankey**: lead flow from Origem → Status
- **Ranking Agentes**: existing table, polish visual

### Filters
- Date range picker (calendário)
- Origem dropdown
- Período (Dia/Semana/Mês/Trimestre)

## 6. Conexões Page (New)

WhatsApp instance management (images 02-08):

### Main View — Table
| Nome | Status | Número | Responsável Padrão | Departamento Padrão | Ações |
Statuses: Conectado (green badge), Desconectado (red badge)

### Detail Panel (slide-over or page)
4 tabs:
- **Geral**: nome, número, status, avatar
- **Logs**: activity log table
- **Configurações**: webhook URL, eventos, Classes Padrão (default status + dept for new leads)
- **Ações**: desconectar, reconectar (QR Code modal), deletar

### QR Code Flow
- Modal with QR code image + "Escaneie com WhatsApp" instruction
- Auto-detect connection, show success state

## 7. Atendimento — Conversas (Redesign)

Restructure WhatsApp page (images 09-13):

### Layout: 2-panel
- Left: conversation list (30-35% width)
- Right: chat area (65-70% width)

### Left Panel — Conversation List
- **Tabs**: IA | Ativos | Pendentes | Grupos (with count badges)
- **Filter bar**: Responsável dropdown, Status dropdown, "Mais filtros" button
- **Search**: inline search above list
- **Each item**: avatar, name, last message preview (truncated), timestamp, unread badge

### "Mais Filtros" Modal
- Classificação (status multi-select)
- Origem (multi-select)
- Período (date range)
- Avançado: Etiquetas, Departamento, Responsável

### Right Panel — Chat
- Header: contact name, phone, status badge, actions (assign, transfer, close)
- Messages: bubble layout (left=contact, right=agent)
- Input: text area + emoji picker + attachment + template selector + send

## 8. Atendimento — Contatos (Redesign)

Clean table replacing current Leads page (image 14):

### Table Columns
| Foto | Nome | Telefone | Responsável | Ticket | Status (badge) | Departamento | Tags |

### Features
- Column visibility toggle ("Colunas" dropdown)
- Search bar
- Pagination with "Itens por página" selector
- Click row → opens LeadDrawer (existing)
- Bulk actions: assign, change status, add tag

## 9. Atendimento — Kanban (Polish)

Enhance existing pipeline (images 15-17):

### Toolbar
- "Agrupar por" dropdown: Status | Responsável | Departamento (existing, keep)
- Search bar
- Filter toggles

### Column Headers
- Colored left border matching status color
- Column name + lead count
- Collapse/expand

### Cards
- Avatar + Name
- Phone number
- Last message preview
- Tags (colored chips)
- Priority indicator (if set)

## 10. Automações — Agentes (Redesign)

Enhance existing agents page (images 18-19):

### Agent List
- Table/card view with: Nome, Status (Ativo/Inativo toggle), Área Jurídica, Conexão WhatsApp

### Agent Editor
- **Prompt editor**: large textarea with @mentions support
- **Mentions**: @base_conhecimento, @calendario, @contatos
- **Configuration**: delay_resposta, max tokens, temperature
- **Toggle**: Ativo/Inativo

## 11. Automações — Base de Conhecimento (New)

RAG document management (image 20):

### Table
| Nome | Tipo (PDF/URL/Texto) | Status (Processado/Pendente) | Data | Tamanho | Ações |

### Upload Flow
- Drag & drop zone + file picker
- Supported: PDF, TXT, URL
- Processing status with progress indicator

### Database
- Uses existing `documentos_juridicos` table or new `knowledge_base` table
- Links to agent via `agente_id`

## 12. Automações — Vozes (New)

Voice configuration for agents:
- Voice selection (predefined voices)
- Tone configuration
- Preview/test

*Note: This is a UI placeholder — actual voice integration is future work.*

## 13. Tarefas (New Feature)

Task management (images 21-22):

### Table View
| Título | Prazo | PTS (Fibonacci) | Chat (linked) | Responsável | Criador | Status |

### "Nova Tarefa" Form
- Título (text)
- Descrição (textarea)
- Prazo (date picker)
- Pontos (Fibonacci: 1, 2, 3, 5, 8, 13)
- Responsável (member select)
- Chat vinculado (optional, link to conversation)
- Prioridade (baixa/média/alta/urgente)

### Database
New `tarefas` table:
```sql
id UUID PK
tenant_id UUID FK → tenants
titulo TEXT NOT NULL
descricao TEXT
prazo TIMESTAMPTZ
pontos INT (Fibonacci)
responsavel_id UUID FK → profiles
criador_id UUID FK → profiles
chat_id UUID FK → leads (optional)
status TEXT DEFAULT 'pendente' -- pendente, em_andamento, concluida
prioridade TEXT DEFAULT 'media'
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## 14. Configurações (Redesign)

Full restructure with left sub-navigation (images 23-32):

### Layout
- Left sub-nav (fixed, ~250px)
- Right content area

### Sub-nav Structure

**PERFIL**
- Minha Conta — name, email, avatar, phone
- Segurança — change password, 2FA (future)
- Notificações — toggles: Menções, Atribuições, Mudanças de Status, Novas Mensagens, Notificações do Sistema, Sons de Notificação

**EMPRESA**
- Geral — Logo, Workspace name, Escritório (nome comercial), Responsável, CNPJ, OAB, Endereço, Instagram, Facebook, Website
- Classes (expandable sub-menu):
  - Status — CRUD table with color, name, description, department, contacts count, follow-ups count
  - Etiquetas — CRUD table with color, name
  - Departamento — CRUD table with name, members count
  - Origem — CRUD table with name
  - Variáveis — template variables CRUD
- Templates — message templates CRUD
- Membros — table: Usuário (avatar+name+email), Cargo (badge), WhatsApp number + "Novo Membro"
- Integrações — cards: ZapSign, Google Calendar, Custom Tool, etc. with status
- Horário Comercial — toggle per day (Seg-Dom) + start/end time pickers + Ativo/Fechado badge

**COBRANÇA**
- Plano — current plan, "Alterar plano", "Cancelar assinatura", invoice history table, billing email, billing data (nome, CPF/CNPJ, endereço)
- Uso — limits dashboard (Membros X/Y, Agentes IA X/Y, Conexões WhatsApp X/Y, Workspaces X/Y, Vozes X/Y, Armazenamento X GB/Y GB) + credit consumption chart

## 15. Sistema de Classes (Core Feature)

The customizable classification system (image 26) — the heart of the redesign:

### Status Management
- **CRUD table**: color picker, name, description, linked department, contacts count, follow-ups count
- **Default statuses** (seeded per tenant): Recepção, Análise, Desqualificado, Qualificado, Proposta Recusada, Proposta Aceita, Assinatura Pendente, Contrato Assinado, Reunião, Desistência
- **Drag to reorder** (order column)
- Each status has a color dot (configurable)

### Database Changes
New `classes_status` table (or extend `crm_pipeline_stages`):
```sql
id UUID PK
tenant_id UUID FK
nome TEXT NOT NULL
slug TEXT NOT NULL
descricao TEXT
cor TEXT DEFAULT '#6366f1'
departamento_id UUID FK (optional)
ordem INT DEFAULT 0
ativo BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
UNIQUE(tenant_id, slug)
```

New `classes_etiquetas` table:
```sql
id UUID PK
tenant_id UUID FK
nome TEXT NOT NULL
cor TEXT DEFAULT '#3b82f6'
created_at TIMESTAMPTZ
UNIQUE(tenant_id, nome)
```

New `classes_origens` table:
```sql
id UUID PK
tenant_id UUID FK
nome TEXT NOT NULL
created_at TIMESTAMPTZ
UNIQUE(tenant_id, nome)
```

New `classes_variaveis` table:
```sql
id UUID PK
tenant_id UUID FK
chave TEXT NOT NULL
valor_padrao TEXT
descricao TEXT
created_at TIMESTAMPTZ
UNIQUE(tenant_id, chave)
```

### Impact
- Pipeline Kanban reads from `classes_status` instead of hardcoded `PIPELINE_STAGES`
- Lead status field references `classes_status.slug`
- Contatos table shows status badge with dynamic color from `classes_status.cor`
- Connection defaults reference `classes_status` and `departamentos`

## 16. Suporte Page (New)

Support tickets (image 32):

### Table
| Criação (avatar+name+date) | Workspace | Conteúdo | Status (badge) | Tipo | Detalhes (stars) | Ações |

### "Novo Ticket" Form
- Tipo: Dúvida, Bug, Sugestão, Outro
- Conteúdo (textarea)
- Prioridade

### Database
New `tickets_suporte` table:
```sql
id UUID PK
tenant_id UUID FK
criador_id UUID FK → profiles
tipo TEXT -- duvida, bug, sugestao, outro
conteudo TEXT
status TEXT DEFAULT 'aberto' -- aberto, em_andamento, fechado
avaliacao INT -- 1-5 stars
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## 17. Visual Design System

### Colors
- Primary: `#2563eb` (blue-600)
- Background: `#ffffff`
- Surface: `#ffffff` with `border-gray-200`
- Text primary: `#111827` (gray-900)
- Text secondary: `#6b7280` (gray-500)
- Sidebar bg: `#ffffff`
- Sidebar active: blue text + `border-l-2 border-blue-600`

### Component Patterns
- **Cards**: white bg, `border border-gray-200`, `rounded-lg`, no heavy shadows
- **Tables**: clean header (uppercase, text-xs, text-gray-500), hover row highlight
- **Badges**: pill shape, colored bg (green/red/blue/orange/purple)
- **Buttons**: primary blue, secondary gray outline
- **Forms**: label above input, subtle border, focus ring blue
- **Modals**: centered, backdrop blur, rounded-xl
- **Breadcrumbs**: `Section > Page` at top of content area

### Layout
- Sidebar: 220px fixed
- Top bar: 56px height
- Content: fluid, max-width for forms (~800px)
- Tables: full width with horizontal scroll on mobile

## 18. What Stays Unchanged

- **Tech stack**: React 18, TypeScript, Vite, Supabase, TanStack Query, shadcn/ui, Tailwind
- **Auth flow**: Supabase Auth, RBAC (useRBAC hook)
- **RLS**: all existing row-level security policies
- **Edge Functions**: all 27 existing functions
- **Legal modules**: Processos, Prazos, Honorários, Documentos (moved to sub-menu)
- **Contratos**: existing contracts feature (accessible via Atendimento or sub-menu)
- **Billing/Stripe**: existing integration
- **API integrations**: Evolution, ZapSign, Google Calendar, Sentry

## 19. Migration Strategy

1. **Phase 1 — Foundation**: New sidebar, top bar, breadcrumbs, visual system
2. **Phase 2 — Core Pages**: Home, Dashboard redesign, Configurações redesign
3. **Phase 3 — Atendimento**: Conversas, Contatos, Kanban polish
4. **Phase 4 — New Features**: Conexões, Tarefas, Base de Conhecimento, Classes system
5. **Phase 5 — Polish**: Suporte, Vozes, Uso/Consumo, Horário Comercial
6. **Phase 6 — Legal Modules Integration**: Reposition Processos/Prazos/Honorários/Documentos in new nav

## 20. Database Migrations Required

1. `tarefas` table
2. `classes_status` table (or migrate from `crm_pipeline_stages`)
3. `classes_etiquetas` table (or extend existing tags)
4. `classes_origens` table
5. `classes_variaveis` table
6. `tickets_suporte` table
7. `knowledge_base` table (for Base de Conhecimento)
8. `horario_comercial` table
9. Seed default statuses per existing tenant
