/**
 * Lead status pipeline — single source of truth for the CRM.
 * Must match the PostgreSQL trigger in 20260408000002_lead_status_state_machine.sql
 */

export const LEAD_STATUSES = ['novo', 'em_contato', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'] as const;
/** Legacy statuses accepted by DB but not shown in pipeline UI */
export const LEGACY_STATUSES = ['em_proposta', 'contratado'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  em_contato: 'Em Contato',
  qualificado: 'Qualificado',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

/** Valid transitions from each status. Ganho is terminal. Perdido can restart. */
const VALID_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  novo:        ['em_contato', 'qualificado', 'perdido'],
  em_contato:  ['qualificado', 'proposta', 'perdido'],
  qualificado: ['proposta', 'perdido', 'em_contato'],
  proposta:    ['negociacao', 'ganho', 'perdido', 'qualificado'],
  negociacao:  ['ganho', 'perdido', 'proposta'],
  ganho:       [],
  perdido:     ['novo'],
};

/** Check if a status transition is allowed. */
export function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as LeadStatus];
  if (!allowed) return true; // Unknown status — allow (legacy)
  return allowed.includes(to as LeadStatus);
}

/** Get list of valid next statuses for a given current status. */
export function getValidNextStatuses(current: string): LeadStatus[] {
  return [...(VALID_TRANSITIONS[current as LeadStatus] || LEAD_STATUSES)];
}
