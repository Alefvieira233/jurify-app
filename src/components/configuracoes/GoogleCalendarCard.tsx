import { Calendar, CheckCircle2, Unlink, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useGoogleCalendarConnection } from '@/hooks/useGoogleCalendarConnection';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function GoogleCalendarCard() {
  const { status, isLoading, isConnecting, isDisconnecting, error, connect, disconnect, refetch } =
    useGoogleCalendarConnection();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-52 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={status.connected ? 'border-emerald-200 dark:border-emerald-800/50' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Google Calendar
                {status.connected && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-600 border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20 font-semibold"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    Conectado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Sincronize agendamentos com sua conta Google
              </CardDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/40 hover:text-foreground flex-shrink-0"
            onClick={() => void refetch()}
            title="Atualizar status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {status.connected ? (
          <div className="space-y-3">
            {/* Account info */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-muted/50">
              <Avatar className="h-8 w-8">
                {status.picture && <AvatarImage src={status.picture} alt={status.name ?? ''} />}
                <AvatarFallback className="text-[11px]">
                  {status.name?.charAt(0).toUpperCase() ?? 'G'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {status.name && (
                  <p className="text-xs font-medium text-foreground truncate">{status.name}</p>
                )}
                <p className="text-[11px] text-muted-foreground truncate">{status.email}</p>
              </div>
            </div>

            {status.connectedAt && (
              <p className="text-[10px] text-muted-foreground/60">
                Conectado{' '}
                {formatDistanceToNow(new Date(status.connectedAt), { addSuffix: true, locale: ptBR })}
              </p>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 text-muted-foreground"
              onClick={disconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Unlink className="h-3.5 w-3.5 mr-2" />
              )}
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Conecte sua conta Google para sincronizar agendamentos automaticamente com o Calendar.
            </p>
            <Button
              className="w-full h-9 text-sm gap-2"
              onClick={() => void connect()}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                /* Google "G" SVG mark */
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Conectar com Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
