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
  | 'ticket_tipos';

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
      bgClass: 'bg-gray-100 dark:bg-gray-800',
      textClass: 'text-gray-700 dark:text-gray-300',
    },
  },
};

/** Default fallback for unknown statuses. */
const FALLBACK_CONFIG: StatusConfig = {
  label: '',
  bgClass: 'bg-gray-100 dark:bg-gray-800',
  textClass: 'text-gray-600 dark:text-gray-400',
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
