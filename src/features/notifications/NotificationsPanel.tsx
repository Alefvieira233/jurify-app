import { useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  info:    { icon: Info,         hex: '#2563eb', bgClass: 'bg-blue-500/10',    textClass: 'text-blue-600 dark:text-blue-400',    label: 'Info'    },
  alerta:  { icon: AlertCircle,  hex: '#d97706', bgClass: 'bg-amber-500/10',   textClass: 'text-amber-600 dark:text-amber-400',  label: 'Alerta'  },
  sucesso: { icon: CheckCheck,   hex: '#059669', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-600 dark:text-emerald-400', label: 'Sucesso' },
  erro:    { icon: AlertCircle,  hex: '#e11d48', bgClass: 'bg-rose-500/10',    textClass: 'text-rose-600 dark:text-rose-400',    label: 'Erro'    },
} as const;

import { relativeTime } from '@/utils/formatting';

type Filter = 'todas' | 'nao_lidas' | 'lidas';

const NotificationsPanel = () => {
  const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllAsRead, isRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>('todas');

  const filtered = useMemo(() => {
    if (filter === 'nao_lidas') return notifications.filter(n => !isRead(n));
    if (filter === 'lidas')     return notifications.filter(n =>  isRead(n));
    return notifications;
  }, [notifications, filter, isRead]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Notificações</p>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Carregando...</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border/50">
              <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-4 w-4 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Notificações</p>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => { void markAllAsRead(); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-primary bg-primary/8 hover:bg-primary/15 transition-colors"
              >
                <Check className="h-3 w-3" />
                Marcar todas
              </button>
            )}
            <button
              type="button"
              onClick={() => { void fetchNotifications(); }}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 mt-2.5">
          {([
            { key: 'todas',     label: `Todas (${notifications.length})` },
            { key: 'nao_lidas', label: `Não lidas (${unreadCount})` },
            { key: 'lidas',     label: `Lidas (${notifications.length - unreadCount})` },
          ] as { key: Filter; label: string }[]).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                filter === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Tudo em dia</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {filter === 'nao_lidas' ? 'Não há notificações não lidas' : 'Nenhuma notificação encontrada'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(notification => {
              const read = isRead(notification);
              const tipo = notification.tipo ?? 'info';
              const cfg  = TYPE_CONFIG[tipo] ?? TYPE_CONFIG.info;
              const Icon = cfg.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors',
                    read
                      ? 'border-border/50 bg-card hover:bg-muted/20'
                      : 'border-l-2 bg-primary/5 border-primary hover:bg-primary/8'
                  )}
                >
                  {/* Type icon */}
                  <div
                    className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bgClass)}
                  >
                    <Icon className={cn('h-3 w-3', cfg.textClass)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-xs leading-snug truncate', read ? 'font-normal text-foreground/70' : 'font-semibold text-foreground')}>
                        {notification.titulo ?? 'Notificação'}
                      </p>
                      <span className="text-[10px] text-muted-foreground/50 flex-shrink-0 tabular-nums">
                        {relativeTime(notification.data_criacao ?? notification.created_at)}
                      </span>
                    </div>
                    {notification.mensagem && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.mensagem}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={cn('text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full', cfg.bgClass, cfg.textClass)}>
                        {cfg.label}
                      </span>
                      {!read && (
                        <button
                          type="button"
                          onClick={() => { void markAsRead(notification.id); }}
                          className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-0.5"
                        >
                          <Check className="h-3 w-3" />
                          Marcar lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
