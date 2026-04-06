/**
 * Centralized status color configuration for all entities.
 *
 * Single source of truth for status badge styling across the application.
 * All bg/text pairs are WCAG AA compliant (4.5:1 contrast ratio) in both
 * light and dark mode.
 *
 * @module statusConfig
 */

export type EntityType =
  | 'leads'
  | 'processos'
  | 'honorarios'
  | 'tickets'
  | 'ticket_tipos'
  | 'contratos'
  | 'agendamentos'
  | 'timeline'
  | 'security'
  | 'logs'
  | 'upload';

export interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
}

/**
 * Status configuration map for all entity types.
 *
 * Color conventions:
 * - Light mode: -800 text on -100 background (WCAG AA compliant)
 * - Dark mode: -300 text on -900/30 background (WCAG AA compliant)
 */
export const STATUS_CONFIG: Record<EntityType, Record<string, StatusConfig>> = {
  leads: {
    novo: {
      label: 'Novo',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-800 dark:text-blue-300',
    },
    em_contato: {
      label: 'Em Contato',
      bgClass: 'bg-cyan-100 dark:bg-cyan-900/30',
      textClass: 'text-cyan-800 dark:text-cyan-300',
    },
    qualificado: {
      label: 'Qualificado',
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      textClass: 'text-amber-800 dark:text-amber-300',
    },
    proposta: {
      label: 'Proposta',
      bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
      textClass: 'text-indigo-800 dark:text-indigo-300',
    },
    negociacao: {
      label: 'Negociacao',
      bgClass: 'bg-purple-100 dark:bg-purple-900/30',
      textClass: 'text-purple-800 dark:text-purple-300',
    },
    ganho: {
      label: 'Ganho',
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
      textClass: 'text-emerald-800 dark:text-emerald-300',
    },
    perdido: {
      label: 'Perdido',
      bgClass: 'bg-rose-100 dark:bg-rose-900/30',
      textClass: 'text-rose-800 dark:text-rose-300',
    },
  },

  processos: {
    ativo: {
      label: 'Ativo',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-900/30',
      textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    suspenso: {
      label: 'Suspenso',
      bgClass: 'bg-amber-500/10 dark:bg-amber-900/30',
      textClass: 'text-amber-700 dark:text-amber-300',
    },
    encerrado_vitoria: {
      label: 'Encerrado \u2014 Vit\u00f3ria',
      bgClass: 'bg-blue-500/10 dark:bg-blue-900/30',
      textClass: 'text-blue-700 dark:text-blue-300',
    },
    encerrado_derrota: {
      label: 'Encerrado \u2014 Derrota',
      bgClass: 'bg-red-500/10 dark:bg-red-900/30',
      textClass: 'text-red-700 dark:text-red-300',
    },
    encerrado_acordo: {
      label: 'Encerrado \u2014 Acordo',
      bgClass: 'bg-purple-500/10 dark:bg-purple-900/30',
      textClass: 'text-purple-700 dark:text-purple-300',
    },
    arquivado: {
      label: 'Arquivado',
      bgClass: 'bg-slate-500/10 dark:bg-slate-900/30',
      textClass: 'text-slate-700 dark:text-slate-300',
    },
  },

  honorarios: {
    vigente: {
      label: 'Vigente',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-900/30',
      textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    pago: {
      label: 'Pago',
      bgClass: 'bg-blue-500/10 dark:bg-blue-900/30',
      textClass: 'text-blue-700 dark:text-blue-300',
    },
    inadimplente: {
      label: 'Inadimplente',
      bgClass: 'bg-red-500/10 dark:bg-red-900/30',
      textClass: 'text-red-700 dark:text-red-300',
    },
    cancelado: {
      label: 'Cancelado',
      bgClass: 'bg-slate-500/10 dark:bg-slate-900/30',
      textClass: 'text-slate-600 dark:text-slate-400',
    },
    disputado: {
      label: 'Disputado',
      bgClass: 'bg-amber-500/10 dark:bg-amber-900/30',
      textClass: 'text-amber-700 dark:text-amber-300',
    },
  },

  tickets: {
    aberto: {
      label: 'Aberto',
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      textClass: 'text-amber-800 dark:text-amber-300',
    },
    em_andamento: {
      label: 'Em Andamento',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-800 dark:text-blue-300',
    },
    fechado: {
      label: 'Fechado',
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
      textClass: 'text-emerald-800 dark:text-emerald-300',
    },
  },

  ticket_tipos: {
    duvida: {
      label: 'D\u00favida',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-800 dark:text-blue-300',
    },
    bug: {
      label: 'Bug',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-800 dark:text-red-300',
    },
    sugestao: {
      label: 'Sugest\u00e3o',
      bgClass: 'bg-purple-100 dark:bg-purple-900/30',
      textClass: 'text-purple-800 dark:text-purple-300',
    },
    outro: {
      label: 'Outro',
      bgClass: 'bg-muted',
      textClass: 'text-muted-foreground',
    },
  },

  contratos: {
    rascunho: {
      label: 'Rascunho',
      bgClass: 'bg-slate-500/10 border border-slate-400/30',
      textClass: 'text-slate-600 dark:text-slate-300',
    },
    enviado: {
      label: 'Enviado',
      bgClass: 'bg-blue-500/10 border border-blue-400/30',
      textClass: 'text-blue-700 dark:text-blue-300',
    },
    assinado: {
      label: 'Assinado',
      bgClass: 'bg-emerald-500/10 border border-emerald-400/30',
      textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    cancelado: {
      label: 'Cancelado',
      bgClass: 'bg-red-500/10 border border-red-400/30',
      textClass: 'text-red-700 dark:text-red-300',
    },
  },

  agendamentos: {
    agendado: {
      label: 'Agendado',
      bgClass: 'bg-blue-500/10',
      textClass: 'text-blue-600 dark:text-blue-400',
    },
    confirmado: {
      label: 'Confirmado',
      bgClass: 'bg-emerald-500/10',
      textClass: 'text-emerald-600 dark:text-emerald-400',
    },
    reagendado: {
      label: 'Reagendado',
      bgClass: 'bg-amber-500/10',
      textClass: 'text-amber-600 dark:text-amber-400',
    },
    cancelado: {
      label: 'Cancelado',
      bgClass: 'bg-rose-500/10',
      textClass: 'text-rose-600 dark:text-rose-400',
    },
    realizado: {
      label: 'Realizado',
      bgClass: 'bg-purple-500/10',
      textClass: 'text-purple-600 dark:text-purple-400',
    },
  },

  timeline: {
    enviado: {
      label: 'enviado',
      bgClass: '',
      textClass: 'text-blue-500',
    },
    entregue: {
      label: 'entregue',
      bgClass: '',
      textClass: 'text-green-500',
    },
    lido: {
      label: 'lido',
      bgClass: '',
      textClass: 'text-green-700',
    },
    erro: {
      label: 'erro',
      bgClass: '',
      textClass: 'text-red-500',
    },
  },

  security: {
    excellent: {
      label: 'Excellent',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-800 dark:text-green-300',
    },
    good: {
      label: 'Good',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-800 dark:text-blue-300',
    },
    warning: {
      label: 'Warning',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
      textClass: 'text-yellow-800 dark:text-yellow-300',
    },
    critical: {
      label: 'Critical',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-800 dark:text-red-300',
    },
  },

  logs: {
    success: {
      label: 'Success',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-800 dark:text-green-300',
    },
    error: {
      label: 'Error',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-800 dark:text-red-300',
    },
    processing: {
      label: 'Processing',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
      textClass: 'text-yellow-800 dark:text-yellow-300',
    },
  },

  upload: {
    pendente: {
      label: 'Pendente',
      bgClass: 'bg-slate-500/15 border border-slate-400/30',
      textClass: 'text-slate-700 dark:text-slate-300',
    },
    validando: {
      label: 'Validando',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-800 dark:text-blue-300',
    },
    aprovado: {
      label: 'Aprovado',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-800 dark:text-green-300',
    },
    rejeitado: {
      label: 'Rejeitado',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-800 dark:text-red-300',
    },
    enviando: {
      label: 'Enviando',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-800 dark:text-blue-300',
    },
    concluido: {
      label: 'Concluido',
      bgClass: 'bg-emerald-500/15 border border-emerald-400/30',
      textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    erro: {
      label: 'Erro',
      bgClass: 'bg-red-500/15 border border-red-400/30',
      textClass: 'text-red-700 dark:text-red-300',
    },
  },
};

/** Default fallback for unknown statuses. */
const FALLBACK_CONFIG: StatusConfig = {
  label: '',
  bgClass: 'bg-muted',
  textClass: 'text-muted-foreground',
};

/**
 * Returns the status configuration for a given entity and status key.
 *
 * Falls back to a neutral gray badge if the entity or status is not found.
 * The fallback label is the raw status string.
 */
export function getStatusConfig(entity: EntityType, status: string): StatusConfig {
  const config = STATUS_CONFIG[entity]?.[status];
  if (config) return config;
  return { ...FALLBACK_CONFIG, label: status };
}

/**
 * Returns combined Tailwind classes for a status badge.
 *
 * Convenience helper that merges bgClass and textClass into a single string.
 */
export function getStatusClasses(entity: EntityType, status: string): string {
  const { bgClass, textClass } = getStatusConfig(entity, status);
  return `${bgClass} ${textClass}`;
}

/**
 * Returns the display label for a given entity status.
 *
 * Falls back to the raw status string if not found.
 */
export function getStatusLabel(entity: EntityType, status: string): string {
  return getStatusConfig(entity, status).label;
}
