
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar = ({ activeSection, onSectionChange }: SidebarProps) => {
  const { signOut, profile, user, hasPermission } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  type MenuItem = {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    resource: string;
    action: string;
    adminOnly?: boolean;
    group?: string;
  };

  const [visibleMenuItems, setVisibleMenuItems] = useState<MenuItem[]>([]);

  // 🔒 RBAC SEGURO: Menu baseado em permissões reais
  const allMenuItems = useMemo<MenuItem[]>(() => ([
    { id: 'dashboard',          label: 'Dashboard',            icon: BarChart3,      resource: 'dashboard',    action: 'read', group: 'main' },
    { id: 'leads',              label: 'Leads',                icon: Users,          resource: 'leads',        action: 'read', group: 'main' },
    { id: 'pipeline',           label: 'Pipeline Jurídico',    icon: TrendingUp,     resource: 'leads',        action: 'read', group: 'main' },
    { id: 'crm',                label: 'CRM',                  icon: Target,         resource: 'leads',        action: 'read', group: 'main' },
    { id: 'crm/followups',      label: 'Follow-ups',           icon: Clock,          resource: 'leads',        action: 'read', group: 'main' },
    { id: 'timeline',           label: 'Conversas',            icon: MessageCircle,  resource: 'leads',        action: 'read', group: 'main' },
    { id: 'whatsapp',           label: 'WhatsApp IA',          icon: MessageSquare,  resource: 'whatsapp',     action: 'read', group: 'main' },
    { id: 'contratos',          label: 'Contratos',            icon: FileText,       resource: 'contratos',    action: 'read', group: 'main' },
    { id: 'agendamentos',       label: 'Agendamentos',         icon: Calendar,       resource: 'agendamentos', action: 'read', group: 'main' },
    { id: 'agentes',            label: 'Agentes IA',           icon: Bot,            resource: 'agentes_ia',   action: 'read', group: 'ai' },
    { id: 'relatorios',         label: 'Relatórios',           icon: BarChart3,      resource: 'relatorios',   action: 'read', group: 'insights' },
    { id: 'analytics',          label: 'Analytics',            icon: Activity,       resource: 'dashboard',    action: 'read', group: 'insights' },
    { id: 'notificacoes',       label: 'Notificações',         icon: Bell,           resource: 'notificacoes', action: 'read', group: 'insights' },
    { id: 'billing',            label: 'Billing',              icon: CreditCard,     resource: 'dashboard',    action: 'read', group: 'account' },
    { id: 'planos',             label: 'Planos',               icon: CreditCard,     resource: 'dashboard',    action: 'read', group: 'account' },
    { id: 'admin/mission-control', label: 'Mission Control',   icon: Rocket,         resource: 'dashboard',    action: 'read', group: 'admin' },
    { id: 'admin/playground',   label: 'Agents Playground',   icon: FlaskConical,   resource: 'dashboard',    action: 'read', group: 'admin' },
    { id: 'usuarios',           label: 'Usuários',             icon: UserCog,        resource: 'usuarios',     action: 'read', group: 'admin', adminOnly: true },
    { id: 'integracoes',        label: 'Integrações',          icon: Zap,            resource: 'integracoes',  action: 'read', group: 'admin', adminOnly: true },
    { id: 'logs',               label: 'Logs',                 icon: Activity,       resource: 'logs',         action: 'read', group: 'admin', adminOnly: true },
    { id: 'configuracoes',      label: 'Configurações',        icon: Settings,       resource: 'configuracoes',action: 'read', group: 'admin', adminOnly: true },
  ]), []);

  // Filtrar menu baseado em permissões
  useEffect(() => {
    const filterMenuItems = async () => {
      if (!user) { setVisibleMenuItems([]); return; }

      if (!profile) {
        console.warn('⚠️ Profile não encontrado, mostrando menu padrão');
        setVisibleMenuItems(allMenuItems.filter(item => !item.adminOnly));
        return;
      }

      const filteredItems: MenuItem[] = [];

      for (const item of allMenuItems) {
        if (profile.role === 'admin') { filteredItems.push(item); continue; }
        if (item.adminOnly) continue;

        try {
          const hasAccess = await hasPermission(item.resource, item.action);
          if (hasAccess) filteredItems.push(item);
        } catch (_error) {
          if (!item.adminOnly) filteredItems.push(item);
        }
      }

      if (filteredItems.length === 0) {
        setVisibleMenuItems(allMenuItems.filter(item => !item.adminOnly));
      } else {
        setVisibleMenuItems(filteredItems);
      }
    };

    void filterMenuItems();
  }, [user, profile, hasPermission, allMenuItems]);

  // Notificações não lidas
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase.rpc('contar_nao_lidas', { user_id: user.id });
        if (!error && data !== null) setUnreadCount(data);
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      }
    };

    void fetchUnreadCount();
    const interval = setInterval(() => { void fetchUnreadCount(); }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleLogout = async () => { await signOut(); };

  return (
    <nav
      aria-label="Menu principal"
      className="w-64 bg-sidebar text-sidebar-foreground h-screen flex flex-col border-r border-sidebar-border"
    >
      {/* ── Logo / Brand ── */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border flex-shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <Scale className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-base font-bold text-sidebar-foreground tracking-tight">
            Jurify
          </span>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none mt-0.5">
            Legal Suite
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* ── Plan badge + Search ── */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-primary/5 border border-primary/10">
          <span className="text-xs font-semibold text-primary">Enterprise</span>
          <div className="flex items-center gap-1.5">
            <span className="status-dot status-dot-green" />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Ativo
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
            )
          }
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md border border-sidebar-border bg-sidebar hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors text-sm"
        >
          <Search className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1 text-left text-xs">Buscar...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-sidebar-accent text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin" role="navigation">
        <ul className="space-y-0.5" role="list">
          {visibleMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const isNotifications = item.id === 'notificacoes';

            return (
              <li key={item.id} role="listitem">
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Navegar para ${item.label}${isNotifications && unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 text-left',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground font-normal'
                  )}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-none',
                      isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/50'
                    )}
                  />

                  <span className="flex-1 truncate">{item.label}</span>

                  {isNotifications && unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-5 px-1.5 text-[10px] font-bold"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User Profile + Logout ── */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1 flex-shrink-0">
        {/* User info row */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-sidebar-accent transition-colors cursor-default">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
            <span className="text-xs font-bold text-white">
              {profile?.nome_completo?.charAt(0).toUpperCase() ||
                user?.email?.charAt(0).toUpperCase() ||
                'U'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
              {profile?.nome_completo || user?.email || 'Usuário'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="status-dot status-dot-green" style={{ width: '6px', height: '6px' }} />
              <p className="text-[11px] text-muted-foreground truncate">
                {profile?.role === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
              {profile?.role === 'admin' && (
                <Badge className="bg-primary/10 text-primary border-primary/20 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide ml-auto">
                  Admin
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={() => { void handleLogout(); }}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors h-9 px-3"
        >
          <LogOut className="h-4 w-4 mr-2 flex-shrink-0" strokeWidth={2} />
          <span className="text-sm">Sair da Conta</span>
        </Button>
      </div>
    </nav>
  );
};

export default Sidebar;
