/**
 * ⚠️ DEPRECATED - EXPORTS LEGADO
 * 
 * Este módulo exporta APENAS tipos necessários para compatibilidade
 * com componentes de UI existentes.
 * 
 * NÃO USE para novos desenvolvimentos.
 * 
 * @deprecated Use @/lib/multiagents
 * @see DEPRECATED.md
 */

// Apenas tipos - NÃO exportar instâncias
export { AgentType } from './AgentEngine';
export type { AgentConfig, EscalationRule, LeadInteraction } from './AgentEngine';

// ⚠️ AVISO: agentEngine NÃO é exportado intencionalmente
// Use multiAgentSystem de @/lib/multiagents
