/**
 * 🏢 HOOKS ENTERPRISE - Arquitetura Modular
 * 
 * Hooks refatorados seguindo Single Responsibility Principle:
 * - useEnterpriseMetrics: Métricas em tempo real e saúde do sistema
 * - useEnterpriseLeadProcessor: Processamento e validação de leads
 * - useEnterpriseActivity: Atividade recente do sistema
 */

export { useEnterpriseMetrics, type RealTimeMetrics, type AgentMetrics, type SystemHealth } from './useEnterpriseMetrics';
export { useEnterpriseLeadProcessor, validateLeadData, type EnterpriseLeadData } from './useEnterpriseLeadProcessor';
export { useEnterpriseActivity } from './useEnterpriseActivity';
