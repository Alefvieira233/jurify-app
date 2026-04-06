import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, AlertCircle, Loader2, Unlink } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import type { IntegrationStatus } from '../configuracoes/IntegrationCard';

interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
  name: string | null;
  picture: string | null;
  connectedAt: string | null;
}

interface GoogleCalendarCardProps {
  status: GoogleCalendarStatus;
  gcalStatus: IntegrationStatus;
  error: string | null;
  isConnecting: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefetch: () => void;
}

const GoogleCalendarCard: React.FC<GoogleCalendarCardProps> = ({
  status,
  gcalStatus,
  error,
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
  onRefetch,
}) => {
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all hover:shadow-md',
      gcalStatus === 'connected'
        ? 'border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-blue-50/50 to-emerald-50/30 dark:from-blue-950/20 dark:to-emerald-950/10'
        : 'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/40 to-white dark:from-blue-950/20 dark:to-background'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-background shadow-sm border flex items-center justify-center">
              <Calendar className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Google Calendar
                <StatusBadge status={gcalStatus} />
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Sincronize agendamentos automaticamente com sua conta Google
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground/50 hover:text-foreground"
            onClick={onRefetch}
            title="Atualizar status"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {status.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border">
              <Avatar className="h-10 w-10">
                {status.picture && <AvatarImage src={status.picture} alt={status.name ?? ''} />}
                <AvatarFallback className="text-sm">{status.name?.charAt(0).toUpperCase() ?? 'G'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {status.name && <p className="text-sm font-medium truncate">{status.name}</p>}
                <p className="text-xs text-muted-foreground truncate">{status.email}</p>
              </div>
            </div>
            {status.connectedAt && (
              <p className="text-xs text-muted-foreground/70">
                Conectado {formatDistanceToNow(new Date(status.connectedAt), { addSuffix: true, locale: ptBR })}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-sm"
              onClick={onDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Unlink className="h-4 w-4 mr-2" />
              }
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Google para sincronizar automaticamente com o Calendar.
            </p>
            <Button
              className="w-full h-11 text-sm gap-2.5 font-medium"
              onClick={onConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Conectar com Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarCard;
