import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MessageSendStatus } from '@/hooks/useWhatsAppConversations';

// ── Module-level pure helpers ────────────────────────────────────────────────

export const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
];

export function getAvatarColor(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? 'bg-emerald-500';
}

export function getConvInitials(name: string | null, phone: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    return parts.length > 1
      ? ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
      : first.substring(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

export function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    ativo: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    aguardando: { label: 'Aguardando', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    qualificado: { label: 'Agendado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    finalizado: { label: 'Finalizado', className: 'bg-muted text-muted-foreground border-border' },
  };
  const badge = map[status] ?? map.finalizado ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
      {badge.label}
    </Badge>
  );
}

export function getDeliveryStatusIcon(status: MessageSendStatus | undefined) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-amber-300" />;
    case 'sent':
      return <Check className="h-3 w-3 text-white/60" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-blue-300" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-400" />;
    default:
      return <Check className="h-3 w-3 text-white/60" />;
  }
}

export function getAgentStatusBadge(agentStatus: string | undefined) {
  if (!agentStatus || agentStatus === 'idle') return null;
  if (agentStatus === 'processing') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 animate-pulse">
        IA processando...
      </Badge>
    );
  }
  if (agentStatus === 'failed') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 bg-red-50 dark:bg-red-950/20">
        Erro IA
      </Badge>
    );
  }
  if (agentStatus === 'waiting_human') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/20">
        Aguardando humano
      </Badge>
    );
  }
  return null;
}
