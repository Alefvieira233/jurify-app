
import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  MessageSquare,
  FileText,
  Calendar,
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
  MessageCircle,
  CreditCard,
  Rocket,
  FlaskConical,
  Target,
  Clock,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

type MenuItem = {
  id:        string;
  label:     string;
  icon:      React.ComponentType<{ className?: string }>;
  resource:  string;
  action:    string;
  adminOnly?: boolean;
  group:     string;
};

/* ── Section definitions (order matters) ── */
const SECTIONS: { key: string; label: string | null }[] = [
  { key: 'main',     label: null          },
  { key: 'ops',      label: 'Operacional' },
  { key: 'ai',       label: 'IA'          },
  { key: 'insights', label: 'Insights'    },
  { key: 'admin',    label: 'Admin'       },
];

const ALL_MENU_ITEMS: MenuItem[] = [
  /* ── Main ── */
  { id: 'dashboard',      label: 'Dashboard',       icon: BarChart3,     resource: 'dashboard',    action: 'read', group: 'main'     },
  { id: 'leads',          label: 'Leads',           icon: Users,         resource: 'leads',        action: 'read', group: 'main'     },
  { id: 'pipeline',       label: 'Pipeline',        icon: TrendingUp,    resource: 'leads',        action: 'read', group: 'main'     },
  { id: 'crm',            label: 'CRM',             icon: Target,        resource: 'leads',        action: 'read', group: 'main'     },
  { id: 'crm/followups',  label: 'Follow-ups',      icon: Clock,         resource: 'leads',        action: 'read', group: 'main'     },
  { id: 'timeline',       label: 'Conversas',       icon: MessageCircle, resource: 'leads',        action: 'read', group: 'main'     },
  /* ── Operacional ── */
  { id: 'whatsapp',       label: 'WhatsApp IA',     icon: MessageSquare, resource: 'whatsapp',     action: 'read', group: 'ops'      },
  { id: 'contratos',      label: 'Contratos',       icon: FileText,      resource: 'contratos',    action: 'read', group: 'ops'      },
  { id: 'agendamentos',   label: 'Agendamentos',    icon: Calendar,      resource: 'agendamentos', action: 'read', group: 'ops'      },
  /* ── IA ── */
  { id: 'agentes',        label: 'Agentes IA',      icon: Bot,           resource: 'agentes_ia',   action: 'read', group: 'ai'       },
  /* ── Insights ── */
  { id: 'relatorios',     label: 'Relatórios',      icon: BarChart3,     resource: 'relatorios',   action: 'read', group: 'insights' },
  { id: 'analytics',      label: 'Analytics',       icon: Activity,      resource: 'dashboard',    action: 'read', group: 'insights' },
  { id: 'notificacoes',   label: 'Notificações',    icon: Bell,          resource: 'notificacoes', action: 'read', group: 'insights' },
  /* ── Admin ── */
  { id: 'billing',               label: 'Billing',         icon: CreditCard,    resource: 'dashboard',    action: 'read', group: 'admin'    },
  { id: 'planos',                label: 'Planos',          icon: CreditCard,    resource: 'dashboard',    action: 'read', group: 'admin'    },
  { id: 'admin/mission-control', label: 'Mission Control', icon: Rocket,        resource: 'dashboard',    action: 'read', group: 'admin'    },
  { id: 'admin/playground',      label: 'Playground',      icon: FlaskConical,  resource: 'dashboard',    action: 'read', group: 'admin'    },
  { id: 'usuarios',              label: 'Usuários',        icon: UserCog,       resource: 'usuarios',     action: 'read', group: 'admin', adminOnly: true },
  { id: 'integracoes',           label: 'Integrações',     icon: Zap,           resource: 'integracoes',  action: 'read', group: 'admin', adminOnly: true },
  { id: 'logs',                  label: 'Logs',            icon: Activity,      resource: 'logs',         action: 'read', group: 'admin', adminOnly: true },
  { id: 'configuracoes',         label: 'Configurações',   icon: Settings,      resource: 'configuracoes',action: 'read', group: 'admin', adminOnly: true },
];

const Sidebar = ({ activeSection, onSectionChange }: SidebarProps) => {
  const { signOut, profile, user, hasPermission } = useAuth();
  const [unreadCount, setUnreadCount]  = useState(0);
  const [visibleItems, setVisibleItems] = useState<MenuItem[]>([]);

  /* ── RBAC filter ── */
  useEffect(() => {
    const filter = async () => {
      if (!user) { setVisibleItems([]); return; }
      if (!profile) { setVisibleItems(ALL_MENU_ITEMS.filter(i => !i.adminOnly)); return; }

      const out: MenuItem[] = [];
      for (const item of ALL_MENU_ITEMS) {
        if (profile.role === 'admin') { out.push(item); continue; }
        if (item.adminOnly) continue;
        try {
          if (await hasPermission(item.resource, item.action)) out.push(item);
        } catch {
          if (!item.adminOnly) out.push(item);
        }
      }
      setVisibleItems(out.length === 0 ? ALL_MENU_ITEMS.filter(i => !i.adminOnly) : out);
    };
    void filter();
  }, [user, profile, hasPermission]);

  /* ── Unread notifications ── */
  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase.rpc('contar_nao_lidas', { user_id: user.id });
        if (!error && data !== null) setUnreadCount(data);
      } catch { /* silent */ }
    };
    void fetch();
    const t = setInterval(() => { void fetch(); }, 30000);
    return () => clearInterval(t);
  }, [user?.id]);

  /* ── Group visible items by section ── */
  const grouped = useMemo(() =>
    SECTIONS.map(sec => ({
      ...sec,
      items: visibleItems.filter(i => i.group === sec.key),
    })).filter(sec => sec.items.length > 0),
  [visibleItems]);

  const userInitial = profile?.nome_completo?.charAt(0).toUpperCase()
    || user?.email?.charAt(0).toUpperCase()
    || 'U';
  const userName = profile?.nome_completo || user?.email || 'Usuário';
  const userRole = profile?.role === 'admin' ? 'Admin' : 'Usuário';

  return (
    <nav
      aria-label="Menu principal"
      className="w-56 bg-sidebar text-sidebar-foreground h-screen flex flex-col border-r border-sidebar-border"
    >
      {/* ── Logo ── */}
      <div className="h-12 flex items-center gap-2.5 px-3.5 border-b border-sidebar-border flex-shrink-0">
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
          <Scale className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-sidebar-foreground tracking-tight leading-none">Jurify</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">
            Enterprise
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
        {grouped.map((sec, secIdx) => (
          <div key={sec.key} className={secIdx > 0 ? 'mt-1' : 'mt-1.5'}>

            {/* Section divider + inline label */}
            {sec.label && (
              <div className="flex items-center gap-2 px-1.5 pt-2.5 pb-0.5">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 select-none flex-shrink-0">
                  {sec.label}
                </span>
              </div>
            )}

            <ul className="space-y-px" role="list">
              {sec.items.map(item => {
                const Icon    = item.icon;
                const isActive = activeSection === item.id;
                const isNotif  = item.id === 'notificacoes';

                return (
                  <li key={item.id} role="listitem" className="relative">

                    {/* Left accent indicator for active item */}
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
                      aria-label={`${item.label}${isNotif && unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
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
                      {isNotif && unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-4 min-w-4 px-1 text-[9px] font-bold"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer (single compact row) ── */}
      <div className="px-2.5 py-2.5 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-1 ring-primary/25">
            <span className="text-[10px] font-bold text-white">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-sidebar-foreground truncate leading-none">{userName}</p>
            <p className="text-[10px] text-muted-foreground/50 truncate leading-none mt-1">{userRole}</p>
          </div>
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
    </nav>
  );
};

export default Sidebar;
