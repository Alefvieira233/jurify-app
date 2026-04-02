import type { ConexaoWhatsApp } from '@/hooks/useConexoes';

export interface ConnectionDetailsDrawerProps {
  conexao: ConexaoWhatsApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface DiagnosticoResult {
  sessaoConectada: boolean | null;
  ultimoHeartbeat: string | null;
  reconexoes: number;
  ultimoErro: string | null;
  kapsoReachable: boolean | null;
}

export const SEVERITY_STYLES: Record<string, string> = {
  debug:    'text-slate-500 bg-slate-100 dark:bg-slate-800/40',
  info:     'text-blue-600  bg-blue-50   dark:bg-blue-900/30',
  warning:  'text-amber-600 bg-amber-50  dark:bg-amber-900/30',
  error:    'text-red-600   bg-red-50    dark:bg-red-900/30',
  critical: 'text-red-700   bg-red-100   dark:bg-red-900/50',
};

export const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  connected:    { label: 'Conectado',    variant: 'default' },
  disconnected: { label: 'Desconectado', variant: 'destructive' },
  connecting:   { label: 'Conectando',   variant: 'secondary' },
  error:        { label: 'Erro',         variant: 'destructive' },
};

export const ALERTA_TYPE_LABELS: Record<string, string> = {
  desconexao:          'Desconex\u00e3o',
  qr_expirado:        'QR Expirado',
  falha_reconexao:     'Falha de Reconex\u00e3o',
  erro_autenticacao:   'Erro de Autentica\u00e7\u00e3o',
  instabilidade:       'Instabilidade',
  falha_envio:         'Falha de Envio',
};

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `h\u00e1 ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `h\u00e1 ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `h\u00e1 ${diffD}d`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
