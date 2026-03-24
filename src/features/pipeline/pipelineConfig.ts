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
  { id: 'negociacao',  title: 'Negociacao',  color: 'purple'  },
  { id: 'ganho',       title: 'Ganho',       color: 'emerald' },
  { id: 'perdido',     title: 'Perdido',     color: 'rose'    },
] as const;

export type LeadStatus = (typeof PIPELINE_STAGES)[number]['id'];

export type StageColors = { hex: string; light: string; textColor: string };

export const STAGE_COLORS: Record<string, StageColors> = {
  blue:    { hex: '#2563eb', light: 'rgba(37,99,235,0.07)',   textColor: '#1d4ed8' },
  cyan:    { hex: '#0891b2', light: 'rgba(8,145,178,0.07)',   textColor: '#0e7490' },
  amber:   { hex: '#d97706', light: 'rgba(217,119,6,0.07)',   textColor: '#b45309' },
  indigo:  { hex: '#4f46e5', light: 'rgba(79,70,229,0.07)',   textColor: '#4338ca' },
  purple:  { hex: '#7c3aed', light: 'rgba(124,58,237,0.07)',  textColor: '#6d28d9' },
  emerald: { hex: '#059669', light: 'rgba(5,150,105,0.07)',   textColor: '#047857' },
  rose:    { hex: '#e11d48', light: 'rgba(225,29,72,0.07)',   textColor: '#be123c' },
  sky:     { hex: '#0284c7', light: 'rgba(2,132,199,0.07)',   textColor: '#0369a1' },
};

/** Map from status ID to human-readable label */
export const LEAD_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.title]),
);

/** @deprecated Use LEAD_STATUS_LABELS instead */
export const STATUS_LABELS = LEAD_STATUS_LABELS;
