# LíderHub Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Jurify's UI/UX to match the LíderHub platform — clean white/blue aesthetic, restructured navigation, and new features (Tarefas, Classes system, Suporte).

**Architecture:** Incremental redesign in 6 phases. Phase 1 (visual foundation) propagates through all pages. Each subsequent phase builds one feature area. Existing backend, RBAC, and Edge Functions are untouched — this is a frontend + database schema effort.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + RLS), TanStack React Query, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-liderhub-redesign-design.md`

---

## File Structure Overview

### Phase 1 — Visual Foundation
- Modify: `src/index.css` — new design tokens (white/blue LíderHub palette)
- Modify: `tailwind.config.ts` — update primary color, remove dark obsidian overrides
- Modify: `src/components/Sidebar.tsx` — restructure nav entries, visual polish
- Modify: `src/components/Layout.tsx` — new top bar with workspace selector + breadcrumbs
- Create: `src/components/TopBar.tsx` — extracted top bar component
- Create: `src/components/Breadcrumbs.tsx` — route-aware breadcrumbs

### Phase 2 — Dashboard + Home
- Create: `src/features/home/HomePage.tsx` — welcome page with greeting, stats, quick actions
- Modify: `src/features/dashboard/Dashboard.tsx` — redesign with status cards + charts
- Create: `src/features/dashboard/components/StatCard.tsx` — sparkline stat card
- Create: `src/features/dashboard/components/SankeyChart.tsx` — lead flow chart
- Modify: `src/App.tsx` — add /home route, make / point to HomePage

### Phase 3 — Atendimento (Conversas, Contatos, Kanban)
- Modify: `src/features/whatsapp/WhatsAppIA.tsx` — add tabs (IA/Ativos/Pendentes/Grupos), filter bar
- Create: `src/features/whatsapp/ConversationFilters.tsx` — advanced filters modal
- Modify: `src/features/crm/CRMDashboard.tsx` — replace with clean Contatos table
- Create: `src/features/contatos/ContatosTable.tsx` — LíderHub-style table with column toggle
- Modify: `src/features/pipeline/KanbanCard.tsx` — visual polish (avatar, phone, tags)
- Modify: `src/features/pipeline/KanbanColumn.tsx` — colored headers

### Phase 4 — New Features (Tarefas, Classes, Suporte)
- Create: `supabase/migrations/20260324000001_create_tarefas.sql` — tarefas table
- Create: `src/hooks/useTarefas.ts` — CRUD hook
- Create: `src/schemas/tarefaSchema.ts` — Zod validation
- Create: `src/features/tarefas/TarefasPage.tsx` — table view
- Create: `src/features/tarefas/NovaTarefaForm.tsx` — creation form
- Modify: `src/features/settings/sections/StatusManager.tsx` — enhance to full Classes system
- Create: `src/features/suporte/SuportePage.tsx` — tickets table + form
- Create: `supabase/migrations/20260324000002_create_tickets_suporte.sql`
- Create: `src/hooks/useTicketsSuporte.ts`

### Phase 5 — Conexões + Automações
- Create: `src/features/conexoes/ConexoesPage.tsx` — instance table + detail panel
- Create: `src/features/conexoes/ConexaoDetail.tsx` — 4-tab detail (Geral/Logs/Config/Ações)
- Modify: `src/features/agentes/` — visual redesign, prompt editor
- Create: `src/features/base-conhecimento/BaseConhecimentoPage.tsx` — RAG docs table

### Phase 6 — Routes + Final Integration
- Modify: `src/App.tsx` — all new routes wired
- Modify: `src/components/Sidebar.tsx` — final nav entries
- Tests + cleanup

---

## Phase 1: Visual Foundation

### Task 1: Update Design Tokens & Tailwind Config

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Update CSS custom properties for LíderHub palette**

In `src/index.css`, update the `:root` (light mode) variables to match LíderHub's clean white/blue:

```css
:root {
  --background: 0 0% 100%;           /* pure white */
  --foreground: 222 47% 11%;         /* gray-900 */
  --card: 0 0% 100%;                 /* white */
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  --primary: 217 91% 60%;            /* blue-500 (#3b82f6) */
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 96%;          /* gray-100 */
  --secondary-foreground: 222 47% 11%;
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;    /* gray-500 */
  --accent: 220 14% 96%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 13% 91%;             /* gray-200 */
  --input: 220 13% 91%;
  --ring: 217 91% 60%;               /* blue-500 */
  --radius: 0.5rem;
  --sidebar-background: 0 0% 100%;   /* white sidebar */
  --sidebar-foreground: 220 9% 46%;
  --sidebar-border: 220 13% 91%;
  --sidebar-accent: 217 91% 97%;     /* blue-50 hover */
  --sidebar-accent-foreground: 217 91% 60%;
}
```

- [ ] **Step 2: Simplify dark mode (optional — keep but de-emphasize)**

Keep the `.dark` block but don't modify it now. LíderHub is light-mode-first.

- [ ] **Step 3: Update tailwind.config.ts primary color**

```typescript
// In extend.colors:
primary: {
  DEFAULT: "hsl(var(--primary))",
  foreground: "hsl(var(--primary-foreground))",
},
```

Ensure `fontFamily.sans` uses `['Inter', ...defaultTheme.fontFamily.sans]`.

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/index.css tailwind.config.ts
git commit -m "style: update design tokens to LíderHub white/blue palette"
```

### Task 2: Create TopBar Component

**Files:**
- Create: `src/components/TopBar.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Create TopBar.tsx**

```tsx
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials, getAvatarHex } from '@/utils/formatting';
import ThemeToggle from '@/components/ThemeToggle';

interface TopBarProps {
  onMenuToggle: () => void;
  onSearchOpen: () => void;
}

export default function TopBar({ onMenuToggle, onSearchOpen }: TopBarProps) {
  const { profile } = useAuth();
  const { unreadCount } = useRealtimeNotifications();
  const tenantName = profile?.tenant_id ? 'Escritório' : 'Jurify';

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 gap-3 shrink-0">
      {/* Mobile hamburger */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo + workspace */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-primary">Jurify</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {tenantName}
        </span>
      </div>

      <div className="flex-1" />

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 w-56 justify-start"
        onClick={onSearchOpen}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar...</span>
        <kbd className="ml-auto text-[10px] font-mono bg-muted px-1 py-0.5 rounded">
          ⌘K
        </kbd>
      </Button>

      <ThemeToggle />

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Avatar */}
      <Avatar className="h-8 w-8 cursor-pointer">
        <AvatarFallback
          style={{ backgroundColor: getAvatarHex(profile?.nome_completo || 'U') }}
          className="text-white text-xs font-medium"
        >
          {getInitials(profile?.nome_completo)}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
```

- [ ] **Step 2: Integrate TopBar into Layout.tsx**

Replace the current mobile header in `Layout.tsx` with `<TopBar />`. The TopBar renders on all screen sizes. Remove the inline header JSX from Layout.

Key changes to Layout.tsx:
- Import TopBar
- Replace the `{/* Mobile header */}` block with `<TopBar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} onSearchOpen={() => {/* GlobalSearch handles Ctrl+K */}} />`
- Move GlobalSearch trigger to work with TopBar's search button
- Keep existing hooks (useRealtimeSync, usePushNotifications, etc.)

- [ ] **Step 3: Verify it renders**

Run: `npm run dev`
Check: Top bar shows logo, search, bell, avatar on both mobile and desktop

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.tsx src/components/Layout.tsx
git commit -m "feat: add LíderHub-style TopBar with search, notifications, avatar"
```

### Task 3: Create Breadcrumbs Component

**Files:**
- Create: `src/components/Breadcrumbs.tsx`

- [ ] **Step 1: Create route-aware Breadcrumbs**

```tsx
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Home',
  dashboard: 'Dashboard',
  whatsapp: 'Conversas',
  crm: 'Contatos',
  pipeline: 'Kanban',
  agentes: 'Agentes',
  agendamentos: 'Tarefas',
  contratos: 'Contratos',
  configuracoes: 'Configurações',
  conexoes: 'Conexões',
  processos: 'Processos',
  prazos: 'Prazos',
  honorarios: 'Honorários',
  documentos: 'Documentos',
  suporte: 'Suporte',
  'base-conhecimento': 'Base de Conhecimento',
  notificacoes: 'Notificações',
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map(seg => ROUTE_LABELS[seg] || seg);

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-2 px-1">
      {crumbs.map((crumb, i) => (
        <span key={`${crumb}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
          <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>
            {crumb}
          </span>
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Breadcrumbs.tsx
git commit -m "feat: add route-aware Breadcrumbs component"
```

### Task 4: Restructure Sidebar Navigation

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Update MAIN_NAV to match LíderHub exactly**

Replace the current `MAIN_NAV` array with:

```typescript
import {
  Home, LayoutDashboard, Link2, MessageSquare, MessageCircle,
  Users, KanbanSquare, Bot, BookOpen, Mic, CheckSquare,
  Settings, HelpCircle, GraduationCap, Gift,
} from 'lucide-react';

const MAIN_NAV: NavEntry[] = [
  { kind: 'leaf', id: 'home',       label: 'Home',        icon: Home,            resource: 'dashboard',   action: 'read' },
  { kind: 'leaf', id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, resource: 'dashboard',   action: 'read' },
  { kind: 'leaf', id: 'conexoes',   label: 'Conexões',    icon: Link2,           resource: 'conexoes',    action: 'read' },
  {
    kind: 'section',
    id: 'atendimento',
    label: 'Atendimento',
    icon: MessageSquare,
    children: [
      { id: 'whatsapp',  label: 'Conversas', icon: MessageCircle, resource: 'whatsapp', action: 'read' },
      { id: 'crm',       label: 'Contatos',  icon: Users,         resource: 'leads',    action: 'read' },
      { id: 'pipeline',  label: 'Kanban',    icon: KanbanSquare,  resource: 'leads',    action: 'read' },
    ],
  },
  {
    kind: 'section',
    id: 'automacoes',
    label: 'Automações',
    icon: Bot,
    children: [
      { id: 'agentes',           label: 'Agentes',              icon: Bot,      resource: 'agentes_ia', action: 'read' },
      { id: 'base-conhecimento', label: 'Base de Conhecimento', icon: BookOpen, resource: 'agentes_ia', action: 'read' },
      { id: 'vozes',             label: 'Vozes',                icon: Mic,      resource: 'agentes_ia', action: 'read' },
    ],
  },
  { kind: 'leaf', id: 'agendamentos',  label: 'Tarefas',        icon: CheckSquare, resource: 'agendamentos', action: 'read' },
  { kind: 'leaf', id: 'configuracoes', label: 'Configurações',  icon: Settings,    resource: 'configuracoes', action: 'read' },
  { kind: 'leaf', id: 'suporte',       label: 'Suporte',        icon: HelpCircle,  resource: 'dashboard',     action: 'read' },
];
```

- [ ] **Step 2: Update sidebar visual styling**

Change the sidebar container classes:
- Background: `bg-background` (white)
- Border: `border-r border-border`
- Active item: `text-primary font-medium border-l-2 border-primary bg-primary/5`
- Hover: `hover:bg-accent`
- Width: `w-[220px]`

- [ ] **Step 3: Add footer referral CTA**

At the bottom of sidebar, add:

```tsx
<div className="mt-auto border-t border-border p-3">
  <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full">
    <Gift className="h-3.5 w-3.5" />
    <div>
      <div className="font-medium text-foreground">Indique Jurify</div>
      <div className="text-[10px]">Ganhe R$200 por indicação</div>
    </div>
  </button>
</div>
```

- [ ] **Step 4: Verify sidebar renders with new structure**

Run: `npm run dev`
Check: Sidebar matches LíderHub layout — Home, Dashboard, Conexões, Atendimento▼, Automações▼, Tarefas, Configurações, Suporte

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: restructure sidebar to LíderHub navigation pattern"
```

### Task 5: Visual polish — remove heavy shadows, clean borders

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Simplify shadow system**

In `src/index.css`, remove or simplify the heavy shadow definitions. Replace with subtle borders:

```css
/* Replace heavy shadows with clean LíderHub style */
.shadow-card { box-shadow: none; border: 1px solid hsl(var(--border)); }
.shadow-card-hover { box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
```

- [ ] **Step 2: Verify no visual regressions**

Run: `npm run dev`
Check multiple pages for border/shadow consistency

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: simplify shadows to LíderHub clean border aesthetic"
```

---

## Phase 2: Dashboard + Home Page

### Task 6: Create Home Page

**Files:**
- Create: `src/features/home/HomePage.tsx`
- Modify: `src/App.tsx` — add route

- [ ] **Step 1: Create HomePage component**

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeads } from '@/hooks/useLeads';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, CheckSquare, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  usePageTitle('Home');
  const { profile } = useAuth();
  const { leads } = useLeads();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const leadsHoje = leads?.filter(l => {
    const today = new Date().toISOString().split('T')[0];
    return l.created_at?.startsWith(today);
  }).length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {greeting()}, {profile?.nome_completo?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aqui está o resumo do seu dia.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Leads hoje', value: leadsHoje, color: 'text-blue-600' },
          { label: 'Conversas ativas', value: '—', color: 'text-green-600' },
          { label: 'Tarefas pendentes', value: '—', color: 'text-amber-600' },
          { label: 'Agendamentos', value: '—', color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-lg p-4 bg-background">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => navigate('/crm')}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Lead
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/whatsapp')}>
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Nova Conversa
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/agendamentos')}>
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> Nova Tarefa
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/agendamentos')}>
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Agendar
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add /home route in App.tsx**

Add lazy import and route:
```tsx
const HomePage = lazyWithRetry(() => import('@/features/home/HomePage'));

// In routes:
<Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
```

Change the default `/` route to render HomePage instead of Dashboard. Move Dashboard to `/dashboard`.

- [ ] **Step 3: Verify Home page renders**

Run: `npm run dev`
Navigate to `/` — should show greeting + quick stats + actions

- [ ] **Step 4: Commit**

```bash
git add src/features/home/HomePage.tsx src/App.tsx
git commit -m "feat: add LíderHub Home page with greeting, stats, quick actions"
```

### Task 7: Redesign Dashboard with StatCards

**Files:**
- Create: `src/features/dashboard/components/StatCard.tsx`
- Modify: `src/features/dashboard/Dashboard.tsx`

- [ ] **Step 1: Create StatCard component**

```tsx
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, change, changeType = 'neutral', icon }: StatCardProps) {
  return (
    <div className="border border-border rounded-lg p-5 bg-background">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {change && (
        <div className={cn(
          'text-xs mt-1',
          changeType === 'positive' && 'text-green-600',
          changeType === 'negative' && 'text-red-600',
          changeType === 'neutral' && 'text-muted-foreground',
        )}>
          {change}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Redesign Dashboard.tsx main layout**

Replace current AI tools grid with LíderHub-style dashboard:
- 4 StatCards at top (Atendimentos Realizados, Em Andamento, Finalizados, Tempo Médio)
- Evolução Temporal line chart below (use recharts, already likely installed)
- RankingAgentesTable at bottom

Key queries:
- Total leads (this period)
- Leads by status count
- Average response time from agentes_ia

- [ ] **Step 3: Verify dashboard renders with new layout**

Run: `npm run dev`
Navigate to `/dashboard`

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/components/StatCard.tsx src/features/dashboard/Dashboard.tsx
git commit -m "feat: redesign Dashboard with LíderHub StatCards layout"
```

---

## Phase 3: Atendimento (Conversas, Contatos, Kanban)

### Task 8: Add conversation tabs to WhatsApp page

**Files:**
- Modify: `src/features/whatsapp/WhatsAppIA.tsx`

- [ ] **Step 1: Add tab system at top of conversation list**

Add tabs: `IA | Ativos | Pendentes | Grupos` using shadcn Tabs component.
Each tab filters conversations by a `tipo` or `status` field.

```tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// In the conversation list header:
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="w-full">
    <TabsTrigger value="todos" className="flex-1 text-xs">Todos</TabsTrigger>
    <TabsTrigger value="ia" className="flex-1 text-xs">IA</TabsTrigger>
    <TabsTrigger value="ativos" className="flex-1 text-xs">Ativos</TabsTrigger>
    <TabsTrigger value="pendentes" className="flex-1 text-xs">Pendentes</TabsTrigger>
  </TabsList>
</Tabs>
```

- [ ] **Step 2: Add filter bar (Responsável, Status, Mais Filtros)**

Below tabs, add a row of filter dropdowns using shadcn Select components.

- [ ] **Step 3: Verify**

Run: `npm run dev`, navigate to `/whatsapp`

- [ ] **Step 4: Commit**

```bash
git add src/features/whatsapp/WhatsAppIA.tsx
git commit -m "feat: add conversation tabs and filters to WhatsApp page"
```

### Task 9: Redesign Contatos page as clean table

**Files:**
- Create: `src/features/contatos/ContatosTable.tsx`
- Modify: `src/features/crm/CRMDashboard.tsx` — simplify to use ContatosTable

- [ ] **Step 1: Create ContatosTable with column toggle**

Build a clean data table with columns: Foto | Nome | Telefone | Responsável | Status (badge) | Departamento | Tags

Use shadcn Table components. Add:
- Search input at top
- "Colunas" dropdown (Popover with checkboxes to toggle column visibility)
- Pagination ("Itens por página" selector)

```tsx
import { useState, useMemo } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { getInitials, getAvatarHex } from '@/utils/formatting';
import { usePageTitle } from '@/hooks/usePageTitle';

// ... full table implementation with pagination, search, column toggle
```

- [ ] **Step 2: Update CRM route to render ContatosTable**

In `CRMDashboard.tsx` or update the `/crm` route in App.tsx to point to the new `ContatosTable`.

- [ ] **Step 3: Verify table renders with real lead data**

Run: `npm run dev`, navigate to `/crm`

- [ ] **Step 4: Commit**

```bash
git add src/features/contatos/ContatosTable.tsx src/features/crm/CRMDashboard.tsx
git commit -m "feat: replace CRM dashboard with LíderHub-style Contatos table"
```

### Task 10: Polish Kanban cards and columns

**Files:**
- Modify: `src/features/pipeline/KanbanCard.tsx`
- Modify: `src/features/pipeline/KanbanColumn.tsx`

- [ ] **Step 1: Update KanbanCard with avatar, phone, message preview, tags**

Ensure card shows:
- Avatar with initials (left)
- Name + phone below
- Tags as colored chips
- Clean white card with subtle border

- [ ] **Step 2: Update KanbanColumn headers**

Add colored left border to column header matching stage color from `pipelineConfig.ts`. Show lead count badge.

- [ ] **Step 3: Verify**

Run: `npm run dev`, navigate to `/pipeline`

- [ ] **Step 4: Commit**

```bash
git add src/features/pipeline/KanbanCard.tsx src/features/pipeline/KanbanColumn.tsx
git commit -m "style: polish Kanban cards and columns to LíderHub visual"
```

---

## Phase 4: New Features (Tarefas, Suporte)

### Task 11: Create Tarefas database migration

**Files:**
- Create: `supabase/migrations/20260324000001_create_tarefas.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- Tarefas (Task Management)
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prazo TIMESTAMPTZ,
  pontos INT CHECK (pontos IN (1, 2, 3, 5, 8, 13)),
  responsavel_id UUID REFERENCES profiles(id),
  criador_id UUID NOT NULL REFERENCES profiles(id),
  lead_id UUID REFERENCES leads(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON tarefas
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tarefas" ON tarefas
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant tarefas" ON tarefas
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own tenant tarefas" ON tarefas
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_tarefas_tenant ON tarefas(tenant_id);
CREATE INDEX idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX idx_tarefas_status ON tarefas(tenant_id, status);
```

- [ ] **Step 2: Commit migration**

```bash
git add supabase/migrations/20260324000001_create_tarefas.sql
git commit -m "feat: add tarefas table migration with RLS"
```

### Task 12: Create useTarefas hook + schema

**Files:**
- Create: `src/hooks/useTarefas.ts`
- Create: `src/schemas/tarefaSchema.ts`

- [ ] **Step 1: Create Zod schema**

```typescript
import { z } from 'zod';

export const tarefaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(200),
  descricao: z.string().max(2000).optional(),
  prazo: z.string().optional(),
  pontos: z.number().refine(v => [1, 2, 3, 5, 8, 13].includes(v), 'Pontos devem ser Fibonacci').optional(),
  responsavel_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
});

export type TarefaFormData = z.infer<typeof tarefaSchema>;
```

- [ ] **Step 2: Create useTarefas hook**

Follow the pattern of `useAgendamentos.ts`:
- `useQuery` for fetching tarefas with tenant filter
- `useMutation` for create/update/delete
- Query invalidation on mutations

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Tarefa {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  pontos: number | null;
  responsavel_id: string | null;
  criador_id: string;
  lead_id: string | null;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  created_at: string;
  updated_at: string;
}

export function useTarefas() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: tarefas, isLoading } = useQuery({
    queryKey: ['tarefas', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Tarefa[];
    },
  });

  const createTarefa = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from('tarefas').insert({
        ...values,
        tenant_id: tenantId,
        criador_id: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tarefas'] });
      toast({ title: 'Tarefa criada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
    },
  });

  const updateTarefa = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from('tarefas').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tarefas'] });
    },
  });

  const deleteTarefa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tarefas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tarefas'] });
      toast({ title: 'Tarefa removida' });
    },
  });

  return { tarefas: tarefas ?? [], isLoading, createTarefa, updateTarefa, deleteTarefa };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/schemas/tarefaSchema.ts src/hooks/useTarefas.ts
git commit -m "feat: add tarefaSchema + useTarefas hook"
```

### Task 13: Create TarefasPage UI

**Files:**
- Create: `src/features/tarefas/TarefasPage.tsx`
- Create: `src/features/tarefas/NovaTarefaForm.tsx`
- Modify: `src/App.tsx` — add /tarefas route

- [ ] **Step 1: Create NovaTarefaForm**

Dialog/Sheet form with fields: Título, Descrição, Prazo (date picker), Pontos (select: 1,2,3,5,8,13), Responsável (member select), Prioridade (select), Lead vinculado (optional).

Use `react-hook-form` + `zodResolver(tarefaSchema)`.

- [ ] **Step 2: Create TarefasPage with table**

Table columns: Título | Prazo | PTS | Responsável | Status (badge) | Prioridade | Ações

Include:
- "+ Nova Tarefa" button (top right, blue)
- Search input
- Status filter dropdown
- Pagination

- [ ] **Step 3: Add route in App.tsx**

```tsx
const TarefasPage = lazyWithRetry(() => import('@/features/tarefas/TarefasPage'));

<Route path="/tarefas" element={<ProtectedRoute><TarefasPage /></ProtectedRoute>} />
```

Also update sidebar's "Tarefas" to point to `/tarefas` instead of `/agendamentos`.

- [ ] **Step 4: Verify**

Run: `npm run dev`, navigate to `/tarefas`

- [ ] **Step 5: Commit**

```bash
git add src/features/tarefas/ src/App.tsx
git commit -m "feat: add Tarefas page with table, form, and Fibonacci points"
```

### Task 14: Create Suporte (Tickets) feature

**Files:**
- Create: `supabase/migrations/20260324000002_create_tickets_suporte.sql`
- Create: `src/hooks/useTicketsSuporte.ts`
- Create: `src/features/suporte/SuportePage.tsx`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE IF NOT EXISTS tickets_suporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  criador_id UUID NOT NULL REFERENCES profiles(id),
  tipo TEXT NOT NULL DEFAULT 'duvida' CHECK (tipo IN ('duvida', 'bug', 'sugestao', 'outro')),
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'fechado')),
  avaliacao INT CHECK (avaliacao BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON tickets_suporte
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tickets" ON tickets_suporte
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant tickets" ON tickets_suporte
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

- [ ] **Step 2: Create useTicketsSuporte hook**

Same pattern as useTarefas — CRUD with TanStack Query.

- [ ] **Step 3: Create SuportePage**

Table with: Criação (avatar + name + date) | Conteúdo (truncated) | Status (badge) | Tipo (badge) | Ações

"+ Novo Ticket" button with dialog form (tipo select, conteúdo textarea).

- [ ] **Step 4: Add route in App.tsx**

```tsx
const SuportePage = lazyWithRetry(() => import('@/features/suporte/SuportePage'));
// Route already exists at /suporte, just update the lazy import
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260324000002_create_tickets_suporte.sql src/hooks/useTicketsSuporte.ts src/features/suporte/SuportePage.tsx src/App.tsx
git commit -m "feat: add Suporte page with tickets table and form"
```

---

## Phase 5: Conexões + Automações

### Task 15: Create Conexões page with detail panel

**Files:**
- Create: `src/features/conexoes/ConexoesPage.tsx`
- Create: `src/features/conexoes/ConexaoDetail.tsx`

- [ ] **Step 1: Create ConexoesPage**

Table of WhatsApp instances from `useConexoes()`:
- Columns: Nome | Status (Conectado/Desconectado badge) | Número | Responsável Padrão | Departamento Padrão | Ações
- Click row → opens ConexaoDetail slide-over

- [ ] **Step 2: Create ConexaoDetail**

Sheet/Drawer with 4 tabs (using shadcn Tabs):
- **Geral**: instance name, number, status, avatar
- **Logs**: activity log (from existing data)
- **Configurações**: webhook URL, default status, default department
- **Ações**: disconnect, reconnect (QR code), delete

- [ ] **Step 3: Update /conexoes route**

Ensure App.tsx `/conexoes` route points to new ConexoesPage.

- [ ] **Step 4: Commit**

```bash
git add src/features/conexoes/
git commit -m "feat: add Conexões page with instance table and detail panel"
```

### Task 16: Enhance Base de Conhecimento page

**Files:**
- Modify: `src/features/base-conhecimento/` (check existing)

- [ ] **Step 1: Check what exists at /base-conhecimento route**

Read existing file and enhance to show:
- Table: Nome | Tipo (PDF/URL/Texto badge) | Status | Data | Ações
- Upload button with drag & drop zone
- Link documents to agents

- [ ] **Step 2: Commit**

```bash
git add src/features/base-conhecimento/
git commit -m "feat: enhance Base de Conhecimento with upload table"
```

---

## Phase 6: Routes + Final Integration

### Task 17: Wire all routes and verify navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Ensure all routes are wired**

Verify:
- `/` → HomePage
- `/home` → HomePage
- `/dashboard` → Dashboard
- `/conexoes` → ConexoesPage
- `/whatsapp` → WhatsAppIA (with tabs)
- `/crm` → ContatosTable
- `/pipeline` → KanbanOperacional
- `/agentes` → existing
- `/base-conhecimento` → BaseConhecimentoPage
- `/tarefas` → TarefasPage
- `/configuracoes/:section/:subsection?` → ConfiguracoesPage
- `/suporte` → SuportePage
- Legal modules: `/processos`, `/prazos`, `/honorarios`, `/documentos` — unchanged

- [ ] **Step 2: Update sidebar route mappings**

Ensure `onSectionChange` maps each sidebar item to the correct route in `Layout.tsx`.

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Sidebar.tsx src/components/Layout.tsx
git commit -m "feat: wire all LíderHub routes and finalize navigation"
```

### Task 18: Run tests and fix any failures

**Files:**
- Potentially modify: test files that reference changed components

- [ ] **Step 1: Run unit tests**

Run: `npm run test`
Fix any failures caused by component changes (updated imports, changed props, etc.)

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Fix any type errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Fix any lint errors

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve test and lint issues from LíderHub redesign"
```

### Task 19: Final visual QA pass

- [ ] **Step 1: Navigate every page and verify visual consistency**

Check:
- [ ] Home page: greeting, stats, quick actions
- [ ] Dashboard: stat cards, charts
- [ ] Conexões: table, detail panel
- [ ] Conversas: tabs, filters, chat
- [ ] Contatos: table with search, pagination
- [ ] Kanban: colored headers, polished cards
- [ ] Agentes: consistent styling
- [ ] Base de Conhecimento: table
- [ ] Tarefas: table, form
- [ ] Configurações: all sections render (PERFIL, EMPRESA, COBRANÇA)
- [ ] Suporte: tickets table
- [ ] Legal modules (Processos, Prazos, etc.): still accessible

- [ ] **Step 2: Fix any visual issues found**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "style: final LíderHub visual QA fixes"
```

---

## Migration Checklist (Run in Supabase SQL Editor)

After implementation, run these migrations in order:
1. `20260324000001_create_tarefas.sql`
2. `20260324000002_create_tickets_suporte.sql`

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | Tasks 1-5 | Visual foundation (tokens, TopBar, breadcrumbs, sidebar, shadows) |
| 2 | Tasks 6-7 | Home page + Dashboard redesign |
| 3 | Tasks 8-10 | Atendimento (Conversas tabs, Contatos table, Kanban polish) |
| 4 | Tasks 11-14 | New features (Tarefas + Suporte with DB migrations) |
| 5 | Tasks 15-16 | Conexões page + Base de Conhecimento |
| 6 | Tasks 17-19 | Routes, tests, final QA |

**Total: 19 tasks across 6 phases**
**Estimated commits: ~19**
**New files: ~15**
**Modified files: ~12**
**New DB tables: 2 (tarefas, tickets_suporte)**
