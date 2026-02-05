/**
 * 🤖 HOOKS DE AGENTES - Arquitetura Modular
 * 
 * Hooks refatorados seguindo Single Responsibility Principle:
 * - useAgentStats: Estatísticas e métricas de performance
 * - useAgentCrud: Operações CRUD (Create, Read, Update, Delete)
 * - useAgentTest: Testes de agentes
 */

export { useAgentStats, type AgentStats, type AgentPerformance } from './useAgentStats';
export { useAgentCrud, type CreateAgentRequest } from './useAgentCrud';
export { useAgentTest } from './useAgentTest';
