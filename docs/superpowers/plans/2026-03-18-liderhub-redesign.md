# Jurify LíderHub Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all Jurify pages to match the LíderHub platform visual pattern, restructure navigation and settings, and add missing modules (Suporte, Horário Comercial, Classes management).

**Architecture:** Incremental redesign in 5 phases. Each phase produces working, testable software. The sidebar/layout/settings foundation (Phase 1) unblocks all other phases. Phases 2-5 are independent and can run in parallel after Phase 1.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide icons, TanStack React Query, react-router-dom v6, Supabase.

**Reference:** Screenshots from chat.liderhub.ai (32 images analyzed). Platform: "JACIRA GOMES ADVOCACIA" workspace.

---

## File Structure

### New Files
- `src/features/settings/ConfiguracoesPage.tsx` — New settings page with sidebar layout (replaces ConfiguracoesGerais)
- `src/features/settings/sections/MinhaContaSection.tsx` — Perfil: foto, nome, email
- `src/features/settings/sections/SegurancaSection.tsx` — Segurança: alterar senha
- `src/features/settings/sections/NotificacoesSettingsSection.tsx` — Toggle switches
- `src/features/settings/sections/GeralEmpresaSection.tsx` — Logo, workspace, escritório, CNPJ, OAB, etc.
- `src/features/settings/sections/ClassesSection.tsx` — Status/Etiquetas/Departamento/Origem/Variáveis
- `src/features/settings/sections/StatusManager.tsx` — CRUD de status com cores
- `src/features/settings/sections/EtiquetasManager.tsx` — CRUD de etiquetas/tags
- `src/features/settings/sections/DepartamentoManager.tsx` — CRUD de departamentos
- `src/features/settings/sections/TemplatesSection.tsx` — Templates de mensagens
- `src/features/settings/sections/MembrosSection.tsx` — Gestão de membros/equipe
- `src/features/settings/sections/IntegracoesSettingsSection.tsx` — Integrações (ZapSign, ADV BOX, etc.)
- `src/features/settings/sections/HorarioComercialSection.tsx` — Dias da semana com horários
- `src/features/settings/sections/PlanoSection.tsx` — Plano de assinatura + faturas
- `src/features/settings/sections/UsoSection.tsx` — Limites e consumo de créditos
- `src/features/suporte/SuportePage.tsx` — Tickets de suporte
- `src/features/suporte/NovoTicketForm.tsx` — Formulário de novo ticket
- `src/features/conexoes/ConnectionDetailPanel.tsx` — Painel lateral de detalhes da conexão
- `src/features/conexoes/ConnectionLogsTab.tsx` — Logs da conexão
- `src/features/conexoes/ConnectionConfigTab.tsx` — Configurações da conexão
- `src/features/conexoes/ConnectionActionsTab.tsx` — Ações da conexão

### Modified Files
- `src/components/Sidebar.tsx` — Reestruturar: remover SISTEMA, adicionar Suporte/Academy
- `src/components/Layout.tsx` — Adicionar top bar com workspace name + global search + notifications
- `src/App.tsx` — Novas rotas: /suporte, /configuracoes/* sub-routes
- `src/features/conexoes/ConexoesManager.tsx` — Adicionar painel lateral de detalhes
- `src/features/whatsapp/WhatsAppIA.tsx` — Tabs AI/Ativos/Pendentes/Grupos + filtros avançados
- `src/features/crm/CRMDashboard.tsx` — Redesign para tabela de contatos estilo LíderHub
- `src/features/pipeline/PipelineJuridico.tsx` — Agrupamento por Ticket/Responsável/Departamento
- `src/features/ai-agents/AgentesIAManager.tsx` — Hero gradient + editor de agentes
- `src/features/dashboard/Dashboard.tsx` — Cards de status por etapa + gráficos temporais
- `src/features/scheduling/AgendamentosManager.tsx` — Redesign para Tarefas com Fibonacci

---

## Chunk 1: Sidebar + Layout Foundation

### Task 1: Reestruturar Sidebar — remover SISTEMA, adicionar Suporte

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Atualizar MAIN_NAV — mover itens do SISTEMA para Configurações e adicionar Suporte**

No `MAIN_NAV`, remover seção Jurídico (mover para dentro de Atendimento ou manter separado conforme decisão). Adicionar Suporte e Academy:

```typescript
const MAIN_NAV: NavEntry[] = [
  { kind: 'leaf', id: 'dashboard',  label: 'Home',          icon: LayoutDashboard, resource: 'dashboard',  action: 'read' },
  { kind: 'leaf', id: 'dashboard-analytics', label: 'Dashboard', icon: BarChart3, resource: 'dashboard', action: 'read' },
  { kind: 'leaf', id: 'conexoes',   label: 'Conexões',      icon: Link2,           resource: 'conexoes',   action: 'read' },
  {
    kind: 'section',
    id: 'atendimento',
    label: 'Atendimento',
    icon: MessageSquare,
    children: [
      { id: 'whatsapp', label: 'Conversas',  icon: MessageCircle, resource: 'whatsapp', action: 'read' },
      { id: 'crm',      label: 'Contatos',   icon: Users,         resource: 'leads',    action: 'read' },
      { id: 'pipeline', label: 'Kanban',      icon: TrendingUp,    resource: 'leads',    action: 'read' },
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
      { id: 'vozes',             label: 'Vozes',                icon: Mic,      resource: 'agentes_ia', action: 'read', disabled: true },
    ],
  },
  { kind: 'leaf', id: 'agendamentos',  label: 'Tarefas',        icon: Calendar,    resource: 'agendamentos', action: 'read' },
  { kind: 'leaf', id: 'configuracoes', label: 'Configurações',  icon: Settings,    resource: 'dashboard',    action: 'read' },
  { kind: 'leaf', id: 'suporte',       label: 'Suporte',        icon: HelpCircle,  resource: 'dashboard',    action: 'read' },
  { kind: 'leaf', id: 'academy',       label: 'Academy',        icon: GraduationCap, resource: 'dashboard', action: 'read', disabled: true },
];
```

Key changes:
- Configurações agora é acessível por todos (não mais adminOnly) — as sub-seções admin ficam protegidas internamente
- Suporte adicionado como item principal
- Academy adicionado como "Em breve"
- Vozes adicionado sob Automações como "Em breve"
- Base de Conhecimento habilitado (remover disabled)
- SISTEMA_NAV removido — itens migram para Configurações

- [ ] **Step 2: Remover seção SISTEMA da renderização**

Remover todo o bloco `{filteredSistemaItems.length > 0 && (...)}` e a constante `SISTEMA_NAV`, `SISTEMA_IDS`, `filteredSistemaItems`.

- [ ] **Step 3: Atualizar footer — "Indique Jurify" ao invés de upgrade CTA**

Substituir o bloco de upgrade CTA por referral banner estilo LíderHub:

```tsx
{/* Referral banner */}
<div className="px-2.5 pb-1 flex-shrink-0">
  <button
    type="button"
    onClick={() => onSectionChange('billing')}
    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted/50 hover:bg-muted/80 border border-border/40 transition-all duration-150 group"
  >
    <Gift className="h-3.5 w-3.5 text-primary flex-shrink-0" />
    <div className="flex-1 min-w-0 text-left">
      <p className="text-[10px] font-medium text-foreground/80 leading-tight">Indique Jurify</p>
      <p className="text-[9px] text-muted-foreground/60 leading-tight">Ganhe +R$200 por indicação</p>
    </div>
  </button>
</div>
```

- [ ] **Step 4: Adicionar imports necessários**

Adicionar `Mic`, `GraduationCap`, `Gift` aos imports de lucide-react.

- [ ] **Step 5: Testar compilação**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "refactor: sidebar LíderHub — remove SISTEMA, add Suporte/Academy/Vozes"
```

---

### Task 2: Atualizar Layout — top bar com workspace name

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Adicionar workspace name no header mobile**

No header mobile, após o logo, adicionar o nome do workspace (tenant):

```tsx
{/* Workspace name */}
<div className="flex items-center gap-1.5 min-w-0 flex-1">
  <Settings className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
  <span className="text-xs font-medium text-foreground truncate">
    {profile?.tenant_nome || 'Jurify'}
  </span>
  <ChevronDown className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
</div>
```

- [ ] **Step 2: Adicionar notification bell com badge no header**

```tsx
<button
  type="button"
  onClick={() => navigate('/notificacoes')}
  className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted"
>
  <Bell className="h-4 w-4 text-muted-foreground" />
  {unreadCount > 0 && (
    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</button>
```

- [ ] **Step 3: Testar compilação e visual**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: layout top bar — workspace name + notification bell"
```

---

### Task 3: Novas rotas — Suporte, Configurações sub-routes

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Adicionar lazy imports**

```typescript
const SuportePage = lazyWithRetry(() => import("./features/suporte/SuportePage"));
const ConfiguracoesPage = lazyWithRetry(() => import("./features/settings/ConfiguracoesPage"));
```

- [ ] **Step 2: Adicionar rotas**

```tsx
{/* Suporte */}
<Route path="suporte" element={<ErrorBoundary><SuportePage /></ErrorBoundary>} />

{/* Configurações — nova página com sidebar layout */}
<Route path="configuracoes" element={<ErrorBoundary><ConfiguracoesPage /></ErrorBoundary>} />
<Route path="configuracoes/:section" element={<ErrorBoundary><ConfiguracoesPage /></ErrorBoundary>} />
<Route path="configuracoes/:section/:subsection" element={<ErrorBoundary><ConfiguracoesPage /></ErrorBoundary>} />
```

Remover a rota antiga de configuracoes com `requiredRoles={['admin']}` — proteção será interna por seção.

- [ ] **Step 3: Adicionar redirects para itens do antigo SISTEMA**

```tsx
{/* Redirects — antigos itens do SISTEMA agora vivem em Configurações */}
<Route path="usuarios" element={<Navigate to="/configuracoes/empresa/membros" replace />} />
<Route path="departamentos" element={<Navigate to="/configuracoes/empresa/classes" replace />} />
<Route path="tags" element={<Navigate to="/configuracoes/empresa/classes" replace />} />
<Route path="integracoes" element={<Navigate to="/configuracoes/empresa/integracoes" replace />} />
<Route path="billing" element={<Navigate to="/configuracoes/cobranca/plano" replace />} />
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: routes — suporte page + configuracoes sub-routes + SISTEMA redirects"
```

---

### Task 4: Configurações — nova página com sidebar layout (estilo LíderHub)

**Files:**
- Create: `src/features/settings/ConfiguracoesPage.tsx`

- [ ] **Step 1: Criar a página principal com sidebar de navegação**

Layout: sidebar esquerda (250px) com seções PERFIL/EMPRESA/COBRANÇA + área de conteúdo à direita. Lê `:section` e `:subsection` da URL para renderizar o componente correto.

```tsx
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/utils';

type SettingsSection = {
  id: string;
  label: string;
  subsections?: { id: string; label: string }[];
};

const SETTINGS_NAV: { group: string; sections: SettingsSection[] }[] = [
  {
    group: 'PERFIL',
    sections: [
      { id: 'minha-conta', label: 'Minha Conta' },
      { id: 'seguranca', label: 'Segurança' },
      { id: 'notificacoes', label: 'Notificações' },
    ],
  },
  {
    group: 'EMPRESA',
    sections: [
      { id: 'geral', label: 'Geral' },
      { id: 'classes', label: 'Classes', subsections: [
        { id: 'status', label: 'Status' },
        { id: 'etiquetas', label: 'Etiquetas' },
        { id: 'departamento', label: 'Departamento' },
        { id: 'origem', label: 'Origem' },
        { id: 'variaveis', label: 'Variáveis' },
      ]},
      { id: 'templates', label: 'Templates' },
      { id: 'membros', label: 'Membros' },
      { id: 'integracoes', label: 'Integrações' },
      { id: 'horario-comercial', label: 'Horário Comercial' },
    ],
  },
  {
    group: 'COBRANÇA',
    sections: [
      { id: 'plano', label: 'Plano' },
      { id: 'uso', label: 'Uso' },
    ],
  },
];

const ConfiguracoesPage = () => {
  usePageTitle('Configurações');
  const { section = 'minha-conta', subsection } = useParams();
  const navigate = useNavigate();

  const navigateTo = (sectionId: string, subsectionId?: string) => {
    const path = subsectionId
      ? `/configuracoes/${sectionId}/${subsectionId}`
      : `/configuracoes/${sectionId}`;
    navigate(path);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Settings sidebar */}
      <aside className="w-56 border-r border-border bg-background overflow-y-auto flex-shrink-0">
        <nav className="py-4">
          {SETTINGS_NAV.map(group => (
            <div key={group.group} className="mb-4">
              <h3 className="px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">
                {group.group}
              </h3>
              <ul className="space-y-0.5">
                {group.sections.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => navigateTo(s.id, s.subsections?.[0]?.id)}
                      className={cn(
                        'w-full text-left px-4 py-1.5 text-sm transition-colors',
                        section === s.id
                          ? 'text-primary font-medium bg-primary/5'
                          : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {s.label}
                    </button>
                    {/* Subsections */}
                    {s.subsections && section === s.id && (
                      <ul className="ml-4 space-y-0.5 mt-0.5">
                        {s.subsections.map(sub => (
                          <li key={sub.id}>
                            <button
                              onClick={() => navigateTo(s.id, sub.id)}
                              className={cn(
                                'w-full text-left px-3 py-1 text-xs transition-colors',
                                subsection === sub.id
                                  ? 'text-primary font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto">
        <SettingsContent section={section} subsection={subsection} />
      </main>
    </div>
  );
};
```

- [ ] **Step 2: Criar SettingsContent que renderiza a seção correta**

```tsx
import { Suspense, lazy } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

// Reutilizar componentes existentes onde possível
import PerfilSection from '@/components/configuracoes/PerfilSection';
import EscritorioSection from '@/components/configuracoes/EscritorioSection';
import IntegracoesSection from '@/components/configuracoes/IntegracoesSection';
import UsuariosPermissoesSection from '@/components/configuracoes/UsuariosPermissoesSection';
import NotificacoesSection from '@/components/configuracoes/NotificacoesSection';
import AssinaturaSection from '@/components/configuracoes/AssinaturaSection';

function SettingsContent({ section, subsection }: { section: string; subsection?: string }) {
  const renderBreadcrumb = (path: string[]) => (
    <div className="text-xs text-muted-foreground mb-1">
      {path.join(' > ')}
    </div>
  );

  switch (section) {
    case 'minha-conta':
      return (
        <div className="p-6 max-w-3xl">
          {renderBreadcrumb(['Perfil', 'Minha Conta'])}
          <h1 className="text-lg font-semibold mb-1">Minha Conta</h1>
          <p className="text-sm text-muted-foreground mb-6">Gerencie suas informações pessoais e preferências.</p>
          <PerfilSection />
        </div>
      );
    case 'seguranca':
      return (
        <div className="p-6 max-w-3xl">
          {renderBreadcrumb(['Perfil', 'Segurança'])}
          <h1 className="text-lg font-semibold mb-1">Segurança</h1>
          <p className="text-sm text-muted-foreground mb-6">Gerencie sua senha e autenticação.</p>
          {/* Extrair a parte de senha do PerfilSection */}
          <PerfilSection />
        </div>
      );
    case 'notificacoes':
      return (
        <div className="p-6 max-w-3xl">
          {renderBreadcrumb(['Perfil', 'Notificações'])}
          <h1 className="text-lg font-semibold mb-1">Notificações</h1>
          <p className="text-sm text-muted-foreground mb-6">Configure como e quando deseja receber notificações.</p>
          <NotificacoesSection />
        </div>
      );
    case 'geral':
      return (
        <div className="p-6 max-w-3xl">
          {renderBreadcrumb(['Empresa', 'Geral'])}
          <h1 className="text-lg font-semibold mb-1">Geral</h1>
          <p className="text-sm text-muted-foreground mb-6">Gerencie as informações gerais da sua empresa.</p>
          <EscritorioSection />
        </div>
      );
    case 'classes':
      return (
        <div className="p-6 max-w-4xl">
          {renderBreadcrumb(['Empresa', 'Classes', subsection ? subsection.charAt(0).toUpperCase() + subsection.slice(1) : 'Status'])}
          <ClassesContent subsection={subsection || 'status'} />
        </div>
      );
    case 'membros':
      return (
        <div className="p-6 max-w-4xl">
          {renderBreadcrumb(['Empresa', 'Membros'])}
          <h1 className="text-lg font-semibold mb-1">Membros</h1>
          <p className="text-sm text-muted-foreground mb-6">Gerencie os membros e permissões da sua equipe.</p>
          <UsuariosPermissoesSection />
        </div>
      );
    case 'integracoes':
      return (
        <div className="p-6 max-w-4xl">
          {renderBreadcrumb(['Empresa', 'Integrações'])}
          <h1 className="text-lg font-semibold mb-1">Integrações</h1>
          <p className="text-sm text-muted-foreground mb-6">Conecte ferramentas externas e expanda suas funcionalidades.</p>
          <IntegracoesSection />
        </div>
      );
    case 'horario-comercial':
      return (
        <div className="p-6 max-w-3xl">
          {renderBreadcrumb(['Empresa', 'Horário Comercial'])}
          <HorarioComercialSection />
        </div>
      );
    case 'plano':
      return (
        <div className="p-6 max-w-3xl">
          {renderBreadcrumb(['Cobrança', 'Plano'])}
          <h1 className="text-lg font-semibold mb-1">Plano</h1>
          <p className="text-sm text-muted-foreground mb-6">Visualize e gerencie seu plano de assinatura.</p>
          <AssinaturaSection />
        </div>
      );
    case 'uso':
      return (
        <div className="p-6 max-w-3xl">
          {renderBreadcrumb(['Cobrança', 'Uso'])}
          <UsoSection />
        </div>
      );
    default:
      return (
        <div className="p-6">
          <p className="text-muted-foreground">Seção não encontrada.</p>
        </div>
      );
  }
}
```

- [ ] **Step 3: Testar compilação**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/ConfiguracoesPage.tsx
git commit -m "feat: settings page — sidebar layout estilo LíderHub (PERFIL/EMPRESA/COBRANÇA)"
```

---

### Task 5: Horário Comercial — nova seção

**Files:**
- Create: `src/features/settings/sections/HorarioComercialSection.tsx`

- [ ] **Step 1: Criar componente de horário comercial**

Conforme imagem 30 do LíderHub: 7 dias da semana, toggle ativo/fechado, inputs de horário início/fim.

```tsx
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type DaySchedule = {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
};

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'Segunda-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Terça-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Quarta-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Quinta-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Sexta-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Sábado', enabled: false, start: '08:00', end: '12:00' },
  { day: 'Domingo', enabled: false, start: '08:00', end: '12:00' },
];

export default function HorarioComercialSection() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const { toast } = useToast();

  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    setSchedule(prev => prev.map((d, i) => i === index ? { ...d, ...updates } : d));
  };

  const handleSave = () => {
    // TODO: Save to tenant configuracoes JSONB
    toast({ title: 'Horário comercial salvo com sucesso' });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">Horário Comercial</h1>
      <p className="text-sm text-muted-foreground mb-6">Defina os horários de funcionamento da sua empresa.</p>

      <div className="border rounded-lg divide-y">
        {schedule.map((day, i) => (
          <div key={day.day} className="flex items-center gap-4 px-4 py-3">
            <Switch
              checked={day.enabled}
              onCheckedChange={(checked) => updateDay(i, { enabled: checked })}
            />
            <span className="w-32 text-sm font-medium">{day.day}</span>
            <Input
              type="time"
              value={day.start}
              onChange={(e) => updateDay(i, { start: e.target.value })}
              disabled={!day.enabled}
              className="w-28 text-sm"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="time"
              value={day.end}
              onChange={(e) => updateDay(i, { end: e.target.value })}
              disabled={!day.enabled}
              className="w-28 text-sm"
            />
            <span className={`text-xs ml-auto ${day.enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
              {day.enabled ? 'Ativo' : 'Fechado'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave}>Salvar alterações</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/settings/sections/HorarioComercialSection.tsx
git commit -m "feat: horário comercial section — day toggles + time inputs"
```

---

### Task 6: Classes > Status Manager

**Files:**
- Create: `src/features/settings/sections/StatusManager.tsx`

- [ ] **Step 1: Criar gerenciador de status estilo LíderHub**

Conforme imagem 26: tabela com Nome (badge colorido), Descrição, Departamento, Contatos, Follow-ups. Botão "+ Criar Status".

```tsx
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';

// Reuse existing pipeline stages as status definitions
const STATUSES = [
  { name: 'Recepção', color: 'bg-blue-500', description: 'Status de recepção' },
  { name: 'Análise', color: 'bg-blue-600', description: 'Este lead está sendo avaliado' },
  { name: 'Desqualificado', color: 'bg-red-500', description: 'Este lead não tem um caso' },
  { name: 'Qualificado', color: 'bg-green-500', description: 'Este lead tem um caso que justifica' },
  { name: 'Proposta Recusada', color: 'bg-purple-500', description: 'Este lead recebeu a proposta' },
  { name: 'Proposta Aceita', color: 'bg-green-500', description: 'Este lead aceitou a proposta' },
  { name: 'Assinatura Pendente', color: 'bg-teal-500', description: 'Contrato enviado, aguardando' },
  { name: 'Contrato Assinado', color: 'bg-green-600', description: 'Quando o contrato já foi assinado' },
  { name: 'Reunião', color: 'bg-green-500', description: 'Quando o Lead deve receber' },
  { name: 'Desistência', color: 'bg-indigo-500', description: 'Sem conteúdo' },
];

export default function StatusManager() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">Status</h1>
          <p className="text-sm text-muted-foreground">Gerencie os status dos seus atendimentos e defina fluxos de trabalho.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Criar Status
        </Button>
      </div>

      {/* Search + columns toggle */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="Pesquisar status..."
          className="flex-1 max-w-md px-3 py-1.5 text-sm border rounded-md bg-background"
        />
        <Button variant="outline" size="sm">Colunas</Button>
      </div>

      {/* Status table */}
      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Nome</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Departamento</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Contatos</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Follow-ups</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {STATUSES.map(status => (
              <tr key={status.name} className="hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <Badge className={`${status.color} text-white text-xs`}>{status.name}</Badge>
                </td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground truncate max-w-[200px]">{status.description}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">-</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">0</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">0</td>
                <td className="px-4 py-2.5">
                  <button className="p-1 rounded hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{STATUSES.length} status</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/settings/sections/StatusManager.tsx
git commit -m "feat: status manager — CRUD table estilo LíderHub"
```

---

### Task 7: Suporte Page — Tickets

**Files:**
- Create: `src/features/suporte/SuportePage.tsx`

- [ ] **Step 1: Criar página de suporte com tabela de tickets**

Conforme imagem 32: tabela com Criação, Workspace, Conteúdo, Status, Tipo, Detalhes. Botão "+ Novo Ticket".

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Star, MoreHorizontal } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Input } from '@/components/ui/input';

export default function SuportePage() {
  usePageTitle('Suporte');
  const [search, setSearch] = useState('');

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Tickets</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os seus tickets de suporte</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Ticket
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="px-5 py-3 flex items-center gap-3 border-b border-border/50">
        <Input
          placeholder="Procurar por ticket"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm h-8 text-sm"
        />
        <Button variant="outline" size="sm">Status</Button>
        <Button variant="outline" size="sm">Data de criação: Mais recentes</Button>
        <Button variant="outline" size="sm">Mais filtros</Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <p className="text-xs text-muted-foreground mb-2">0 tickets</p>

        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Criação</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Workspace</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Conteúdo</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Detalhes</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  Nenhum ticket encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/suporte/SuportePage.tsx
git commit -m "feat: suporte page — tickets table estilo LíderHub"
```

---

## Chunk 2: Conexões — Painel Lateral de Detalhes

### Task 8: ConnectionDetailPanel — painel lateral com tabs

**Files:**
- Create: `src/features/conexoes/ConnectionDetailPanel.tsx`
- Modify: `src/features/conexoes/ConexoesManager.tsx`

- [ ] **Step 1: Criar ConnectionDetailPanel**

Conforme imagens 3-8: slide-in panel da direita com tabs Geral/Logs/Configurações/Ações. Geral mostra: avatar, nome editável, telefone, status (Conectado), última sincronização, verificação. Classes Padrão (status/departamento selectors). Responsável Padrão.

```tsx
import { useState } from 'react';
import { X, Pencil, RefreshCw, Check, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConnectionDetailPanelProps {
  connection: {
    id: string;
    instance_name: string;
    phone_number?: string;
    status: string;
    avatar_url?: string;
    created_at: string;
  };
  onClose: () => void;
}

export default function ConnectionDetailPanel({ connection, onClose }: ConnectionDetailPanelProps) {
  return (
    <div className="w-[480px] h-full border-l bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <h2 className="text-base font-semibold">Detalhes da Instância</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-5 mt-3 w-fit">
          <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
          <TabsTrigger value="configuracoes" className="text-xs">Configurações</TabsTrigger>
          <TabsTrigger value="acoes" className="text-xs">Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="flex-1 overflow-y-auto px-5 py-4">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-3 relative">
              {connection.avatar_url ? (
                <img src={connection.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {connection.instance_name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <RefreshCw className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <h3 className="text-base font-semibold">{connection.instance_name}</h3>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
            {connection.phone_number && (
              <p className="text-sm text-muted-foreground">{connection.phone_number}</p>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between py-3 border-t">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${connection.status === 'ativa' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {connection.status === 'ativa' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <button className="flex items-center gap-1 text-sm text-primary hover:underline">
              Ver eventos <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {/* Sync info */}
          <div className="space-y-2 py-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Última sincronização há 2min.</span>
              <button className="text-primary text-sm hover:underline">Ver mais</button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Verificado há 2min.</span>
            </div>
          </div>

          {/* Classes Padrão */}
          <div className="py-3 border-t">
            <h4 className="text-sm font-semibold mb-2">Classes Padrão</h4>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border rounded-md hover:bg-muted/50">
                Selecionar status padrão
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border rounded-md hover:bg-muted/50">
                Selecionar departamento padrão
              </button>
            </div>
          </div>

          {/* Responsável Padrão */}
          <div className="py-3 border-t">
            <h4 className="text-sm font-semibold mb-2">Responsável Padrão</h4>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border rounded-md hover:bg-muted/50">
              Selecionar responsável padrão
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              Sempre que uma nova conversa for iniciada com este contato, o responsável abaixo será associado automaticamente.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted-foreground">Nenhum log disponível.</p>
        </TabsContent>

        <TabsContent value="configuracoes" className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted-foreground">Configurações da instância.</p>
        </TabsContent>

        <TabsContent value="acoes" className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">Reiniciar instância</Button>
            <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
              Desconectar instância
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Integrar o painel no ConexoesManager**

No `ConexoesManager.tsx`, adicionar estado `selectedConnection` e renderizar o painel lateral quando uma conexão é clicada:

```tsx
// Estado
const [selectedConnection, setSelectedConnection] = useState<Conexao | null>(null);

// Layout: flex com tabela à esquerda e painel à direita
<div className="flex h-full">
  <div className={cn("flex-1 overflow-y-auto", selectedConnection && "border-r")}>
    {/* tabela existente — onClick row → setSelectedConnection */}
  </div>
  {selectedConnection && (
    <ConnectionDetailPanel
      connection={selectedConnection}
      onClose={() => setSelectedConnection(null)}
    />
  )}
</div>
```

- [ ] **Step 3: Testar compilação**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/features/conexoes/ConnectionDetailPanel.tsx src/features/conexoes/ConexoesManager.tsx
git commit -m "feat: conexões — painel lateral de detalhes com tabs (Geral/Logs/Config/Ações)"
```

---

## Chunk 3: Conversas — Tabs + Filtros Avançados

### Task 9: WhatsAppIA — adicionar tabs AI/Ativos/Pendentes/Grupos

**Files:**
- Modify: `src/features/whatsapp/WhatsAppIA.tsx`

- [ ] **Step 1: Substituir tabs de filtro existentes por AI/Ativos/Pendentes/Grupos**

Substituir os 3 filtros atuais (Todos/Leads/Agendados) por 4 tabs com badges de contagem, conforme imagem 9:

```tsx
type ConversationTab = 'ia' | 'ativos' | 'pendentes' | 'grupos';

const [activeTab, setActiveTab] = useState<ConversationTab>('ativos');

// Contagens por tab
const tabCounts = useMemo(() => ({
  ia: conversations.filter(c => c.ia_ativa).length,
  ativos: conversations.filter(c => c.status === 'ativa' && !c.ia_ativa).length,
  pendentes: conversations.filter(c => c.status === 'pendente' || c.unread_count > 0).length,
  grupos: conversations.filter(c => c.is_group).length,
}), [conversations]);

// Render tabs
<div className="flex items-center justify-around border-b">
  {(['ia', 'ativos', 'pendentes', 'grupos'] as const).map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={cn(
        'flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors relative',
        activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {/* Icon + Badge */}
      <div className="relative">
        {tab === 'ia' && <Bot className="h-4 w-4" />}
        {tab === 'ativos' && <MessageCircle className="h-4 w-4" />}
        {tab === 'pendentes' && <Clock className="h-4 w-4" />}
        {tab === 'grupos' && <Users className="h-4 w-4" />}
        {tabCounts[tab] > 0 && (
          <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold">
            {tabCounts[tab]}
          </span>
        )}
      </div>
      <span className="mt-0.5">{tab === 'ia' ? 'AI' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
      {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Adicionar filtros Responsável + Status na header**

```tsx
<div className="flex items-center gap-2 px-3 py-2 border-b">
  <Button variant="outline" size="sm" className="text-xs h-7">
    <Users className="h-3 w-3 mr-1" /> Responsável
  </Button>
  <Button variant="outline" size="sm" className="text-xs h-7">
    Status
  </Button>
  <Button variant="outline" size="sm" className="text-xs h-7">
    Mais filtros
  </Button>
  {/* New contact button */}
  <button className="ml-auto h-7 w-7 flex items-center justify-center rounded-md border hover:bg-muted">
    <UserPlus className="h-3.5 w-3.5" />
  </button>
</div>
```

- [ ] **Step 3: Adicionar "Arquivados" toggle na lista**

```tsx
{/* Arquivados header */}
<button
  onClick={() => setShowArchived(!showArchived)}
  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
>
  <Archive className="h-3 w-3" />
  <span>Arquivados</span>
  <Badge variant="secondary" className="text-[9px] h-4">{archivedCount}</Badge>
</button>
```

- [ ] **Step 4: Filtrar conversas por tab ativa**

```tsx
const filteredConversations = useMemo(() => {
  let filtered = conversations;
  switch (activeTab) {
    case 'ia': filtered = filtered.filter(c => c.ia_ativa); break;
    case 'ativos': filtered = filtered.filter(c => c.status === 'ativa'); break;
    case 'pendentes': filtered = filtered.filter(c => c.status !== 'ativa' || c.unread_count > 0); break;
    case 'grupos': filtered = filtered.filter(c => c.is_group); break;
  }
  if (search) {
    filtered = filtered.filter(c =>
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number?.includes(search)
    );
  }
  return filtered;
}, [conversations, activeTab, search]);
```

- [ ] **Step 5: Testar compilação**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add src/features/whatsapp/WhatsAppIA.tsx
git commit -m "feat: conversas — tabs AI/Ativos/Pendentes/Grupos + filtros Responsável/Status"
```

---

## Chunk 4: Contatos — Tabela Estilo LíderHub

### Task 10: CRMDashboard — redesign para tabela de contatos

**Files:**
- Modify: `src/features/crm/CRMDashboard.tsx`

- [ ] **Step 1: Redesign header com filtros inline**

Conforme imagem 15: header limpo com busca + Responsável + Status + Mais filtros + botão novo contato.

```tsx
<header className="flex-shrink-0 px-5 py-3 border-b border-border">
  <div className="flex items-center gap-3">
    <div className="flex-1">
      <Input
        placeholder="Pesquisar contatos..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md h-8 text-sm"
        prefix={<Search className="h-3.5 w-3.5" />}
      />
    </div>
    <Button variant="outline" size="sm" className="text-xs">Responsável</Button>
    <Button variant="outline" size="sm" className="text-xs">Status</Button>
    <Button variant="outline" size="sm" className="text-xs">Mais filtros</Button>
    <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Novo</Button>
  </div>
</header>
```

- [ ] **Step 2: Tabela de contatos com colunas LíderHub**

Conforme imagem 15: checkbox, Foto, Nome, Telefone, Responsável, Ticket, Status, Departamento, Tags.

```tsx
<table className="w-full">
  <thead>
    <tr className="border-b bg-muted/30">
      <th className="w-10 px-3"><Checkbox /></th>
      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Foto</th>
      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Nome</th>
      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Telefone</th>
      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Responsável</th>
      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Ticket</th>
      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Departamento</th>
      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Tags</th>
    </tr>
  </thead>
  <tbody className="divide-y">
    {leads.map(lead => (
      <tr key={lead.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/crm/lead/${lead.id}`)}>
        <td className="px-3"><Checkbox /></td>
        <td className="px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-medium">{lead.nome?.charAt(0) || '?'}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-sm font-medium">{lead.nome || 'Sem nome'}</td>
        <td className="px-3 py-2 text-sm text-muted-foreground font-mono">{lead.telefone}</td>
        <td className="px-3 py-2 text-sm text-muted-foreground">—</td>
        <td className="px-3 py-2">
          <Badge variant="outline" className="text-xs">{lead.ticket_status || 'Pendente'}</Badge>
        </td>
        <td className="px-3 py-2">
          <Badge className="text-xs">{lead.status_pipeline || '—'}</Badge>
        </td>
        <td className="px-3 py-2 text-sm text-muted-foreground">{lead.departamento || '—'}</td>
        <td className="px-3 py-2 text-sm text-muted-foreground">—</td>
      </tr>
    ))}
  </tbody>
</table>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/crm/CRMDashboard.tsx
git commit -m "feat: contatos — tabela estilo LíderHub (Foto/Nome/Telefone/Status/Dept/Tags)"
```

---

## Chunk 5: Kanban — Agrupamento por Categoria

### Task 11: PipelineJuridico — adicionar seletor de agrupamento

**Files:**
- Modify: `src/features/pipeline/PipelineJuridico.tsx`

- [ ] **Step 1: Adicionar dropdown de agrupamento**

Conforme imagens 16-17: dropdown "Agrupar: Ticket / Responsável / Departamento" no canto superior direito.

```tsx
type GroupBy = 'ticket' | 'responsavel' | 'departamento';
const [groupBy, setGroupBy] = useState<GroupBy>('ticket');

// No header, adicionar:
<div className="flex items-center gap-2">
  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
    <SelectTrigger className="w-52 h-8 text-xs">
      <LayoutGrid className="h-3.5 w-3.5 mr-1" />
      <SelectValue>Agrupar: {groupBy === 'ticket' ? 'Ticket' : groupBy === 'responsavel' ? 'Responsável' : 'Departamento'}</SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ticket">Ticket</SelectItem>
      <SelectItem value="responsavel">Responsável</SelectItem>
      <SelectItem value="departamento">Departamento</SelectItem>
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 2: Agrupar leads dinamicamente**

```tsx
const groupedLeads = useMemo(() => {
  const groups: Record<string, typeof filteredLeads> = {};
  for (const lead of filteredLeads) {
    let key: string;
    switch (groupBy) {
      case 'responsavel': key = lead.responsavel_nome || 'Sem responsável'; break;
      case 'departamento': key = lead.departamento || 'Sem departamento'; break;
      default: key = lead.status_pipeline || 'Sem status';
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(lead);
  }
  return groups;
}, [filteredLeads, groupBy]);
```

- [ ] **Step 3: Renderizar colunas baseadas no agrupamento**

Substituir as colunas fixas de stages por colunas dinâmicas baseadas em `groupedLeads`.

- [ ] **Step 4: Commit**

```bash
git add src/features/pipeline/PipelineJuridico.tsx
git commit -m "feat: kanban — agrupamento dinâmico por Ticket/Responsável/Departamento"
```

---

## Chunk 6: Agentes IA — Hero + Editor

### Task 12: AgentesIAManager — hero gradient + criador de agentes

**Files:**
- Modify: `src/features/ai-agents/AgentesIAManager.tsx`

- [ ] **Step 1: Adicionar hero section com gradient**

Conforme imagem 18: hero escuro com gradient azul, logo, "Crie seu agente de IA" + campo de prompt.

```tsx
{/* Hero Section */}
<div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-xl p-8 mb-6 text-white relative overflow-hidden">
  <button className="absolute top-4 right-4 text-xs text-white/60 hover:text-white flex items-center gap-1">
    <HelpCircle className="h-3.5 w-3.5" /> Como funciona?
  </button>

  <div className="flex flex-col items-center text-center">
    <div className="flex items-center gap-2 mb-2">
      <Scale className="h-8 w-8" />
      <span className="text-2xl font-bold">Jurify</span>
    </div>
    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
      Crie seu agente de IA
      <Badge className="bg-amber-500 text-white text-[10px]">BETA</Badge>
    </h2>

    {/* Prompt input */}
    <div className="w-full max-w-2xl mt-4 bg-slate-800/80 rounded-lg border border-white/10">
      <textarea
        placeholder="Crie um agente de BPC LOAS"
        className="w-full bg-transparent text-white placeholder:text-white/40 px-4 py-3 text-sm resize-none focus:outline-none"
        rows={2}
      />
      <div className="flex items-center gap-2 px-3 pb-2">
        <Button size="sm" variant="secondary" className="text-xs h-7">
          Anexar
        </Button>
        <Button size="sm" variant="secondary" className="text-xs h-7">
          Fechar contrato
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-white/10"><Mic className="h-4 w-4 text-white/60" /></button>
          <button className="p-1.5 rounded hover:bg-white/10"><Plus className="h-4 w-4 text-white/60" /></button>
        </div>
      </div>
    </div>

    <button className="mt-3 text-sm text-white/60 hover:text-white flex items-center gap-1">
      Iniciar do zero <ArrowRight className="h-3.5 w-3.5" />
    </button>
  </div>
</div>
```

- [ ] **Step 2: Substituir grid de cards por tabs Meus Agentes/Templates + tabela**

```tsx
<Tabs defaultValue="meus-agentes">
  <TabsList>
    <TabsTrigger value="meus-agentes" className="text-xs">Meus Agentes</TabsTrigger>
    <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
  </TabsList>

  <TabsContent value="meus-agentes">
    {/* Search + Criar Pasta */}
    <div className="flex items-center gap-3 my-3">
      <Input placeholder="Pesquisar agentes..." className="max-w-md h-8 text-sm" />
      <Button variant="outline" size="sm" className="ml-auto text-xs">Criar Pasta</Button>
    </div>

    {/* Agent table */}
    <table className="w-full border rounded-lg">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="w-10 px-3"><Checkbox /></th>
          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Agente</th>
          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Delay</th>
          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Palavra-chave</th>
          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {agentes.map(agente => (
          <tr key={agente.id} className="hover:bg-muted/20 cursor-pointer">
            <td className="px-3"><Checkbox /></td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-3">
                <button className="text-muted-foreground"><GripVertical className="h-4 w-4" /></button>
                <button className="text-muted-foreground"><ChevronRight className="h-4 w-4" /></button>
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div>
                  <p className="text-sm font-medium">{agente.agente_nome}</p>
                  <p className="text-xs text-muted-foreground">Agentes criados com base no template</p>
                </div>
              </div>
            </td>
            <td className="px-3 py-2 text-sm text-muted-foreground">-</td>
            <td className="px-3 py-2 text-sm text-muted-foreground">-</td>
            <td className="px-3 py-2">
              <button className="p-1 rounded hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </TabsContent>
</Tabs>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/ai-agents/AgentesIAManager.tsx
git commit -m "feat: agentes IA — hero gradient + tabela Meus Agentes/Templates estilo LíderHub"
```

---

## Chunk 7: Dashboard — Cards de Status + Analytics

### Task 13: Dashboard — redesign para eventos por status

**Files:**
- Modify: `src/features/dashboard/Dashboard.tsx`

- [ ] **Step 1: Header com filtros estilo LíderHub**

Conforme imagem 1: título + toggle Evento/Cohort + Origens + Diário + Date range.

```tsx
<header className="flex-shrink-0 px-5 py-3 border-b border-border">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Visão geral das métricas de conversas</p>
    </div>
    <div className="flex items-center gap-2">
      {/* Evento/Cohort toggle */}
      <div className="flex border rounded-md">
        <button className="px-3 py-1 text-xs bg-muted font-medium rounded-l-md">Evento</button>
        <button className="px-3 py-1 text-xs text-muted-foreground rounded-r-md">Cohort</button>
      </div>
      <Button variant="outline" size="sm" className="text-xs">Origens</Button>
      <Button variant="outline" size="sm" className="text-xs">Diário</Button>
      <Button variant="outline" size="sm" className="text-xs">
        <CalendarDays className="h-3.5 w-3.5 mr-1" />
        {dateRange}
      </Button>
    </div>
  </div>
</header>
```

- [ ] **Step 2: Cards de eventos por status (6 cards)**

```tsx
<div>
  <h3 className="text-sm font-medium text-muted-foreground mb-3">Eventos por Status</h3>
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
      { label: 'NOVA CON...', icon: MessageSquare, value: totalLeads, pct: '100.0%', color: 'text-foreground' },
      { label: 'ANÁLISE', icon: Search, value: analiseCount, pct: `${analisePct}%`, color: 'text-blue-600' },
      { label: 'QUALIFICA...', icon: CheckCircle, value: qualifCount, pct: `${qualifPct}%`, color: 'text-green-600' },
      { label: 'PROPOSTA', icon: FileText, value: propostaCount, pct: `${propostaPct}%`, color: 'text-purple-600' },
      { label: 'SUCESSO', icon: Trophy, value: sucessoCount, pct: `${sucessoPct}%`, color: 'text-emerald-600' },
      { label: 'PERDAS', icon: XCircle, value: perdasCount, pct: `${perdasPct}%`, color: 'text-red-600' },
    ].map(card => (
      <div key={card.label} className="border rounded-lg p-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <card.icon className="h-3.5 w-3.5" />
          <span className="font-medium uppercase truncate">{card.label}</span>
        </div>
        <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        <p className="text-xs text-muted-foreground">{card.pct}</p>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Seção "Análise de Performance" com gráfico temporal**

```tsx
<div className="mt-6">
  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
    <TrendingUp className="h-4 w-4" />
    Análise de Performance
  </h3>
  <div className="border rounded-lg p-4">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-sm font-medium flex items-center gap-1">
        Evolução Temporal <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
      </h4>
      <Select defaultValue="periodo">
        <SelectTrigger className="w-32 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="periodo">Por período</SelectItem>
          <SelectItem value="diario">Diário</SelectItem>
        </SelectContent>
      </Select>
    </div>
    {/* Chart placeholder — use existing recharts setup */}
    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
      Gráfico de Evolução Temporal
    </div>
    {/* Legend */}
    <div className="flex flex-wrap gap-4 mt-3 text-xs">
      {['Nova Conversa', 'Análise', 'Qualificado', 'Proposta', 'Sucesso', 'Não Qualificado', 'Proposta Recusada', 'Desistência'].map(label => (
        <span key={label} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {label}
        </span>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/Dashboard.tsx
git commit -m "feat: dashboard — cards eventos por status + evolução temporal estilo LíderHub"
```

---

## Chunk 8: Tarefas — Redesign com Pontuação Fibonacci

### Task 14: AgendamentosManager — redesign para sistema de tarefas

**Files:**
- Modify: `src/features/scheduling/AgendamentosManager.tsx`

- [ ] **Step 1: Atualizar header e título**

```tsx
<header className="flex-shrink-0 px-5 py-3 border-b border-border">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-lg font-semibold">Tarefas</h1>
      <p className="text-sm text-muted-foreground">Gerencie suas tarefas e acompanhe o progresso.</p>
    </div>
    <Button size="sm">
      <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
    </Button>
  </div>
</header>
```

- [ ] **Step 2: Filtros inline estilo LíderHub**

Conforme imagem 21: busca + Status + Responsável + Data de criação.

```tsx
<div className="px-5 py-2.5 flex items-center gap-3 border-b border-border/50">
  <Input placeholder="Buscar tarefas..." className="max-w-sm h-8 text-sm" />
  <Button variant="outline" size="sm" className="text-xs">Status</Button>
  <Button variant="outline" size="sm" className="text-xs">Responsável</Button>
  <Button variant="outline" size="sm" className="text-xs">Data de criação</Button>
</div>
```

- [ ] **Step 3: Tabela com colunas LíderHub**

Conforme imagem 21: Título, Prazo, PTS, Chat, Responsável, Criador.

```tsx
<table className="w-full">
  <thead>
    <tr className="border-b bg-muted/30">
      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Título</th>
      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Prazo</th>
      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">PTS</th>
      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Chat</th>
      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Responsável</th>
      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Criador</th>
    </tr>
  </thead>
  <tbody>
    {agendamentos.length === 0 ? (
      <tr>
        <td colSpan={6} className="text-center py-12">
          <div className="flex flex-col items-center gap-2">
            <ListTodo className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
          </div>
        </td>
      </tr>
    ) : (
      agendamentos.map(a => (
        <tr key={a.id} className="border-b hover:bg-muted/20 cursor-pointer">
          <td className="px-4 py-2.5 text-sm font-medium">{a.titulo}</td>
          <td className="px-4 py-2.5 text-sm text-muted-foreground">{formatDate(a.data_hora)}</td>
          <td className="px-4 py-2.5 text-sm text-muted-foreground">1</td>
          <td className="px-4 py-2.5 text-sm text-muted-foreground">—</td>
          <td className="px-4 py-2.5 text-sm text-muted-foreground">{a.responsavel || '—'}</td>
          <td className="px-4 py-2.5 text-sm text-muted-foreground">—</td>
        </tr>
      ))
    )}
  </tbody>
</table>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/scheduling/AgendamentosManager.tsx
git commit -m "feat: tarefas — tabela com Título/Prazo/PTS/Chat/Responsável estilo LíderHub"
```

---

## Chunk 9: Base de Conhecimento

### Task 15: Habilitar Base de Conhecimento

**Files:**
- Modify: `src/components/Sidebar.tsx` (já feito no Task 1)
- Create: `src/features/ai-agents/BaseConhecimento.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar página Base de Conhecimento**

Conforme imagem 20: tabela com Nome, Tipo, Agentes, Atualização. Botão "+ Adicionar Documento".

```tsx
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Input } from '@/components/ui/input';

export default function BaseConhecimento() {
  usePageTitle('Base de Conhecimento');

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex-shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Base de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">Centralize e gerencie todo o conhecimento da sua organização</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Adicionar Documento
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        <Input placeholder="Pesquisar por nome, conteúdo ou ID..." className="max-w-md h-8 text-sm mb-3" />

        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 px-3 py-2"><input type="checkbox" /></th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Nome</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Agentes</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Atualização</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                  Nenhum documento encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">0 documentos</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar rota em App.tsx**

```tsx
const BaseConhecimento = lazyWithRetry(() => import("./features/ai-agents/BaseConhecimento"));
// ...
<Route path="base-conhecimento" element={<ErrorBoundary><BaseConhecimento /></ErrorBoundary>} />
```

- [ ] **Step 3: Commit**

```bash
git add src/features/ai-agents/BaseConhecimento.tsx src/App.tsx
git commit -m "feat: base de conhecimento — página com tabela de documentos"
```

---

## Chunk 10: Integração Final + Testes

### Task 16: Wiring — garantir que tudo compila e navega corretamente

- [ ] **Step 1: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 2: Verificar lint**

```bash
npm run lint 2>&1 | head -30
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4: Verificar testes existentes**

```bash
npm run test 2>&1 | tail -20
```

- [ ] **Step 5: Fix quaisquer erros encontrados**

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "fix: resolve compilation errors from LíderHub redesign"
```

---

## Summary of Files Changed

| File | Change Type | Description |
|------|------------|-------------|
| `src/components/Sidebar.tsx` | MODIFY | Remove SISTEMA, add Suporte/Academy/Vozes, referral banner |
| `src/components/Layout.tsx` | MODIFY | Workspace name + notification bell in header |
| `src/App.tsx` | MODIFY | New routes + SISTEMA redirects |
| `src/features/settings/ConfiguracoesPage.tsx` | CREATE | Settings with sidebar layout (PERFIL/EMPRESA/COBRANÇA) |
| `src/features/settings/sections/HorarioComercialSection.tsx` | CREATE | Business hours with day toggles |
| `src/features/settings/sections/StatusManager.tsx` | CREATE | Status CRUD table |
| `src/features/suporte/SuportePage.tsx` | CREATE | Support tickets page |
| `src/features/conexoes/ConnectionDetailPanel.tsx` | CREATE | Right-side detail panel with tabs |
| `src/features/conexoes/ConexoesManager.tsx` | MODIFY | Integrate detail panel |
| `src/features/whatsapp/WhatsAppIA.tsx` | MODIFY | Tabs AI/Ativos/Pendentes/Grupos + filters |
| `src/features/crm/CRMDashboard.tsx` | MODIFY | Contact table redesign |
| `src/features/pipeline/PipelineJuridico.tsx` | MODIFY | Group by selector |
| `src/features/ai-agents/AgentesIAManager.tsx` | MODIFY | Hero gradient + agent table |
| `src/features/ai-agents/BaseConhecimento.tsx` | CREATE | Knowledge base page |
| `src/features/dashboard/Dashboard.tsx` | MODIFY | Status event cards + temporal chart |
| `src/features/scheduling/AgendamentosManager.tsx` | MODIFY | Tasks table redesign |
