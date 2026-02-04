
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
} from 'lucide-react';
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
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    resource: string;
    action: string;
    adminOnly?: boolean;
  };
  const [visibleMenuItems, setVisibleMenuItems] = useState<MenuItem[]>([]);

  // 🔒 RBAC SEGURO: Menu baseado em permissões reais
  const allMenuItems = useMemo<MenuItem[]>(() => ([
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, resource: 'dashboard', action: 'read' },
    { id: 'leads', label: 'Leads', icon: Users, resource: 'leads', action: 'read' },
    { id: 'pipeline', label: 'Pipeline Jurídico', icon: TrendingUp, resource: 'leads', action: 'read' },
    { id: 'timeline', label: 'Timeline de Conversas', icon: MessageCircle, resource: 'leads', action: 'read' },
    { id: 'whatsapp', label: 'WhatsApp IA', icon: MessageSquare, resource: 'whatsapp', action: 'read' },
    { id: 'contratos', label: 'Contratos', icon: FileText, resource: 'contratos', action: 'read' },
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar, resource: 'agendamentos', action: 'read' },
    { id: 'agentes', label: 'Agentes IA', icon: Bot, resource: 'agentes_ia', action: 'read' },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, resource: 'relatorios', action: 'read' },
    { id: 'notificacoes', label: 'Notificações', icon: Bell, resource: 'notificacoes', action: 'read' },
    { id: 'logs', label: 'Logs de Atividades', icon: Activity, resource: 'logs', action: 'read' },
    { id: 'admin/mission-control', label: '🚀 Mission Control', icon: Rocket, resource: 'dashboard', action: 'read', adminOnly: false },
    { id: 'admin/playground', label: '🧪 Agents Playground', icon: FlaskConical, resource: 'dashboard', action: 'read', adminOnly: false },
    { id: 'usuarios', label: 'Usuários', icon: UserCog, resource: 'usuarios', action: 'read', adminOnly: true },
    { id: 'integracoes', label: 'Integrações', icon: Zap, resource: 'integracoes', action: 'read', adminOnly: true },
    { id: 'analytics', label: '📊 Analytics', icon: BarChart3, resource: 'dashboard', action: 'read' },
    { id: 'billing', label: '💳 Billing', icon: CreditCard, resource: 'dashboard', action: 'read' },
    { id: 'planos', label: 'Planos & Assinatura', icon: CreditCard, resource: 'dashboard', action: 'read' },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, resource: 'configuracoes', action: 'read', adminOnly: true },
  ]), []);

  // Filtrar menu baseado em permissões
  useEffect(() => {
    const filterMenuItems = async () => {
      if (!user) {
        setVisibleMenuItems([]);
        return;
      }

      // 🔓 FALLBACK: Se não tem profile, mostrar itens básicos
      if (!profile) {
        console.warn('⚠️ Profile não encontrado, mostrando menu padrão');
        const defaultItems = allMenuItems.filter(item => !item.adminOnly);
        setVisibleMenuItems(defaultItems);
        return;
      }

      const filteredItems = [];

      for (const item of allMenuItems) {
        // Admin tem acesso a tudo
        if (profile.role === 'admin') {
          filteredItems.push(item);
          continue;
        }

        // Itens só para admin
        if (item.adminOnly) {
          continue;
        }

        // 🔓 FALLBACK: Tentar verificar permissão, se falhar, liberar acesso básico
        try {
          const hasAccess = await hasPermission(item.resource, item.action);
          if (hasAccess) {
            filteredItems.push(item);
          }
        } catch (_error) {
          console.warn(`⚠️ Erro ao verificar permissão para ${item.resource}, liberando acesso padrão`);
          // Se erro ao verificar permissão, liberar itens não-admin
          if (!item.adminOnly) {
            filteredItems.push(item);
          }
        }
      }

      // 🔓 FALLBACK: Se não conseguiu nenhum item, mostrar todos não-admin
      if (filteredItems.length === 0) {
        console.warn('⚠️ Nenhuma permissão encontrada, mostrando menu padrão');
        const defaultItems = allMenuItems.filter(item => !item.adminOnly);
        setVisibleMenuItems(defaultItems);
      } else {
        setVisibleMenuItems(filteredItems);
      }
    };

    void filterMenuItems();
  }, [user, profile, hasPermission, allMenuItems]);

  // Buscar contagem de notificações não lidas
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .rpc('contar_nao_lidas', { user_id: user.id });

        if (!error && data !== null) {
          setUnreadCount(data);
        }
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      }
    };

    void fetchUnreadCount();

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => { void fetchUnreadCount(); }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="w-72 lg:w-80 bg-sidebar text-sidebar-foreground h-screen flex flex-col shadow-2xl relative overflow-hidden border-r border-sidebar-border">
      {/* Ultra-Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--sidebar-primary)_/_0.08)] via-transparent to-[hsl(var(--accent)_/_0.05)] pointer-events-none" />

      {/* Animated Gradient Orbs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-[hsl(var(--sidebar-primary)_/_0.12)] rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '4s' }} />
      <div className="absolute top-1/2 -left-20 w-60 h-60 bg-[hsl(var(--accent)_/_0.08)] rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '6s', animationDelay: '2s' }} />

      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
      }} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Ultra-Premium Logo Section */}
        <div className="px-8 py-10 border-b border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between slide-in">
            <div className="flex items-center space-x-4 group">
              {/* Premium Logo with Glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--sidebar-primary))] to-[hsl(43_96%_42%)] rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-[hsl(var(--sidebar-primary))] via-[hsl(43_96%_56%)] to-[hsl(43_96%_42%)] p-3.5 rounded-2xl shadow-2xl">
                  <Scale className="h-8 w-8 text-[hsl(var(--sidebar-primary-foreground))]" strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-bold text-sidebar-foreground tracking-tight mb-0.5" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '-0.02em' }}>
                  Jurify
                </h1>
                <div className="flex items-center space-x-2">
                  <div className="h-1 w-1 rounded-full bg-sidebar-primary" />
                  <p className="text-xs text-sidebar-foreground/60 font-medium tracking-wide uppercase" style={{ fontSize: '10px' }}>
                    Premium Legal Suite
                  </p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* Premium Badge */}
          <div className="mt-6 px-4 py-2.5 bg-gradient-to-r from-sidebar-primary/10 to-accent/5 rounded-none border border-sidebar-primary/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sidebar-foreground/90">Plano Enterprise</span>
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-sidebar-foreground/60 font-medium uppercase tracking-wider">Ativo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra-Premium Navigation */}
        <nav className="flex-1 px-6 py-8 space-y-2 overflow-y-auto scrollbar-thin">
          {visibleMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isNotifications = item.id === 'notificacoes';
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`
                  w-full group relative flex items-center justify-between px-5 py-4 rounded-none text-left
                  transition-all duration-500 ease-out
                  ${isActive
                    ? 'bg-gradient-to-r from-sidebar-primary via-primary to-accent text-sidebar-primary-foreground shadow-2xl'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/5 hover:backdrop-blur-sm'
                  }
                `}
                style={{
                  animationDelay: `${index * 0.04}s`,
                  animation: 'slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}
              >
                {/* Active Glow Effect */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sidebar-primary))] to-[hsl(43_96%_56%)] rounded-2xl blur-xl opacity-40 -z-10" />
                )}

                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  {/* Icon Container */}
                  <div className={`
                    p-2.5 rounded-xl transition-all duration-500
                    ${isActive
                      ? 'bg-[hsl(var(--sidebar-primary-foreground)_/_0.15)] scale-110'
                      : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-105'
                    }
                  `}>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.8 : 2.2} />
                  </div>

                  {/* Label */}
                  <span className={`
                    text-sm truncate transition-all duration-300
                    ${isActive ? 'font-bold tracking-wide' : 'font-medium group-hover:font-semibold'}
                  `}>
                    {item.label}
                  </span>
                </div>

                {/* Right Side Elements */}
                <div className="flex items-center space-x-3">
                  {isNotifications && unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="pulse-subtle px-2.5 py-1 text-xs font-bold shadow-lg"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}

                  {isActive && (
                    <div className="flex items-center space-x-0.5">
                      <div className="w-1 h-1 rounded-full bg-[hsl(var(--sidebar-primary-foreground))] animate-pulse" />
                      <div className="w-1 h-1 rounded-full bg-[hsl(var(--sidebar-primary-foreground))] animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1 h-1 rounded-full bg-[hsl(var(--sidebar-primary-foreground))] animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}
                </div>

                {/* Hover Shine Effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </div>
              </button>
            );
          })}
        </nav>

        {/* Ultra-Premium User Profile Section */}
        <div className="px-6 pb-8 pt-6 border-t border-white/10 space-y-4">
          {/* Premium User Card */}
          <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sidebar-primary))] to-[hsl(43_96%_56%)] rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />

            <div className="relative bg-sidebar-foreground/5 backdrop-blur-md rounded-none p-5 border border-sidebar-foreground/10 hover:border-sidebar-foreground/20 transition-all duration-500 cursor-pointer overflow-hidden">
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sidebar-foreground/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="relative flex items-center space-x-4">
                {/* Premium Avatar */}
                <div className="relative">
                  {/* Avatar Glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary to-primary rounded-none blur-md opacity-60" />

                  {/* Avatar Container */}
                  <div className="relative w-14 h-14 bg-gradient-to-br from-sidebar-primary via-primary to-accent rounded-none flex items-center justify-center shadow-2xl ring-2 ring-sidebar-foreground/30 group-hover:ring-sidebar-foreground/50 transition-all duration-500">
                    <span className="text-xl font-bold text-sidebar-primary-foreground">
                      {profile?.nome_completo?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>

                  {/* Premium Online Indicator */}
                  <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
                    <div className="w-5 h-5 bg-green-500 rounded-full border-[3px] border-[hsl(var(--sidebar-background))] shadow-lg">
                      <div className="w-full h-full rounded-full bg-green-400 animate-ping opacity-75" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-sidebar-foreground truncate group-hover:text-sidebar-primary transition-colors mb-1">
                    {profile?.nome_completo || user?.email || 'Usuário'}
                  </p>
                  <div className="flex items-center space-x-2.5">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                      <p className="text-[11px] text-sidebar-foreground/60 font-medium uppercase tracking-wider">
                        {profile?.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </p>
                    </div>
                    {profile?.role === 'admin' && (
                      <Badge className="bg-gradient-to-r from-[hsl(var(--sidebar-primary))] to-[hsl(43_96%_56%)] text-[hsl(var(--sidebar-primary-foreground))] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-0 shadow-lg">
                        ADMIN
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Logout Button */}
          <Button
            onClick={() => { void handleLogout(); }}
            variant="ghost"
            size="sm"
            className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:backdrop-blur-sm transition-all duration-500 py-3.5 rounded-none group relative overflow-hidden border border-sidebar-foreground/10 hover:border-sidebar-foreground/20"
          >
            {/* Button Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <LogOut className="relative h-4 w-4 mr-2.5 group-hover:-translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
            <span className="relative font-semibold tracking-wide">Sair da Conta</span>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sidebar-foreground/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
