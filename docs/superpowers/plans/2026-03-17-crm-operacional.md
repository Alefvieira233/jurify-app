# CRM Operacional Jurify — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Jurify into a full operational legal CRM with department-driven routing, dynamic Kanban, smart archiving, tags, rich lead drawer, and granular permissions.

**Architecture:** Incremental evolution of existing React 18 + Supabase stack. New migrations add tags, lead_historico, lead_notas tables + expand leads. New hooks/components follow existing patterns. Sidebar restructured by functional domain. Kanban refactored for dynamic grouping.

**Tech Stack:** React 18, TypeScript strict, Supabase (PostgreSQL + RLS + Edge Functions), TanStack React Query, @hello-pangea/dnd, shadcn/ui + Radix UI, Tailwind CSS, Zod, Vitest

---

## File Structure

### New Files
- `supabase/migrations/20260317200000_crm_operacional_tags.sql` — tags table + lead_tags junction
- `supabase/migrations/20260317200001_crm_operacional_leads_expand.sql` — new lead columns + lead_notas + lead_historico
- `supabase/migrations/20260317200002_crm_operacional_departamentos_expand.sql` — expand departamentos with responsavel_padrao_id, agente_ia_padrao_id
- `src/types/crm-operacional.ts` — centralized types (Tag, LeadNota, LeadHistorico, DepartamentoExpanded, etc.)
- `src/hooks/useTags.ts` — CRUD hook for tags
- `src/hooks/useDepartamentos.ts` — CRUD hook for departamentos + membros
- `src/hooks/useLeadHistorico.ts` — read hook for lead change history
- `src/hooks/useLeadNotas.ts` — CRUD hook for lead internal notes
- `src/features/departamentos/DepartamentosManager.tsx` — department management page
- `src/features/departamentos/DepartamentoForm.tsx` — create/edit department form
- `src/features/departamentos/MembrosSection.tsx` — manage department members
- `src/features/tags/TagsManager.tsx` — tags management page
- `src/features/tags/TagForm.tsx` — create/edit tag form
- `src/features/tags/TagBadge.tsx` — reusable tag badge component
- `src/features/pipeline/KanbanOperacional.tsx` — new kanban with dynamic grouping
- `src/features/pipeline/KanbanCard.tsx` — rich lead card
- `src/features/pipeline/KanbanColumn.tsx` — dynamic column
- `src/features/pipeline/KanbanToolbar.tsx` — grouping/filter controls
- `src/features/pipeline/useKanbanGrouping.ts` — grouping logic hook
- `src/features/leads/LeadDrawer.tsx` — rich side drawer for lead details
- `src/features/leads/LeadDrawerAtendimento.tsx` — attendance block
- `src/features/leads/LeadDrawerDados.tsx` — lead data block
- `src/features/leads/LeadDrawerOperacional.tsx` — operational block
- `src/features/leads/LeadDrawerNotas.tsx` — internal notes block
- `src/features/leads/LeadDrawerHistorico.tsx` — change history timeline
- `src/features/leads/ArquivarLeadDialog.tsx` — smart archive modal
- `src/components/TagSelect.tsx` — multi-select tag picker (reusable)

### Modified Files
- `src/components/Sidebar.tsx` — restructured navigation by domain
- `src/App.tsx` — new routes for departamentos, tags
- `src/types/rbac.ts` — add 'tags' resource
- `src/hooks/useRBAC.ts` — no changes needed (existing can() works)
- `src/hooks/useLeads.ts` — add new fields to Lead type + archive/unarchive mutations
- `src/schemas/leadSchema.ts` — add new fields
- `src/features/pipeline/PipelineJuridico.tsx` — replace with KanbanOperacional
- `src/features/pipeline/pipelineConfig.ts` — add grouping configs
- `src/features/crm/LeadDetailPanel.tsx` — redirect to drawer or remove

---

## Chunk 1: Database Foundation

### Task 1: Tags Migration

**Files:**
- Create: `supabase/migrations/20260317200000_crm_operacional_tags.sql`

- [ ] **Step 1: Write migration**

```sql
-- Tags system
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  categoria TEXT,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nome)
);

CREATE TABLE IF NOT EXISTS public.lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(lead_id, tag_id)
);

-- RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select ON public.tags FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY tags_insert ON public.tags FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY tags_update ON public.tags FOR UPDATE USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY tags_delete ON public.tags FOR DELETE USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY lead_tags_select ON public.lead_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_tags.lead_id AND leads.tenant_id = public.get_current_tenant_id())
);
CREATE POLICY lead_tags_insert ON public.lead_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_tags.lead_id AND leads.tenant_id = public.get_current_tenant_id())
);
CREATE POLICY lead_tags_delete ON public.lead_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_tags.lead_id AND leads.tenant_id = public.get_current_tenant_id())
);

-- Indexes
CREATE INDEX idx_tags_tenant ON public.tags(tenant_id);
CREATE INDEX idx_lead_tags_lead ON public.lead_tags(lead_id);
CREATE INDEX idx_lead_tags_tag ON public.lead_tags(tag_id);

-- Seed default tags
INSERT INTO public.tags (tenant_id, nome, cor, categoria, ordem)
SELECT t.id, tag.nome, tag.cor, tag.categoria, tag.ordem
FROM public.tenants t
CROSS JOIN (VALUES
  ('Urgente', '#ef4444', 'prioridade', 1),
  ('Quente', '#f97316', 'temperatura', 2),
  ('Morno', '#eab308', 'temperatura', 3),
  ('Frio', '#3b82f6', 'temperatura', 4),
  ('Documento Pendente', '#8b5cf6', 'operacional', 5),
  ('Em Análise', '#6366f1', 'operacional', 6),
  ('Alto Potencial', '#10b981', 'qualificacao', 7),
  ('Baixo Fit', '#6b7280', 'qualificacao', 8),
  ('Retornar Depois', '#f59e0b', 'acompanhamento', 9),
  ('Cliente Recorrente', '#14b8a6', 'relacionamento', 10)
) AS tag(nome, cor, categoria, ordem);
```

- [ ] **Step 2: Commit**
```bash
git add supabase/migrations/20260317200000_crm_operacional_tags.sql
git commit -m "feat(db): add tags + lead_tags tables with RLS and default seeds"
```

### Task 2: Leads Expansion Migration

**Files:**
- Create: `supabase/migrations/20260317200001_crm_operacional_leads_expand.sql`

- [ ] **Step 1: Write migration**

```sql
-- Lead internal notes
CREATE TABLE IF NOT EXISTS public.lead_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(id),
  autor_nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  fixada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lead change history
CREATE TABLE IF NOT EXISTS public.lead_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id),
  usuario_nome TEXT,
  tipo_evento TEXT NOT NULL, -- 'departamento_alterado', 'responsavel_alterado', 'status_alterado', 'tag_adicionada', 'tag_removida', 'arquivado', 'reativado', 'propriedade_alterada', 'nota_adicionada'
  campo TEXT, -- which field changed
  valor_anterior TEXT,
  valor_novo TEXT,
  descricao TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expand leads table with new operational columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS conexao_id UUID REFERENCES public.conexoes_whatsapp(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente'));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS inactive_since TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ultima_interacao TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS proxima_acao TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS proxima_acao_data TIMESTAMPTZ;

-- RLS for lead_notas
ALTER TABLE public.lead_notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_notas_select ON public.lead_notas FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY lead_notas_insert ON public.lead_notas FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY lead_notas_update ON public.lead_notas FOR UPDATE USING (tenant_id = public.get_current_tenant_id() AND autor_id = auth.uid());
CREATE POLICY lead_notas_delete ON public.lead_notas FOR DELETE USING (tenant_id = public.get_current_tenant_id() AND autor_id = auth.uid());

-- RLS for lead_historico
ALTER TABLE public.lead_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_historico_select ON public.lead_historico FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY lead_historico_insert ON public.lead_historico FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Indexes
CREATE INDEX idx_lead_notas_lead ON public.lead_notas(lead_id);
CREATE INDEX idx_lead_notas_tenant ON public.lead_notas(tenant_id);
CREATE INDEX idx_lead_historico_lead ON public.lead_historico(lead_id);
CREATE INDEX idx_lead_historico_tenant ON public.lead_historico(tenant_id);
CREATE INDEX idx_lead_historico_created ON public.lead_historico(created_at DESC);
CREATE INDEX idx_leads_departamento ON public.leads(departamento_id);
CREATE INDEX idx_leads_conexao ON public.leads(conexao_id);
CREATE INDEX idx_leads_prioridade ON public.leads(prioridade);
CREATE INDEX idx_leads_ultima_interacao ON public.leads(ultima_interacao DESC);

-- Function to auto-record history
CREATE OR REPLACE FUNCTION public.record_lead_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Track department changes
  IF OLD.departamento_id IS DISTINCT FROM NEW.departamento_id THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'departamento_alterado', 'departamento_id',
      OLD.departamento_id::TEXT, NEW.departamento_id::TEXT);
  END IF;

  -- Track responsavel changes
  IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'responsavel_alterado', 'responsavel_id',
      OLD.responsavel_id::TEXT, NEW.responsavel_id::TEXT);
    -- Update assigned_at
    NEW.assigned_at := now();
  END IF;

  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'status_alterado', 'status',
      OLD.status, NEW.status);
  END IF;

  -- Track archive
  IF OLD.arquivado_em IS NULL AND NEW.arquivado_em IS NOT NULL THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento, descricao, metadata)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'arquivado', NEW.motivo_arquivamento,
      jsonb_build_object('motivo', NEW.motivo_arquivamento, 'data_reativacao', NEW.data_reativacao_prevista));
  END IF;

  -- Track unarchive
  IF OLD.arquivado_em IS NOT NULL AND NEW.arquivado_em IS NULL THEN
    INSERT INTO public.lead_historico (lead_id, tenant_id, usuario_id, tipo_evento)
    VALUES (NEW.id, NEW.tenant_id, auth.uid(), 'reativado');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_history ON public.leads;
CREATE TRIGGER trg_lead_history
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.record_lead_history();
```

- [ ] **Step 2: Commit**
```bash
git add supabase/migrations/20260317200001_crm_operacional_leads_expand.sql
git commit -m "feat(db): add lead_notas, lead_historico, expand leads with operational fields + auto-history trigger"
```

### Task 3: Expand Departamentos Migration

**Files:**
- Create: `supabase/migrations/20260317200002_crm_operacional_departamentos_expand.sql`

- [ ] **Step 1: Write migration**

```sql
-- Expand departamentos
ALTER TABLE public.departamentos ADD COLUMN IF NOT EXISTS responsavel_padrao_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.departamentos ADD COLUMN IF NOT EXISTS agente_ia_padrao_id UUID;

-- Expand departamento_membros with operational permissions
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_ver_todos_leads BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_atribuir_responsavel BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_mover_leads BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_editar_propriedades BOOLEAN DEFAULT true;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_arquivar BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_ver_metricas BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS pode_gerenciar BOOLEAN DEFAULT false;
ALTER TABLE public.departamento_membros ADD COLUMN IF NOT EXISTS receber_notificacoes BOOLEAN DEFAULT true;

-- Seed "Sem departamento" default for each tenant
-- This is a virtual concept, not a DB row. departamento_id = NULL means "Sem departamento"
```

- [ ] **Step 2: Commit**
```bash
git add supabase/migrations/20260317200002_crm_operacional_departamentos_expand.sql
git commit -m "feat(db): expand departamentos with default responsavel + granular member permissions"
```

---

## Chunk 2: Types and Hooks

### Task 4: Centralized CRM Types

**Files:**
- Create: `src/types/crm-operacional.ts`

- [ ] **Step 1: Write types file** — All centralized types for tags, notas, historico, departamento expanded, kanban grouping, archive, priorities.

- [ ] **Step 2: Update rbac.ts** — Add 'tags' resource to Resource type and ROLE_PERMISSIONS.

- [ ] **Step 3: Commit**

### Task 5: useTags Hook

**Files:**
- Create: `src/hooks/useTags.ts`

- [ ] **Step 1: Write hook** — CRUD for tags + addTagToLead/removeTagFromLead + useLeadTags query.

- [ ] **Step 2: Commit**

### Task 6: useDepartamentos Hook

**Files:**
- Create: `src/hooks/useDepartamentos.ts`

- [ ] **Step 1: Write hook** — CRUD for departamentos + addMembro/removeMembro/updateMembro + useDepartamentoMembros.

- [ ] **Step 2: Commit**

### Task 7: useLeadHistorico + useLeadNotas Hooks

**Files:**
- Create: `src/hooks/useLeadHistorico.ts`
- Create: `src/hooks/useLeadNotas.ts`

- [ ] **Step 1: Write useLeadHistorico** — Read-only query for lead change history, ordered by created_at DESC.

- [ ] **Step 2: Write useLeadNotas** — CRUD for internal notes with optimistic updates.

- [ ] **Step 3: Commit**

### Task 8: Expand useLeads

**Files:**
- Modify: `src/hooks/useLeads.ts`

- [ ] **Step 1: Add new fields to Lead type** — conexao_id, prioridade, assigned_at, inactive_since, ultima_interacao, proxima_acao, proxima_acao_data.

- [ ] **Step 2: Add archive/unarchive mutations** — archiveLead(id, motivo, observacao, proximoResponsavelId, dataReativacao) + unarchiveLead(id).

- [ ] **Step 3: Commit**

---

## Chunk 3: Sidebar + Routes

### Task 9: Restructure Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Restructure navigation into 4 domains**

New structure:
```
Atendimento (section, collapsible)
  - Conversas → /whatsapp (MessageCircle)
  - Contatos → /crm (Users)
  - Kanban → /pipeline (TrendingUp)

Automações (section, collapsible)
  - Agentes → /agentes (Bot)
  - Base de Conhecimento → disabled (BookOpen)

Operação (section, collapsible)
  - Tarefas → /agendamentos (Calendar)
  - Equipe → /usuarios (UserCog)
  - Departamentos → /departamentos (Building2)

Administração (section, collapsible)
  - Conexões → /conexoes (Link2)
  - Configurações → /configuracoes (Settings)
  - Métricas → /relatorios (BarChart3)
```

Remove SISTEMA_NAV. Move items into the 4 domains or into Configurações tabs (Assinatura, Logs, Monitoramento → admin tabs). Keep Processos/Prazos/Honorários/Documentos as items under a "Jurídico" section or within Configurações.

- [ ] **Step 2: Commit**

### Task 10: Add Routes

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add routes** — /departamentos (DepartamentosManager), /tags (TagsManager). Keep all existing routes.

- [ ] **Step 2: Commit**

---

## Chunk 4: Departamentos + Tags UI

### Task 11: DepartamentosManager

**Files:**
- Create: `src/features/departamentos/DepartamentosManager.tsx`
- Create: `src/features/departamentos/DepartamentoForm.tsx`
- Create: `src/features/departamentos/MembrosSection.tsx`

- [ ] **Step 1: Write DepartamentosManager** — List view with cards (nome, cor, membro count, status). CRUD buttons. Search.

- [ ] **Step 2: Write DepartamentoForm** — Dialog with nome, descricao, cor (color picker), responsavel_padrao (select), agente_ia_padrao (select), ativo toggle.

- [ ] **Step 3: Write MembrosSection** — Table of members in department. Add member (select from profiles). Remove member. Toggle permissions checkboxes.

- [ ] **Step 4: Commit**

### Task 12: TagsManager + TagBadge

**Files:**
- Create: `src/features/tags/TagsManager.tsx`
- Create: `src/features/tags/TagForm.tsx`
- Create: `src/features/tags/TagBadge.tsx`
- Create: `src/components/TagSelect.tsx`

- [ ] **Step 1: Write TagBadge** — Small reusable badge with tag color dot + nome. Accept size prop.

- [ ] **Step 2: Write TagSelect** — Multi-select popover with search, shows available tags, checkmarks for selected.

- [ ] **Step 3: Write TagsManager** — Grid of tag cards. Create/edit/delete. Filter by categoria. Color picker.

- [ ] **Step 4: Write TagForm** — Dialog with nome, cor, categoria, ordem, ativo.

- [ ] **Step 5: Commit**

---

## Chunk 5: Kanban Operacional

### Task 13: Kanban Grouping Logic

**Files:**
- Create: `src/features/pipeline/useKanbanGrouping.ts`

- [ ] **Step 1: Write grouping hook**

Supports grouping by: status, departamento, responsavel, origem, conexao, prioridade, pipeline.

Input: leads[], groupBy, departamentos[], profiles[], conexoes[]
Output: { columns: Column[], getColumnId(lead), getColumnLabel(colId) }

"Sem departamento" = departamento_id IS NULL, always first column when grouping by departamento.

- [ ] **Step 2: Commit**

### Task 14: KanbanCard

**Files:**
- Create: `src/features/pipeline/KanbanCard.tsx`

- [ ] **Step 1: Write rich card**

Shows: avatar/initials, nome, telefone (masked: last 4 digits), preview ultima mensagem (from metadata or observacoes), conexao badge, responsavel nome, tags (max 3 + "+N"), time indicator (ultima_interacao relative), prioridade badge if alta/urgente.

Draggable via @hello-pangea/dnd. onClick opens LeadDrawer.

- [ ] **Step 2: Commit**

### Task 15: KanbanColumn

**Files:**
- Create: `src/features/pipeline/KanbanColumn.tsx`

- [ ] **Step 1: Write dynamic column**

Props: title, color, leads[], count, totalValue. Droppable zone. Empty state with "Sem leads nesta coluna" + icon.

- [ ] **Step 2: Commit**

### Task 16: KanbanToolbar

**Files:**
- Create: `src/features/pipeline/KanbanToolbar.tsx`

- [ ] **Step 1: Write toolbar**

Controls: groupBy selector (dropdown), search input, filter by tag (multi), filter by prioridade, filter by responsavel, filter by departamento, clear all filters.

All filters coexist. Grouping change recalculates columns without page reload.

- [ ] **Step 2: Commit**

### Task 17: KanbanOperacional (main)

**Files:**
- Create: `src/features/pipeline/KanbanOperacional.tsx`
- Modify: `src/features/pipeline/PipelineJuridico.tsx` — delegate to KanbanOperacional

- [ ] **Step 1: Write KanbanOperacional**

Composes: KanbanToolbar + DragDropContext + KanbanColumn[] + KanbanCard[]. Loads data from useLeads, useDepartamentos, useTags. Memoizes grouping and filtering. Handles drag-end: updates lead field based on groupBy (status, departamento_id, responsavel_id, etc.) + records history.

- [ ] **Step 2: Update PipelineJuridico** — Replace internal logic, render KanbanOperacional. Keep route /pipeline working.

- [ ] **Step 3: Commit**

---

## Chunk 6: Lead Drawer

### Task 18: LeadDrawer (main shell)

**Files:**
- Create: `src/features/leads/LeadDrawer.tsx`

- [ ] **Step 1: Write drawer shell**

Uses Sheet from shadcn/ui. Tabs or scrollable sections: Atendimento, Dados, Operacional, Notas, Histórico. Header shows avatar + name + status badge + close button.

- [ ] **Step 2: Commit**

### Task 19: Drawer Sections

**Files:**
- Create: `src/features/leads/LeadDrawerAtendimento.tsx` — responsavel (inline select), departamento (inline select), conexao, status, prioridade, tags (TagSelect), ultima_interacao, assigned_at
- Create: `src/features/leads/LeadDrawerDados.tsx` — nome, email, telefone, area_juridica, origem, valor_causa, company_name, cpf_cnpj. Inline editing.
- Create: `src/features/leads/LeadDrawerOperacional.tsx` — proxima_acao, proxima_acao_data, pipeline_stage, temperature, probability, lead_score, expected_value
- Create: `src/features/leads/LeadDrawerNotas.tsx` — list of notas + add form (textarea + submit). Pin notes. Delete own notes.
- Create: `src/features/leads/LeadDrawerHistorico.tsx` — timeline of lead_historico entries with icons per type

- [ ] **Step 1-5: Write each section component**

- [ ] **Step 6: Commit**

---

## Chunk 7: Smart Archiving

### Task 20: ArquivarLeadDialog

**Files:**
- Create: `src/features/leads/ArquivarLeadDialog.tsx`

- [ ] **Step 1: Write archive dialog**

Modal with:
- motivo (select from predefined: chat_resolvido, cliente_nao_responde, aberto_por_engano, duplicado, lead_sem_fit, outro)
- observacao (textarea, optional)
- proximo_responsavel (select: humano, IA, departamento)
- data_reativacao (date picker, optional)

On confirm: updates lead with arquivado_em=now(), motivo_arquivamento, proximo_responsavel_id, data_reativacao_prevista. The trigger auto-records history.

- [ ] **Step 2: Add unarchive action** — Button in drawer when lead is archived. Clears arquivado_em, records 'reativado' in history.

- [ ] **Step 3: Commit**

---

## Chunk 8: Permissions + Polish

### Task 21: Department-scoped permissions in useRBAC

**Files:**
- Modify: `src/hooks/useRBAC.ts`

- [ ] **Step 1: Add department-aware helpers**

```typescript
canInDepartment(departamentoId: string, action: string): boolean
// Checks: user is member of department + has the specific permission flag
getUserDepartamentos(): string[]
// Returns department IDs where user is a member
getLeadVisibilityScope(): 'own' | 'department' | 'all'
// Based on role + department permissions
```

- [ ] **Step 2: Commit**

### Task 22: Empty states, loading, responsiveness

**Files:**
- All new components

- [ ] **Step 1: Add Skeleton loaders** to KanbanOperacional, DepartamentosManager, TagsManager, LeadDrawer.

- [ ] **Step 2: Add empty states** with icon + message + CTA for each list view.

- [ ] **Step 3: Ensure responsive** — sidebar collapses, kanban horizontal scroll, drawer full-width on mobile.

- [ ] **Step 4: Final tsc --noEmit + build check**

- [ ] **Step 5: Commit**

---

## Execution Order

Phases are sequential (each depends on prior):
1. **Chunk 1** (Tasks 1-3): Migrations — no code deps
2. **Chunk 2** (Tasks 4-8): Types + Hooks — depends on Chunk 1 schema
3. **Chunk 3** (Tasks 9-10): Sidebar + Routes — independent of Chunk 2
4. **Chunk 4** (Tasks 11-12): Departamentos + Tags UI — depends on Chunk 2 hooks
5. **Chunk 5** (Tasks 13-17): Kanban — depends on Chunk 2 hooks + Chunk 4 components
6. **Chunk 6** (Tasks 18-19): Lead Drawer — depends on Chunk 2 hooks + Chunk 4 components
7. **Chunk 7** (Task 20): Archiving — depends on Chunk 6 drawer
8. **Chunk 8** (Tasks 21-22): Permissions + Polish — depends on all above

**Parallelizable:** Chunks 3+4 can run in parallel after Chunk 2. Chunks 5+6 can run in parallel.
