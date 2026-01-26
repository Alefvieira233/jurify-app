/**
 * 🚀 JURIFY MULTIAGENT SYSTEM - MAIN EXPORT
 *
 * Ponto de entrada principal para o sistema de multiagentes.
 * Arquitetura refatorada: modular, segura e enterprise-grade.
 *
 * @version 2.0.0
 */

// Type exports
export * from './types';

// Core exports
export { BaseAgent } from './core/BaseAgent';
export { MultiAgentSystem, multiAgentSystem } from './core/MultiAgentSystem';

// Agent exports
export { CoordinatorAgent } from './agents/CoordinatorAgent';
export { QualifierAgent } from './agents/QualifierAgent';
export { LegalAgent } from './agents/LegalAgent';
export { CommercialAgent } from './agents/CommercialAgent';
export { AnalystAgent } from './agents/AnalystAgent';
export { CommunicatorAgent } from './agents/CommunicatorAgent';
export { CustomerSuccessAgent } from './agents/CustomerSuccessAgent';

// Validation schemas
export * from './validation/schemas';
