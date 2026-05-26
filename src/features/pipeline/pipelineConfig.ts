/**
 * Unified pipeline/status configuration.
 * These status IDs are the single source of truth for lead status values
 * across PipelineJuridico, KanbanOperacional, and LeadDrawer.
 */
export const PIPELINE_STAGES = [
  { id: 'novo',        title: 'Novo',        color: 'blue'    },
  { id: 'em_contato',  title: 'Em Contato',  color: 'cyan'    },
  { id: 'qualificado', title: 'Qualificado', color: 'amber'   },
  { id: 'proposta',    title: 'Proposta',    color: 'indigo'  },
  { id: 'negociacao',  title: 'Negociação',  color: 'purple'  },
  { id: 'ganho',       title: 'Ganho',       color: 'emerald' },
  { id: 'perdido',     title: 'Perdido',     color: 'rose'    },
] as const;

export type LeadStatus = (typeof PIPELINE_STAGES)[number]['id'];

export type StageColors = {
  hex: string;
  light: string;
  textColor: string;
  /** Dark-mode aware Tailwind classes */
  twBg: string;
  twBgSubtle: string;
  twText: string;
  twIcon: string;
};

export const STAGE_COLORS: Record<string, StageColors> = {
  blue:    { hex: '#2563eb', light: 'rgba(37,99,235,0.07)',   textColor: '#1d4ed8', twBg: 'bg-blue-600 dark:bg-blue-500',         twBgSubtle: 'bg-blue-600/10 dark:bg-blue-400/15',     twText: 'text-blue-700 dark:text-blue-400',     twIcon: 'text-blue-600 dark:text-blue-400'    },
  cyan:    { hex: '#0891b2', light: 'rgba(8,145,178,0.07)',   textColor: '#0e7490', twBg: 'bg-cyan-600 dark:bg-cyan-500',         twBgSubtle: 'bg-cyan-600/10 dark:bg-cyan-400/15',     twText: 'text-cyan-700 dark:text-cyan-400',     twIcon: 'text-cyan-600 dark:text-cyan-400'    },
  amber:   { hex: '#d97706', light: 'rgba(217,119,6,0.07)',   textColor: '#b45309', twBg: 'bg-amber-600 dark:bg-amber-500',       twBgSubtle: 'bg-amber-600/10 dark:bg-amber-400/15',   twText: 'text-amber-700 dark:text-amber-400',   twIcon: 'text-amber-600 dark:text-amber-400'  },
  indigo:  { hex: '#4f46e5', light: 'rgba(79,70,229,0.07)',   textColor: '#4338ca', twBg: 'bg-indigo-600 dark:bg-indigo-500',     twBgSubtle: 'bg-indigo-600/10 dark:bg-indigo-400/15', twText: 'text-indigo-700 dark:text-indigo-400', twIcon: 'text-indigo-600 dark:text-indigo-400' },
  purple:  { hex: '#7c3aed', light: 'rgba(124,58,237,0.07)',  textColor: '#6d28d9', twBg: 'bg-violet-600 dark:bg-violet-500',     twBgSubtle: 'bg-violet-600/10 dark:bg-violet-400/15', twText: 'text-violet-700 dark:text-violet-400', twIcon: 'text-violet-600 dark:text-violet-400' },
  emerald: { hex: '#059669', light: 'rgba(5,150,105,0.07)',   textColor: '#047857', twBg: 'bg-emerald-600 dark:bg-emerald-500',   twBgSubtle: 'bg-emerald-600/10 dark:bg-emerald-400/15', twText: 'text-emerald-700 dark:text-emerald-400', twIcon: 'text-emerald-600 dark:text-emerald-400' },
  rose:    { hex: '#e11d48', light: 'rgba(225,29,72,0.07)',   textColor: '#be123c', twBg: 'bg-rose-600 dark:bg-rose-500',         twBgSubtle: 'bg-rose-600/10 dark:bg-rose-400/15',     twText: 'text-rose-700 dark:text-rose-400',     twIcon: 'text-rose-600 dark:text-rose-400'    },
  sky:     { hex: '#0284c7', light: 'rgba(2,132,199,0.07)',   textColor: '#0369a1', twBg: 'bg-sky-600 dark:bg-sky-500',           twBgSubtle: 'bg-sky-600/10 dark:bg-sky-400/15',       twText: 'text-sky-700 dark:text-sky-400',       twIcon: 'text-sky-600 dark:text-sky-400'      },
};

/**
 * Map from status ID to human-readable label.
 *
 * A1.2 (auditoria 2026-05-25): mantemos derivado de PIPELINE_STAGES porque
 * este arquivo é usado em componentes de pipeline que precisam do mesmo
 * shape exposto pelos stages (id + color). A canonical single source ainda
 * é `@/constants/leadStatus` — Vitest valida que ambos batem (ver
 * `src/tests/leadStatus.consistency.test.ts`).
 *
 * Em runtime, se um stage for renomeado em PIPELINE_STAGES sem refletir em
 * `constants/leadStatus.ts`, o teste falha — gateando o drift.
 */
export const LEAD_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.title]),
);

