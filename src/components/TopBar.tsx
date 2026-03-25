import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials, getAvatarHex } from '@/utils/formatting';
import ThemeToggle from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { profile } = useAuth();
  const { unreadCount } = useRealtimeNotifications();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 gap-3 shrink-0 z-10">
      {/* Mobile hamburger */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo + workspace */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-primary">Jurify</span>
      </div>

      <div className="flex-1" />

      {/* Search trigger — opens GlobalSearch via Ctrl+K */}
      <button
        onClick={() => {
          // Trigger Ctrl+K programmatically
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
        }}
        className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 w-56 justify-start border border-border rounded-md px-3 hover:bg-accent transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar...</span>
        <kbd className="ml-auto text-[10px] font-mono bg-muted px-1 py-0.5 rounded">⌘K</kbd>
      </button>

      <ThemeToggle />

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => navigate('/notificacoes')}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 font-medium">
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
          {getInitials(profile?.nome_completo ?? null)}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
