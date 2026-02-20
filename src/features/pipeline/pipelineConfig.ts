export const PIPELINE_STAGES = [
  { id: 'novo_lead',         title: 'Captação',     color: 'blue'    },
  { id: 'em_qualificacao',   title: 'Qualificação', color: 'amber'   },
  { id: 'proposta_enviada',  title: 'Proposta',     color: 'indigo'  },
  { id: 'contrato_assinado', title: 'Contrato',     color: 'emerald' },
  { id: 'em_atendimento',    title: 'Execução',     color: 'sky'     },
  { id: 'lead_perdido',      title: 'Arquivados',   color: 'rose'    },
];

export type StageColors = { hex: string; light: string; textColor: string };

export const STAGE_COLORS: Record<string, StageColors> = {
  blue:    { hex: '#2563eb', light: 'rgba(37,99,235,0.07)',   textColor: '#1d4ed8' },
  amber:   { hex: '#d97706', light: 'rgba(217,119,6,0.07)',   textColor: '#b45309' },
  indigo:  { hex: '#4f46e5', light: 'rgba(79,70,229,0.07)',   textColor: '#4338ca' },
  emerald: { hex: '#059669', light: 'rgba(5,150,105,0.07)',   textColor: '#047857' },
  sky:     { hex: '#0284c7', light: 'rgba(2,132,199,0.07)',   textColor: '#0369a1' },
  rose:    { hex: '#e11d48', light: 'rgba(225,29,72,0.07)',   textColor: '#be123c' },
};
