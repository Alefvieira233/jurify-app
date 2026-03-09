
import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  MessageSquare,
  FileText,
  Calendar,
  LayoutDashboard,
  BarChart3,
  Settings,
  Users,
  Bot,
  TrendingUp,
  UserCog,
  LogOut,
  Bell,
  Activity,
  Zap,
  CreditCard,
  Rocket,
  Search,
  HelpCircle,
  ChevronRight,
  ArrowUpRight,
  Clock,
  DollarSign,
  FolderOpen,
  Gavel,
  PieChart,
  ShieldCheck,
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

type MenuItem = {
  id:         string;
  label:      string;
  icon:       React.ComponentType<{ className?: string }>;
  resource:   string;
  action:     string;
  adminOnly?: boolean;
  managerOk?: boolean;
  group:      'main' | 'sistema';
  badge?:     'notification' | 'upgrade';
};

/* ─────────────────────────────────────────────────────────────────────────
   Menu items
   Main  → visível sempre, operacional (fluxo diário do advogado)
   Sistema → colapsável, raramente acessado, admin/billing
───────────────────────────────────────────────────────────────────────── */
const ALL_MENU_ITEMS: MenuItem[] = [
  /* ── Main (9 itens) ── */
  { id: 'dashboard',             label: 'Dashboard',       icon: LayoutDashboard, resource: 'dashboard',     action: 'read', group: 'main' },
  { id: 'pipeline',              label: 'Pipeline',         icon: TrendingUp,      resource: 'leads',         action: 'read', group: 'main' },
  { id: 'agendamentos',          label: 'Agenda',           icon: Calendar,        resource: 'agendamentos',  action: 'read', group: 'main' },
  { id: 'whatsapp',              label: 'WhatsApp',         icon: MessageSquare,   resource: 'whatsapp',      action: 'read', group: 'main' },
  { id: 'agentes',               label: 'Agentes IA',       icon: Bot,             resource: 'agentes_ia',    action: 'read', group: 'main' },
  { id: 'contratos',             label: 'Contratos',        icon: FileText,        resource: 'contratos',     action: 'read', group: 'main' },
  { id: 'processos',             label: 'Processos',        icon: Gavel,           resource: 'processos',     action: 'read', group: 'main' },
  { id: 'prazos',                label: 'Prazos',           icon: Clock,           resource: 'prazos',        action: 'read', group: 'main', badge: 'notification' },
  { id: 'crm',                   label: 'Clientes',         icon: Users,           resource: 'leads',         action: 'read', group: 'main' },
  { id: 'notificacoes',          label: 'Notificações',     icon: Bell,            resource: 'notificacoes',  action: 'read', group: 'main', badge: 'notification' },
  /* ── Sistema (colapsável) ── */
  { id: 'painel-prazos',         label: 'Painel de Prazos', icon: PieChart,        resource: 'prazos',        action: 'read', group: 'sistema' },
  { id: 'auditoria',             label: 'Auditoria',        icon: ShieldCheck,     resource: 'logs',          action: 'read', group: 'sistema', managerOk: true },
  { id: 'relatorios',            label: 'Relatórios',       icon: BarChart3,       resource: 'relatorios',    action: 'read', group: 'sistema' },
  { id: 'honorarios',            label: 'Honorários',       icon: DollarSign,      resource: 'honorarios',    action: 'read', group: 'sistema', managerOk: true },
  { id: 'documentos',            label: 'Documentos',       icon: FolderOpen,      resource: 'documentos',    action: 'read', group: 'sistema' },
  { id: 'billing',               label: 'Assinatura',      icon: CreditCard,      resource: 'dashboard',     action: 'read', group: 'sistema', badge: 'upgrade' },
  { id: 'usuarios',              label: 'Usuários',        icon: UserCog,         resource: 'usuarios',      action: 'read', group: 'sistema', managerOk: true },
  { id: 'integracoes',           label: 'Integrações',     icon: Zap,             resource: 'integracoes',   action: 'read', group: 'sistema', adminOnly: true },
  { id: 'logs',                  label: 'Logs',            icon: Activity,        resource: 'logs',          action: 'read', group: 'sistema', adminOnly: true },
  { id: 'admin/mission-control', label: 'Monitoramento',   icon: Rocket,          resource: 'dashboard',     action: 'read', group: 'sistema', adminOnly: true },
  { id: 'configuracoes',         label: 'Configurações',   icon: Settings,        resource: 'configuracoes', action: 'read', group: 'sistema', adminOnly: true },
];

const SISTEMA_IDS = ALL_MENU_ITEMS.filter(i => i.group === 'sistema').map(i => i.id);

/* ─────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────── */
const Sidebar = ({ activeSection, onSectionChange }: SidebarProps) => {
  const { signOut, profile, user, hasPermission } = useAuth();
  const [unreadCount, setUnreadCount]   = useState(0);
  const [visibleItems, setVisibleItems] = useState<MenuItem[]>([]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sistemaOpen, setSistemaOpen]   = useState(
    () => SISTEMA_IDS.includes(activeSection)
  );

  /* ── RBAC filter ── */
  useEffect(() => {
    const filter = async () => {
      if (!user) { setVisibleItems([]); return; }
      if (!profile) {
        setVisibleItems(ALL_MENU_ITEMS.filter(i => !i.adminOnly && !i.managerOk));
        return;
      }

      const out: MenuItem[] = [];
      for (const item of ALL_MENU_ITEMS) {
        if (profile.role === 'admin') { out.push(item); continue; }
        if (item.adminOnly) continue;
        if (item.managerOk && profile.role !== 'manager') continue;
        try {
          if (await hasPermission(item.resource, item.action)) out.push(item);
        } catch {
          out.push(item);
        }
      }
      setVisibleItems(
        out.length === 0
          ? ALL_MENU_ITEMS.filter(i => !i.adminOnly && !i.managerOk)
          : out
      );
    };
    void filter();
  }, [user, profile, hasPermission]);

  /* ── Auto-open Sistema if active route belongs to it ── */
  useEffect(() => {
    if (SISTEMA_IDS.includes(activeSection)) setSistemaOpen(true);
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

  /* ── Split by group ── */
  const mainItems    = useMemo(() => visibleItems.filter(i => i.group === 'main'),    [visibleItems]);
  const sistemaItems = useMemo(() => visibleItems.filter(i => i.group === 'sistema'), [visibleItems]);

  const isFreeTier = !profile?.subscription_tier || profile.subscription_tier === 'free';

  const userInitial = profile?.nome_completo?.charAt(0).toUpperCase()
    || user?.email?.charAt(0).toUpperCase()
    || 'U';
  const userName = profile?.nome_completo || user?.email || 'Usuário';
  const userRoleLabel = profile?.role === 'admin'   ? 'Admin'
    : profile?.role === 'manager' ? 'Gestor'
    : 'Usuário';

  /* ── Render a single nav item ── */
  const renderItem = (item: MenuItem) => {
    const Icon     = item.icon;
    const isActive = activeSection === item.id;

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
          onClick={() => onSectionChange(item.id)}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`${item.label}${item.badge === 'notification' && unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
          className={cn(
            'group w-full flex items-center gap-2.5 py-1.5 rounded-md text-xs transition-all duration-150 text-left',
            isActive ? 'pl-3.5 pr-2.5' : 'px-2.5',
            isActive
              ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
              : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/85 font-normal'
          )}
        >
          <Icon
            className={cn(
              'h-3.5 w-3.5 flex-shrink-0 transition-colors duration-150',
              isActive
                ? 'text-primary'
                : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/65'
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>

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
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 hover:bg-muted/80 text-muted-foreground/55 hover:text-muted-foreground transition-all duration-150"
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

        {/* Main items — sem divider, fluxo diário */}
        <ul className="space-y-px mt-1.5" role="list">
          {mainItems.map(renderItem)}
        </ul>

        {/* Sistema — colapsável, raramente acessado */}
        {sistemaItems.length > 0 && (
          <div className="mt-1">
            <div className="flex items-center gap-2 px-1.5 pt-2.5 pb-0.5">
              <div className="h-px flex-1 bg-border/50" />
              <button
                type="button"
                onClick={() => setSistemaOpen(prev => !prev)}
                aria-expanded={sistemaOpen}
                className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors select-none"
              >
                <span>Sistema</span>
                <ChevronRight
                  className={cn(
                    'h-2.5 w-2.5 transition-transform duration-200',
                    sistemaOpen && 'rotate-90'
                  )}
                />
              </button>
            </div>

            {sistemaOpen && (
              <ul className="space-y-px" role="list">
                {sistemaItems.map(renderItem)}
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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 transition-all duration-150 group"
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 leading-none">Fazer upgrade</p>
              <p className="text-[9px] text-amber-500/70 leading-none mt-0.5">Desbloquear todos os recursos</p>
            </div>
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
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/35 hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
          >
            <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => { void signOut(); }}
            title="Sair"
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/35 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
      <KeyboardShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </nav>
  );
};

export default Sidebar;
