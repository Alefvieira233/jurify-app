
import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  MessageSquare,
  MessageCircle,
  LayoutDashboard,
  Settings,
  Users,
  Bot,
  Search,
  LogOut,
  HelpCircle,
  ChevronRight,
  Link2,
  BookOpen,
  Gift,
  KanbanSquare,
  GitBranch,
  Sliders,
  Briefcase,
  CheckSquare,
  Building2,
  LineChart,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import ThemeToggle from '@/components/ThemeToggle';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

type MenuLeaf = {
  id:         string;
  label:      string;
  icon:       React.ComponentType<React.SVGProps<SVGSVGElement>>;
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
  icon:       React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children:   MenuLeaf[];
};

type NavEntry = (MenuLeaf & { kind: 'leaf' }) | (MenuSection & { kind: 'section' });

/* ─────────────────────────────────────────────────────────────────────────
   Navigation structure — LíderHub pattern
   Main  → flat items + expandable sections (Atendimento, Automações)
───────────────────────────────────────────────────────────────────────── */
const MAIN_NAV: NavEntry[] = [
  { kind: 'leaf', id: 'dashboard',  label: 'Home',       icon: LayoutDashboard, resource: 'dashboard',  action: 'read' },
  {
    kind: 'section',
    id: 'atendimento',
    label: 'Atendimento',
    icon: MessageSquare,
    children: [
      { id: 'whatsapp', label: 'Conversas',  icon: MessageCircle, resource: 'whatsapp', action: 'read' },
      { id: 'crm',      label: 'Contatos',   icon: Users,         resource: 'leads',    action: 'read' },
      { id: 'pipeline', label: 'Kanban',     icon: KanbanSquare,  resource: 'leads',    action: 'read' },
    ],
  },
  {
    kind: 'section',
    id: 'automacoes',
    label: 'Automações',
    icon: Bot,
    children: [
      { id: 'agentes',             label: 'Agentes',              icon: Bot,       resource: 'agentes_ia', action: 'read' },
      { id: 'fluxos',              label: 'Fluxos',               icon: GitBranch, resource: 'fluxos', action: 'read' },
      { id: 'regras',              label: 'Regras',               icon: Sliders,   resource: 'regras', action: 'read' },
      { id: 'base-conhecimento',   label: 'Base de Conhecimento', icon: BookOpen,  resource: 'agentes_ia', action: 'read' },
    ],
  },
  {
    kind: 'section',
    id: 'operacao',
    label: 'Operação',
    icon: Briefcase,
    children: [
      { id: 'agendamentos',  label: 'Tarefas',        icon: CheckSquare, resource: 'agendamentos', action: 'read' },
      { id: 'equipe',        label: 'Equipe',         icon: Users,       resource: 'usuarios',     action: 'read' },
      { id: 'departamentos', label: 'Departamentos',  icon: Building2,   resource: 'departamentos',action: 'read' },
      { id: 'administracao', label: 'Administração',  icon: Shield,      resource: 'configuracoes',action: 'read', adminOnly: true },
    ],
  },
  { kind: 'leaf', id: 'conexoes',      label: 'Conexões',      icon: Link2,     resource: 'conexoes',      action: 'read' },
  { kind: 'leaf', id: 'configuracoes', label: 'Configurações', icon: Settings,  resource: 'configuracoes', action: 'read' },
  { kind: 'leaf', id: 'metricas',      label: 'Métricas',      icon: LineChart, resource: 'relatorios',    action: 'read' },
];

/** All leaf items flattened (for RBAC filtering) */
function allLeaves(): MenuLeaf[] {
  const out: MenuLeaf[] = [];
  for (const entry of MAIN_NAV) {
    if (entry.kind === 'leaf') out.push(entry);
    else for (const child of entry.children) out.push(child);
  }
  return out;
}
const ALL_LEAVES = allLeaves();

/* ─────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────── */
const Sidebar = ({ activeSection, onSectionChange }: SidebarProps) => {
  const { signOut, profile, user, hasPermission } = useAuth();
  const { unreadCount } = useRealtimeNotifications();
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
  }, [activeSection]);

  /* ── Unread notifications — driven by useRealtimeNotifications (no polling) ── */

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
      <li key={item.id} role="listitem" className="relative group mb-1">
        <button
          type="button"
          onClick={() => !isDisabled && onSectionChange(item.id)}
          disabled={isDisabled}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`${item.label}${item.badge === 'notification' && unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}${isDisabled ? ' (em breve)' : ''}`}
          className={cn(
            'group w-full flex items-center gap-3 py-2.5 rounded-[12px] text-[13px] transition-all duration-300 text-left border border-transparent',
            indent ? 'pl-10 pr-3' : 'px-3.5',
            isDisabled
              ? 'text-sidebar-foreground/20 cursor-not-allowed'
              : isActive
              ? 'bg-primary/10 text-primary font-semibold border-primary/20 backdrop-blur-sm'
              : 'text-sidebar-foreground/60 hover:bg-sidebar-border/15 hover:border-sidebar-border/30 hover:text-sidebar-foreground font-medium'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 flex-shrink-0 transition-colors duration-300',
              isDisabled
                ? 'text-sidebar-foreground/20'
                : isActive
                ? 'text-primary'
                : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/80'
            )}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span className="flex-1 truncate tracking-wide">{item.label}</span>

          {isDisabled && (
            <span className="text-[9px] text-sidebar-foreground/30 font-bold uppercase tracking-widest bg-sidebar-border/20 px-1.5 py-0.5 rounded-sm">
              Em breve
            </span>
          )}

          {item.badge === 'notification' && unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-bold shadow-lg shadow-destructive/20">
              {unreadCount > 99 ? '99+' : unreadCount}
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
            'group w-full flex items-center gap-3 py-2.5 px-3.5 rounded-[12px] text-[13px] transition-all duration-300 text-left border border-transparent',
            hasActiveChild
              ? 'text-sidebar-foreground font-semibold bg-sidebar-border/5'
              : 'text-sidebar-foreground/60 hover:bg-sidebar-border/15 hover:border-sidebar-border/30 hover:text-sidebar-foreground font-medium'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 flex-shrink-0 transition-colors duration-300',
              hasActiveChild
                ? 'text-sidebar-foreground'
                : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/80'
            )}
            strokeWidth={hasActiveChild ? 2.5 : 2}
          />
          <span className="flex-1 truncate tracking-wide">{section.label}</span>
          <ChevronRight
            className={cn(
              'h-4 w-4 flex-shrink-0 text-sidebar-foreground/30 transition-transform duration-300',
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
      className="w-64 xs:w-[280px] bg-sidebar text-sidebar-foreground h-screen flex flex-col border-r border-sidebar-border/30 shadow-2xl shadow-black/20"
    >
      {/* ── Logo ── */}
      <div className="h-20 flex items-center gap-3 px-6 shadow-sm flex-shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-primary to-blue-700 rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 ring-1 ring-white/10">
          <Scale className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-lg font-bold text-sidebar-foreground tracking-tight leading-none font-sans">Jurify</span>
          <span className="text-[10px] font-bold tracking-widest text-sidebar-foreground/50 uppercase mt-1">Enterprise</span>
        </div>
        <div className="opacity-50 hover:opacity-100 transition-opacity">
          <ThemeToggle />
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-4 py-4 flex-shrink-0">
        <button
          type="button"
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
            )
          }
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] bg-black/20 hover:bg-black/40 border border-sidebar-border/20 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-all duration-300 shadow-inner"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left text-xs font-medium">Pesquisar...</span>
          <kbd className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-sidebar-foreground/40 border border-white/10">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto scrollbar-thin" role="navigation">
        <ul className="space-y-1 mt-2" role="list">
          <li className="px-3 pb-2 pt-1 text-[10px] font-bold tracking-widest text-sidebar-foreground/40 uppercase">Acesso Principal</li>
          {MAIN_NAV.map(renderNavEntry)}
        </ul>
      </nav>

      {/* ── Referral banner ── */}
      <div className="px-4 pb-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onSectionChange('suporte')}
          className="relative overflow-hidden w-full flex flex-col gap-1 px-4 py-3.5 rounded-[14px] bg-gradient-to-br from-sidebar-border/10 to-transparent border border-sidebar-border/30 hover:border-primary/40 transition-all duration-300 group shadow-lg"
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center gap-2 mb-1 w-full relative z-10">
            <Gift className="h-4 w-4 flex-shrink-0 text-amber-500 group-hover:text-amber-400 transition-colors" />
            <p className="text-xs font-bold text-sidebar-foreground group-hover:text-white transition-colors leading-none tracking-wide text-left">
              Indique e Ganhe
            </p>
          </div>
          <p className="text-[10px] text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80 transition-colors leading-relaxed text-left relative z-10">
            Convide colegas e ganhe <strong>+R$200</strong> por indicação aprovada.
          </p>
        </button>
      </div>

      {/* ── User footer ── */}
      <div className="px-4 py-4 flex-shrink-0 mt-2">
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
