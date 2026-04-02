# Advanced Filters — Kanban & WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add advanced filter bars (Responsavel, Status, Mais Filtros) to the Kanban Operacional toolbar and WhatsApp Conversations panel, matching the LiderHub reference design.

**Architecture:** Two independent UI enhancements sharing a common filter-bar pattern. The Kanban filters operate client-side on already-fetched leads. The WhatsApp responsavel filter requires a new DB column (`responsavel_id` on `whatsapp_conversations`) plus a migration, then client-side filtering. Both use shadcn Select/Popover components already in the project.

**Tech Stack:** React 18, TypeScript, shadcn/ui (Select, Popover, Checkbox, Badge), Supabase PostgreSQL migration, TanStack React Query.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/features/pipeline/KanbanToolbar.tsx` | Add Responsavel, Status, Mais Filtros dropdowns |
| Modify | `src/features/pipeline/KanbanOperacional.tsx` | Wire new filter state and pass to toolbar + filter logic |
| Create | `supabase/migrations/20260331000001_whatsapp_responsavel.sql` | Add `responsavel_id` column to `whatsapp_conversations` |
| Modify | `src/hooks/useWhatsAppConversations.ts` | Add `responsavel_id` to interface |
| Modify | `src/features/whatsapp/ConversationFilters.tsx` | Add Responsavel dropdown + Mais Filtros popover |
| Modify | `src/features/whatsapp/ConversationList.tsx` | Pass members to filters |
| Modify | `src/features/whatsapp/WhatsAppIA.tsx` | Wire responsavel filter + pass members |

---

## Task 1: Add filter state and dropdowns to KanbanToolbar

**Files:**
- Modify: `src/features/pipeline/KanbanToolbar.tsx`
- Modify: `src/features/pipeline/KanbanOperacional.tsx`

The Kanban toolbar currently has: GroupBy selector, Search, Show Archived toggle.
We need to add: **Responsavel** dropdown, **Status** dropdown, **Mais Filtros** popover (Origem, Prioridade, Conexao).

- [ ] **Step 1: Update KanbanToolbar props and add filter dropdowns**

Replace the entire `src/features/pipeline/KanbanToolbar.tsx` with:

```tsx
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { GroupBy } from './useKanbanGrouping';
import type { ProfileLike, ConexaoLike } from './useKanbanGrouping';

export interface KanbanFilters {
  responsavelId: string;
  status: string;
  origem: string;
  prioridade: string;
  conexaoId: string;
}

export const EMPTY_FILTERS: KanbanFilters = {
  responsavelId: '',
  status: '',
  origem: '',
  prioridade: '',
  conexaoId: '',
};

interface KanbanToolbarProps {
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  search: string;
  onSearchChange: (s: string) => void;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
  filters: KanbanFilters;
  onFiltersChange: (f: KanbanFilters) => void;
  members: ProfileLike[];
  origens: string[];
  conexoes: ConexaoLike[];
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status',       label: 'Por Status' },
  { value: 'departamento', label: 'Por Departamento' },
  { value: 'responsavel',  label: 'Por Responsável' },
  { value: 'origem',       label: 'Por Origem' },
  { value: 'prioridade',   label: 'Por Prioridade' },
  { value: 'conexao',      label: 'Por Conexão' },
];

const STATUS_OPTIONS = [
  { value: 'novo',        label: 'Novo' },
  { value: 'em_contato',  label: 'Em Contato' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'proposta',    label: 'Proposta' },
  { value: 'negociacao',  label: 'Negociação' },
  { value: 'ganho',       label: 'Ganho' },
  { value: 'perdido',     label: 'Perdido' },
];

const PRIORIDADE_OPTIONS = [
  { value: 'baixa',   label: 'Baixa' },
  { value: 'media',   label: 'Média' },
  { value: 'alta',    label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

function countActiveMoreFilters(f: KanbanFilters): number {
  return [f.origem, f.prioridade, f.conexaoId].filter(Boolean).length;
}

export function KanbanToolbar({
  groupBy,
  onGroupByChange,
  search,
  onSearchChange,
  showArchived,
  onShowArchivedChange,
  filters,
  onFiltersChange,
  members,
  origens,
  conexoes,
}: KanbanToolbarProps) {
  const moreCount = countActiveMoreFilters(filters);
  const hasAnyFilter = !!(filters.responsavelId || filters.status || moreCount);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-background">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Pesquisar..."
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Responsavel filter */}
      <Select
        value={filters.responsavelId || '__all__'}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, responsavelId: v === '__all__' ? '' : v })
        }
      >
        <SelectTrigger className="w-[170px] h-8 text-xs">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" className="text-xs">Todos responsáveis</SelectItem>
          <SelectItem value="__none__" className="text-xs">Sem responsável</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id} className="text-xs">
              {m.nome_completo ?? 'Sem nome'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={filters.status || '__all__'}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, status: v === '__all__' ? '' : v })
        }
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" className="text-xs">Todos status</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Mais filtros popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Mais filtros
            {moreCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px]">
                {moreCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-3 space-y-3" align="start">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtros adicionais</p>

          {/* Origem */}
          <div className="space-y-1">
            <Label className="text-xs">Origem</Label>
            <Select
              value={filters.origem || '__all__'}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, origem: v === '__all__' ? '' : v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">Todas origens</SelectItem>
                {origens.map((o) => (
                  <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridade */}
          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <Select
              value={filters.prioridade || '__all__'}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, prioridade: v === '__all__' ? '' : v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">Todas prioridades</SelectItem>
                {PRIORIDADE_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conexao */}
          <div className="space-y-1">
            <Label className="text-xs">Conexão</Label>
            <Select
              value={filters.conexaoId || '__all__'}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, conexaoId: v === '__all__' ? '' : v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas conexões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">Todas conexões</SelectItem>
                {conexoes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear all filters */}
      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground gap-1"
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
        >
          <X className="h-3 w-3" /> Limpar
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Group by selector */}
      <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Agrupar por..." />
        </SelectTrigger>
        <SelectContent>
          {GROUP_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Show archived toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="show-archived"
          checked={showArchived}
          onCheckedChange={onShowArchivedChange}
        />
        <Label htmlFor="show-archived" className="text-xs text-muted-foreground cursor-pointer">
          Arquivados
        </Label>
      </div>
    </div>
  );
}

export default KanbanToolbar;
```

- [ ] **Step 2: Update KanbanOperacional to wire filter state**

In `src/features/pipeline/KanbanOperacional.tsx`, add filter state and apply filters to leads.

Add import at top:
```tsx
import { KanbanToolbar, type KanbanFilters, EMPTY_FILTERS } from './KanbanToolbar';
```
(Remove the old `import { KanbanToolbar } from './KanbanToolbar';`)

Add state after `const [showArchived, setShowArchived] = useState(false);`:
```tsx
const [filters, setFilters] = useState<KanbanFilters>(EMPTY_FILTERS);
```

Update the `filteredLeads` useMemo to apply the new filters — replace the entire block:
```tsx
const filteredLeads = useMemo(() => {
  if (!leads) return [];
  return leads.filter((lead) => {
    // Archived filter
    if (!showArchived && lead.arquivado_em) return false;
    if (showArchived && !lead.arquivado_em) return false;

    // Search filter
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      const matchNome = (lead.nome_completo ?? lead.nome ?? '').toLowerCase().includes(term);
      const matchTel = (lead.telefone ?? '').toLowerCase().includes(term);
      const matchEmail = (lead.email ?? '').toLowerCase().includes(term);
      if (!matchNome && !matchTel && !matchEmail) return false;
    }

    // Responsavel filter
    if (filters.responsavelId) {
      if (filters.responsavelId === '__none__') {
        if (lead.responsavel_id) return false;
      } else {
        if (lead.responsavel_id !== filters.responsavelId) return false;
      }
    }

    // Status filter
    if (filters.status && lead.status !== filters.status) return false;

    // Origem filter
    if (filters.origem && lead.origem !== filters.origem) return false;

    // Prioridade filter
    if (filters.prioridade && lead.prioridade !== filters.prioridade) return false;

    // Conexao filter
    if (filters.conexaoId && lead.conexao_id !== filters.conexaoId) return false;

    return true;
  });
}, [leads, debouncedSearch, showArchived, filters]);
```

Add a memo for unique origens (after the `conexaoMap` memo):
```tsx
const uniqueOrigens = useMemo(
  () => [...new Set((leads ?? []).map((l) => l.origem).filter((o): o is string => !!o))].sort(),
  [leads],
);
```

Update the `<KanbanToolbar>` JSX to pass the new props:
```tsx
<KanbanToolbar
  groupBy={groupBy}
  onGroupByChange={setGroupBy}
  search={search}
  onSearchChange={setSearch}
  showArchived={showArchived}
  onShowArchivedChange={setShowArchived}
  filters={filters}
  onFiltersChange={setFilters}
  members={members}
  origens={uniqueOrigens}
  conexoes={conexoes ?? []}
/>
```

- [ ] **Step 3: Verify Kanban builds and test manually**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 4: Commit Kanban filter enhancements**

```bash
git add src/features/pipeline/KanbanToolbar.tsx src/features/pipeline/KanbanOperacional.tsx
git commit -m "feat(kanban): add Responsavel, Status, Mais Filtros dropdowns to toolbar"
```

---

## Task 2: Add `responsavel_id` column to `whatsapp_conversations`

**Files:**
- Create: `supabase/migrations/20260331000001_whatsapp_responsavel.sql`
- Modify: `src/hooks/useWhatsAppConversations.ts`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/20260331000001_whatsapp_responsavel.sql`:

```sql
-- Add responsavel_id to whatsapp_conversations
-- Allows assigning a team member as responsible for a conversation
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for filtering by responsavel
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_responsavel_id
  ON whatsapp_conversations(responsavel_id);
```

- [ ] **Step 2: Update WhatsAppConversation TypeScript interface**

In `src/hooks/useWhatsAppConversations.ts`, add `responsavel_id` to the `WhatsAppConversation` interface after the `user_id` field:

```typescript
  responsavel_id: string | null;
```

- [ ] **Step 3: Commit migration and type update**

```bash
git add supabase/migrations/20260331000001_whatsapp_responsavel.sql src/hooks/useWhatsAppConversations.ts
git commit -m "feat(whatsapp): add responsavel_id column to conversations table"
```

---

## Task 3: Add Responsavel and Mais Filtros to WhatsApp ConversationFilters

**Files:**
- Modify: `src/features/whatsapp/ConversationFilters.tsx`
- Modify: `src/features/whatsapp/ConversationList.tsx`
- Modify: `src/features/whatsapp/WhatsAppIA.tsx`

- [ ] **Step 1: Expand ConversationFilterState and update ConversationFilters component**

Replace the entire `src/features/whatsapp/ConversationFilters.tsx`:

```tsx
import { SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export interface ConversationFilterState {
  tab: 'todos' | 'ia' | 'ativos' | 'pendentes';
  status: '' | 'ativo' | 'aguardando' | 'qualificado' | 'finalizado';
  responsavelId: string;
  areaJuridica: string;
}

export const EMPTY_CONV_FILTERS: ConversationFilterState = {
  tab: 'todos',
  status: '',
  responsavelId: '',
  areaJuridica: '',
};

interface MemberOption {
  id: string;
  nome_completo: string | null;
}

interface ConversationFiltersProps {
  value: ConversationFilterState;
  onChange: (next: ConversationFilterState) => void;
  stats: { total: number; active: number; pending: number; qualified: number };
  members: MemberOption[];
  areasJuridicas: string[];
}

export const ConversationFilters = ({ value, onChange, stats, members, areasJuridicas }: ConversationFiltersProps) => {
  const moreCount = [value.areaJuridica].filter(Boolean).length;

  return (
    <>
      {/* Tab bar */}
      <div className="px-4 pt-1 pb-2">
        <Tabs
          value={value.tab}
          onValueChange={(v) =>
            onChange({ ...value, tab: v as ConversationFilterState['tab'] })
          }
        >
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="todos" className="text-xs">
              Todos{stats.total > 0 ? ` (${stats.total})` : ''}
            </TabsTrigger>
            <TabsTrigger value="ia" className="text-xs">
              IA
            </TabsTrigger>
            <TabsTrigger value="ativos" className="text-xs">
              Ativos{stats.active > 0 ? ` (${stats.active})` : ''}
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="text-xs">
              Pendentes{stats.pending > 0 ? ` (${stats.pending})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filter bar: Responsavel + Status + Mais filtros */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        {/* Responsavel */}
        <Select
          value={value.responsavelId || '__all__'}
          onValueChange={(v) =>
            onChange({ ...value, responsavelId: v === '__all__' ? '' : v })
          }
        >
          <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">Todos responsáveis</SelectItem>
            <SelectItem value="__none__" className="text-xs">Sem responsável</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.nome_completo ?? 'Sem nome'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={value.status === '' ? '__all__' : value.status}
          onValueChange={(v) =>
            onChange({
              ...value,
              status: v === '__all__' ? '' : (v as ConversationFilterState['status']),
            })
          }
        >
          <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">Todos os status</SelectItem>
            <SelectItem value="ativo" className="text-xs">Ativo</SelectItem>
            <SelectItem value="aguardando" className="text-xs">Aguardando</SelectItem>
            <SelectItem value="qualificado" className="text-xs">Agendado</SelectItem>
            <SelectItem value="finalizado" className="text-xs">Finalizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Mais filtros */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 flex-shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mais filtros
              {moreCount > 0 && (
                <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px]">
                  {moreCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-3 space-y-3" align="start">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtros adicionais</p>
            <div className="space-y-1">
              <Label className="text-xs">Área Jurídica</Label>
              <Select
                value={value.areaJuridica || '__all__'}
                onValueChange={(v) =>
                  onChange({ ...value, areaJuridica: v === '__all__' ? '' : v })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">Todas áreas</SelectItem>
                  {areasJuridicas.map((a) => (
                    <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

ConversationFilters.displayName = 'ConversationFilters';
```

- [ ] **Step 2: Update ConversationList to pass members and areasJuridicas**

In `src/features/whatsapp/ConversationList.tsx`, update the `ConversationListProps` interface to add:

```typescript
  members: { id: string; nome_completo: string | null }[];
  areasJuridicas: string[];
```

Update the component destructuring to include `members, areasJuridicas`, and pass them to `<ConversationFilters>`:

```tsx
<ConversationFilters value={convFilter} onChange={onFilterChange} stats={stats} members={members} areasJuridicas={areasJuridicas} />
```

- [ ] **Step 3: Update WhatsAppIA to provide members, expand filter state, and apply filters**

In `src/features/whatsapp/WhatsAppIA.tsx`:

Add import:
```tsx
import { useTeamMembers } from '@/hooks/useTeamMembers';
```

Update the import of ConversationFilterState:
```tsx
import type { ConversationFilterState } from './ConversationFilters';
import { EMPTY_CONV_FILTERS } from './ConversationFilters';
```

Inside the `WhatsAppIA` component, add the hook call after `const { profile } = useAuth();`:
```tsx
const { members } = useTeamMembers();
```

Replace the `convFilter` initial state:
```tsx
const [convFilter, setConvFilter] = useState<ConversationFilterState>(EMPTY_CONV_FILTERS);
```

Add unique areas memo before `filteredConversations`:
```tsx
const uniqueAreas = useMemo(
  () => [...new Set(conversations.map((c) => c.area_juridica).filter((a): a is string => !!a))].sort(),
  [conversations],
);
```

Update the `filteredConversations` useMemo to include responsavel and area filters:

```tsx
const filteredConversations = useMemo(() => {
  return conversations.filter(conv => {
    // Tab filter
    const tabMatch = (() => {
      switch (convFilter.tab) {
        case 'ia': return conv.agent_status === 'processing' || conv.agent_status === 'waiting_human';
        case 'ativos': return conv.status === 'ativo';
        case 'pendentes': return conv.status === 'aguardando';
        default: return true;
      }
    })();
    // Status filter
    const statusMatch = !convFilter.status || conv.status === convFilter.status;
    // Search filter
    const searchMatch = !searchQuery.trim() ||
      (conv.contact_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.phone_number.includes(searchQuery);
    // Responsavel filter
    const respMatch = (() => {
      if (!convFilter.responsavelId) return true;
      if (convFilter.responsavelId === '__none__') return !conv.responsavel_id;
      return conv.responsavel_id === convFilter.responsavelId;
    })();
    // Area juridica filter
    const areaMatch = !convFilter.areaJuridica || conv.area_juridica === convFilter.areaJuridica;

    return tabMatch && statusMatch && searchMatch && respMatch && areaMatch;
  });
}, [conversations, convFilter, searchQuery]);
```

Update the `<ConversationList>` props to pass members and areas:

```tsx
<ConversationList
  showMobileChat={showMobileChat}
  searchQuery={searchQuery}
  setSearchQuery={setSearchQuery}
  convFilter={convFilter}
  onFilterChange={setConvFilter}
  filteredConversations={filteredConversations}
  selectedConversation={selectedConversation}
  stats={stats}
  isConnected={isWhatsAppConnected}
  onSelectConversation={handleSelectConversation}
  onRefresh={() => void fetchConversations()}
  onSetup={() => setShowSetup(true)}
  members={members}
  areasJuridicas={uniqueAreas}
/>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 5: Commit WhatsApp filter enhancements**

```bash
git add supabase/migrations/20260331000001_whatsapp_responsavel.sql \
  src/hooks/useWhatsAppConversations.ts \
  src/features/whatsapp/ConversationFilters.tsx \
  src/features/whatsapp/ConversationList.tsx \
  src/features/whatsapp/WhatsAppIA.tsx
git commit -m "feat(whatsapp): add Responsavel, Status, Mais Filtros to conversation filters"
```

---

## Summary

| Area | Before | After |
|------|--------|-------|
| **Kanban Toolbar** | GroupBy + Search + Archived toggle | + Responsavel dropdown + Status dropdown + Mais Filtros (Origem, Prioridade, Conexao) + Clear button |
| **WhatsApp Filters** | Tabs + Status dropdown | + Responsavel dropdown + Mais Filtros (Area Juridica) |
| **WhatsApp DB** | No responsavel_id | + responsavel_id column with FK + index |
| **Members** | Already complete | No changes needed |
