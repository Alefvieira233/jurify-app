/**
 * CRM ↔ Agent Lead Stage Mapping
 *
 * The CRM uses Portuguese status values while the AI agent system
 * uses English LeadStage values (defined in schemas.ts).
 *
 * CRM statuses:   novo, em_contato, qualificado, proposta, negociacao, ganho, perdido
 * Agent stages:   new, analyzing, qualified, legal_validation, proposal_created,
 *                 proposal_sent, negotiation, closed_won, closed_lost
 */

const crmToAgentMap: Record<string, string> = {
  novo: 'new',
  em_contato: 'analyzing',
  qualificado: 'qualified',
  proposta: 'proposal_created',
  negociacao: 'negotiation',
  ganho: 'closed_won',
  perdido: 'closed_lost',
};

const agentToCrmMap: Record<string, string> = {
  new: 'novo',
  analyzing: 'em_contato',
  qualified: 'qualificado',
  legal_validation: 'qualificado',
  proposal_created: 'proposta',
  proposal_sent: 'proposta',
  negotiation: 'negociacao',
  closed_won: 'ganho',
  closed_lost: 'perdido',
};

/**
 * Convert a CRM lead status to the corresponding AI agent LeadStage.
 * Returns the input unchanged if no mapping exists.
 */
export function crmToAgentStage(crmStatus: string): string {
  return crmToAgentMap[crmStatus] ?? crmStatus;
}

/**
 * Convert an AI agent LeadStage to the corresponding CRM status.
 * Returns the input unchanged if no mapping exists.
 */
export function agentStageToCrm(agentStage: string): string {
  return agentToCrmMap[agentStage] ?? agentStage;
}
