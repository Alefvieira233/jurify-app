import type { ConexaoWhatsApp } from '@/hooks/useConexoes';

export interface ConnectionDetailsDrawerProps {
  conexao: ConexaoWhatsApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Single check returned by the backend diagnose action */
export interface DiagnoseCheck {
  ok: boolean;
  detail: string;
}

/** Full response from kapso-manager action: "diagnose" */
export interface DiagnosticoResult {
  healthy: boolean;
  checks: Record<string, DiagnoseCheck>;
  timestamp: string;
}

/** Label map for backend check keys → user-friendly Portuguese labels */
export const DIAGNOSE_CHECK_LABELS: Record<string, { label: string; icon: string }> = {
  config:             { label: 'Configuração Kapso',     icon: 'settings' },
  api_key:            { label: 'API Key',                icon: 'key' },
  phone_number_id:    { label: 'Número do WhatsApp',     icon: 'phone' },
  kapso_customer_id:  { label: 'Customer ID Kapso',      icon: 'user' },
  kapso_phones:       { label: 'Números na Kapso',       icon: 'signal' },
  conexao:            { label: 'Conexão Local',          icon: 'database' },
  webhook_registered: { label: 'Webhook Registrado',     icon: 'signal' },
  webhook_events:     { label: 'Webhook Events',         icon: 'activity' },
  env_reminder:       { label: 'Variáveis de Ambiente',  icon: 'shield' },
};

export const SEVERITY_STYLES: Record<string, string> = {
  debug:    'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40',
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
