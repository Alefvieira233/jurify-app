
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scale,
  MessageSquare,
  MessageCircle,
  Calendar,
  LayoutDashboard,
  BarChart3,
  Settings,
  Users,
  Bot,
  TrendingUp,
  UserCog,
  LogOut,
  Activity,
  CreditCard,
  Rocket,
  Search,
  HelpCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Gavel,
  ShieldCheck,
  Link2,
  BookOpen,
  Building2,
  Tags,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

type MenuLeaf = {
  id:         string;
  label:      string;
  icon:       React.ComponentType<{ className?: string }>;
  resource:   string;
  action:     string;
  adminOnly?: boolean;
  managerOk?: boolean;
  badge?:     'notification' | 'upgrade';
  disabled?:  boolean;
};

type MenuSection = {
  id:         string;
  label:      string;
  icon:       React.ComponentType<{ className?: string }>;
  children:   MenuLeaf[];
};

type NavEntry = (MenuLeaf & { kind: 'leaf' }) | (MenuSection & { kind: 'section' });

/* ─────────────────────────────────────────────────────────────────────────
   Navigation structure — LíderHub pattern
   Main  → flat items + expandable sections (Atendimento, Automações)
   Sistema → collapsible group at the bottom
───────────────────────────────────────────────────────────────────────── */
const MAIN_NAV: NavEntry[] = [
  { kind: 'leaf', id: 'dashboard', label: 'Home', icon: LayoutDashboard, resource: 'dashboard', action: 'read' },
  // Conexões is inside Admin section — no duplicate top-level leaf
  {
    kind: 'section',
    id: 'atendimento',
    label: 'Atendimento',
    icon: MessageSquare,
    children: [
      { id: 'whatsapp', label: 'Conversas',  icon: MessageCircle, resource: 'whatsapp', action: 'read' },
      { id: 'crm',      label: 'Contatos',   icon: Users,         resource: 'leads',    action: 'read' },
      { id: 'pipeline', label: 'Kanban',     icon: TrendingUp,    resource: 'leads',    action: 'read' },
    ],
  },
  {
    kind: 'section',
    id: 'automacoes',
    label: 'Automações',
    icon: Bot,
    children: [
      { id: 'agentes',             label: 'Agentes',              icon: Bot,      resource: 'agentes_ia', action: 'read' },
      { id: 'base-conhecimento',   label: 'Base de Conhecimento', icon: BookOpen, resource: 'agentes_ia', action: 'read', disabled: true },
    ],
  },
  {
    kind: 'section',
    id: 'operacao',
    label: 'Operação',
    icon: Building2,
    children: [
      { id: 'agendamentos',   label: 'Tarefas',        icon: Calendar,  resource: 'agendamentos',   action: 'read' },
      { id: 'usuarios',       label: 'Equipe',         icon: UserCog,   resource: 'usuarios',        action: 'read', managerOk: true },
      { id: 'departamentos',  label: 'Departamentos',  icon: Building2, resource: 'departamentos',   action: 'read' },
      { id: 'tags',           label: 'Tags',           icon: Tags,      resource: 'tags',            action: 'read' },
    ],
  },
  {
    kind: 'section',
    id: 'juridico',
    label: 'Jurídico',
    icon: Gavel,
    children: [
      { id: 'processos',   label: 'Processos',    icon: Gavel,      resource: 'processos',   action: 'read' },
      { id: 'prazos',      label: 'Prazos',       icon: Clock,      resource: 'prazos',      action: 'read' },
      { id: 'honorarios',  label: 'Honorários',   icon: DollarSign, resource: 'honorarios',  action: 'read', managerOk: true },
      { id: 'documentos',  label: 'Documentos',   icon: FolderOpen, resource: 'documentos',  action: 'read' },
    ],
  },
  {
    kind: 'section',
    id: 'admin',
    label: 'Administração',
    icon: Settings,
    children: [
      { id: 'conexoes',      label: 'Conexões',       icon: Link2,      resource: 'conexoes',       action: 'read' },
      { id: 'configuracoes', label: 'Configurações',   icon: Settings,   resource: 'configuracoes',  action: 'read' },
      { id: 'relatorios',    label: 'Métricas',        icon: BarChart3,  resource: 'relatorios',     action: 'read' },
    ],
  },
];

const SISTEMA_NAV: MenuLeaf[] = [
  { id: 'auditoria',             label: 'Auditoria',      icon: ShieldCheck, resource: 'logs',          action: 'read', managerOk: true },
  { id: 'billing',               label: 'Assinatura',     icon: CreditCard,  resource: 'dashboard',     action: 'read', badge: 'upgrade' },
  { id: 'logs',                  label: 'Logs',           icon: Activity,    resource: 'logs',          action: 'read', adminOnly: true },
  { id: 'admin/mission-control', label: 'Monitoramento',  icon: Rocket,      resource: 'dashboard',     action: 'read', adminOnly: true },
];

/** All sistema IDs for auto-expand logic */
const SISTEMA_IDS = SISTEMA_NAV.map(i => i.id);

/** All leaf items flattened (for RBAC filtering) */
function allLeaves(): MenuLeaf[] {
  const out: MenuLeaf[] = [];
  for (const entry of MAIN_NAV) {
    if (entry.kind === 'leaf') out.push(entry);
    else for (const child of entry.children) out.push(child);
  }
  for (const item of SISTEMA_NAV) out.push(item);
  return out;
}
const ALL_LEAVES = allLeaves();

/* ─────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────── */
const Sidebar = ({ activeSection, onSectionChange }: SidebarProps) => {
  const { signOut, profile, user, hasPermission } = useAuth();
  const [unreadCount, setUnreadCount]   = useState(0);
  const [visibleIds, setVisibleIds]     = useState<Set<string>>(new Set());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Auto-expand sections containing the active route
    for (const entry of MAIN_NAV) {
      if (entry.kind === 'section' && entry.children.some(c => c.id === activeSection)) {
        initial.add(entry.id);
      }
    }
    if (SISTEMA_IDS.includes(activeSection)) initial.add('sistema');
    return initial;
  });

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  /* ── RBAC filter ── */
  useEffect(() => {
    const filter = async () => {
      if (!user) { setVisibleIds(new Set()); return; }

      const ids = new Set<string>();

      if (!profile) {
        // Fallback: show non-admin, non-manager items
        for (const item of ALL_LEAVES) {
          if (!item.adminOnly && !item.managerOk) ids.add(item.id);
        }
        setVisibleIds(ids);
        return;
      }

      for (const item of ALL_LEAVES) {
        if (item.disabled) { ids.add(item.id); continue; } // always show disabled items
        if (profile.role === 'admin') { ids.add(item.id); continue; }
        if (item.adminOnly) continue;
        if (item.managerOk && profile.role !== 'manager') continue;
        try {
          if (await hasPermission(item.resource, item.action)) ids.add(item.id);
        } catch {
          ids.add(item.id);
        }
      }

      if (ids.size === 0) {
        for (const item of ALL_LEAVES) {
          if (!item.adminOnly && !item.managerOk) ids.add(item.id);
        }
      }

      setVisibleIds(ids);
    };
    void filter();
  }, [user, profile, hasPermission]);

  /* ── Auto-expand sections if active route is inside ── */
  useEffect(() => {
    for (const entry of MAIN_NAV) {
      if (entry.kind === 'section' && entry.children.some(c => c.id === activeSection)) {
        setExpandedSections(prev => {
          if (prev.has(entry.id)) return prev;
          const next = new Set(prev);
          next.add(entry.id);
          return next;
        });
      }
    }
    if (SISTEMA_IDS.includes(activeSection)) {
      setExpandedSections(prev => {
        if (prev.has('sistema')) return prev;
        const next = new Set(prev);
        next.add('sistema');
        return next;
      });
    }
  }, [activeSection]);

  /* ── Unread notifications (30s poll) ── */
  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase.rpc('contar_nao_lidas', { user_id: user.id });
        if (!error && data !== null) setUnreadCount(data);
      } catch { /* silent */ }
    };
    void fetch();
    const t = setInterval(() => { void fetch(); }, 30_000);
    return () => clearInterval(t);
  }, [user?.id]);

  /* ── Filtered sistema items ── */
  const filteredSistemaItems = useMemo(
    () => SISTEMA_NAV.filter(i => visibleIds.has(i.id)),
    [visibleIds]
  );

  const isFreeTier = !profile?.subscription_tier || profile.subscription_tier === 'free';

  const userInitial = profile?.nome_completo?.charAt(0).toUpperCase()
    || user?.email?.charAt(0).toUpperCase()
    || 'U';
  const userName = profile?.nome_completo || user?.email || 'Usuário';
  const userRoleLabel = profile?.role === 'admin'   ? 'Admin'
    : profile?.role === 'manager' ? 'Gestor'
    : 'Usuário';

  /* ── Render a single leaf nav item ── */
  const renderLeaf = (item: MenuLeaf, indent = false) => {
    const Icon     = item.icon;
    const isActive = activeSection === item.id;
    const isDisabled = item.disabled;

    return (
      <li key={item.id} role="listitem" className="relative">
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full pointer-events-none"
            aria-hidden
          />
        )}
        <button
          type="button"
          onClick={() => !isDisabled && onSectionChange(item.id)}
          disabled={isDisabled}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`${item.label}${item.badge === 'notification' && unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}${isDisabled ? ' (em breve)' : ''}`}
          className={cn(
            'group w-full flex items-center gap-2.5 py-1.5 rounded-md text-xs transition-all duration-150 text-left',
            indent ? 'pl-6 pr-2.5' : (isActive ? 'pl-3.5 pr-2.5' : 'px-2.5'),
            isActive && indent && 'pl-7',
            isDisabled
              ? 'text-sidebar-foreground/25 cursor-not-allowed'
              : isActive
              ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
              : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 active:bg-accent/80 hover:text-sidebar-foreground/85 font-normal'
          )}
        >
          <Icon
            className={cn(
              'h-3.5 w-3.5 flex-shrink-0 transition-colors duration-150',
              isDisabled
                ? 'text-sidebar-foreground/20'
                : isActive
                ? 'text-primary'
                : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/65'
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>

          {isDisabled && (
            <span className="text-[8px] text-sidebar-foreground/25 font-medium uppercase tracking-wide">
              Em breve
            </span>
          )}

          {item.badge === 'notification' && unreadCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[9px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}

          {item.badge === 'upgrade' && isFreeTier && (
            <Badge
              variant="outline"
              className="h-4 px-1 text-[9px] font-bold border-amber-400/60 text-amber-500 bg-amber-50 dark:bg-amber-900/20"
            >
              Free
            </Badge>
          )}
        </button>
      </li>
    );
  };

  /* ── Render an expandable section ── */
  const renderSection = (section: MenuSection) => {
    const Icon = section.icon;
    const isExpanded = expandedSections.has(section.id);
    const visibleChildren = section.children.filter(c => visibleIds.has(c.id));
    if (visibleChildren.length === 0) return null;

    const hasActiveChild = section.children.some(c => c.id === activeSection);

    return (
      <li key={section.id} role="listitem">
        <button
          type="button"
          onClick={() => toggleSection(section.id)}
          aria-expanded={isExpanded}
          className={cn(
            'group w-full flex items-center gap-2.5 py-1.5 px-2.5 rounded-md text-xs transition-all duration-150 text-left',
            hasActiveChild
              ? 'text-sidebar-foreground font-medium'
              : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 active:bg-accent/80 hover:text-sidebar-foreground/85 font-normal'
          )}
        >
          <Icon
            className={cn(
              'h-3.5 w-3.5 flex-shrink-0 transition-colors duration-150',
              hasActiveChild
                ? 'text-primary'
                : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/65'
            )}
          />
          <span className="flex-1 truncate">{section.label}</span>
          <ChevronRight
            className={cn(
              'h-3 w-3 flex-shrink-0 text-sidebar-foreground/30 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        </button>
        {isExpanded && (
          <ul className="space-y-px mt-px" role="list">
            {visibleChildren.map(child => renderLeaf(child, true))}
          </ul>
        )}
      </li>
    );
  };

  /* ── Render a main nav entry ── */
  const renderNavEntry = (entry: NavEntry) => {
    if (entry.kind === 'leaf') {
      if (!visibleIds.has(entry.id)) return null;
      return renderLeaf(entry);
    }
    return renderSection(entry);
  };

  return (
    <nav
      aria-label="Menu principal"
      className="w-48 xs:w-56 bg-sidebar text-sidebar-foreground h-screen flex flex-col border-r border-sidebar-border"
    >
      {/* ── Logo ── */}
      <div className="h-12 flex items-center gap-2.5 px-3.5 border-b border-sidebar-border flex-shrink-0">
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
          <Scale className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-sidebar-foreground tracking-tight leading-none">Jurify</span>
          <span className={cn(
            'text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
            profile?.subscription_tier === 'enterprise'
              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
              : profile?.subscription_tier === 'pro'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
          )}>
            {profile?.subscription_tier === 'enterprise' ? 'Enterprise'
              : profile?.subscription_tier === 'pro' ? 'Pro'
              : 'Free'}
          </span>
        </div>
        <ThemeToggle />
      </div>

      {/* ── Search ── */}
      <div className="px-2.5 py-2 border-b border-sidebar-border/50 flex-shrink-0">
        <button
          type="button"
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
            )
          }
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 hover:bg-muted/80 active:bg-accent/80 text-muted-foreground/55 hover:text-muted-foreground transition-all duration-150"
        >
          <Search className="h-3 w-3 flex-shrink-0" />
          <span className="flex-1 text-left text-[11px]">Buscar...</span>
          <kbd className="hidden sm:inline text-[9px] font-mono px-1 py-0.5 rounded bg-background/60 text-muted-foreground/40 border border-border/40">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 pb-2 overflow-y-auto scrollbar-thin" role="navigation">

        {/* Main items — hierarchical with expandable sections */}
        <ul className="space-y-px mt-1.5" role="list">
          {MAIN_NAV.map(renderNavEntry)}
        </ul>

        {/* Sistema — collapsible, rarely accessed */}
        {filteredSistemaItems.length > 0 && (
          <div className="mt-1">
            <div className="flex items-center gap-2 px-1.5 pt-2.5 pb-0.5">
              <div className="h-px flex-1 bg-border/50" />
              <button
                type="button"
                onClick={() => toggleSection('sistema')}
                aria-expanded={expandedSections.has('sistema')}
                className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground/70 active:bg-accent/80 transition-colors select-none"
              >
                <span>Sistema</span>
                <ChevronRight
                  className={cn(
                    'h-2.5 w-2.5 transition-transform duration-200',
                    expandedSections.has('sistema') && 'rotate-90'
                  )}
                />
              </button>
            </div>

            {expandedSections.has('sistema') && (
              <ul className="space-y-px" role="list">
                {filteredSistemaItems.map(item => renderLeaf(item))}
              </ul>
            )}
          </div>
        )}
      </nav>

      {/* ── Upgrade CTA para tier free ── */}
      {isFreeTier && (
        <div className="px-2.5 pb-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onSectionChange('billing')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 hover:bg-muted/80 border border-border/40 transition-all duration-150 group"
          >
            <span className="text-[10px] text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
              Plano Free · <span className="font-medium">Fazer upgrade →</span>
            </span>
          </button>
        </div>
      )}

      {/* ── User footer ── */}
      <div className="px-2.5 py-2.5 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-1 ring-primary/25">
            <span className="text-[10px] font-bold text-white">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-sidebar-foreground truncate leading-none">{userName}</p>
            <p className="text-[10px] text-muted-foreground/50 truncate leading-none mt-1">{userRoleLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            aria-label="Atalhos de teclado"
            title="Atalhos de teclado"
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/35 hover:text-foreground hover:bg-muted active:bg-accent/80 transition-colors flex-shrink-0"
          >
            <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => { void signOut(); }}
            title="Sair"
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/35 hover:text-destructive hover:bg-destructive/10 active:bg-accent/80 transition-colors flex-shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
      <KeyboardShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </nav>
  );
};

export default React.memo(Sidebar);
