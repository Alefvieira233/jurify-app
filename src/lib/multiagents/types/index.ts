/**
 * 🚀 JURIFY MULTIAGENT SYSTEM - TYPES
 *
 * Definições de tipos estritas para o sistema multiagentes.
 * Type-safe, sem any's, enterprise grade.
 *
 * @version 2.0.0
 */

// 🎯 CONFIGURAÇÕES DE AGENTES
export const AGENT_CONFIG = {
  NAMES: {
    COORDINATOR: 'Coordenador',
    QUALIFIER: 'Qualificador',
    LEGAL: 'Juridico',
    COMMERCIAL: 'Comercial',
    ANALYST: 'Analista',
    COMMUNICATOR: 'Comunicador',
    CUSTOMER_SUCCESS: 'CustomerSuccess'
  },
  IDS: {
    COORDINATOR: 'coordenador',
    QUALIFIER: 'qualificador',
    LEGAL: 'juridico',
    COMMERCIAL: 'comercial',
    ANALYST: 'analista',
    COMMUNICATOR: 'comunicador',
    CUSTOMER_SUCCESS: 'customer_success'
  }
} as const;

// 🎯 TIPOS DE MENSAGENS ENTRE AGENTES
export enum MessageType {
  TASK_REQUEST = 'task_request',
  TASK_RESPONSE = 'task_response',
  DATA_SHARE = 'data_share',
  DECISION_REQUEST = 'decision_request',
  DECISION_RESPONSE = 'decision_response',
  STATUS_UPDATE = 'status_update',
  ERROR_REPORT = 'error_report'
}

// 🎖️ PRIORIDADES
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export type MessagePriority = Priority;

// 📨 ESTRUTURA DE MENSAGEM ENTRE AGENTES
export interface AgentMessage<T = unknown> {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: T;
  timestamp: Date;
  priority: MessagePriority;
  requires_response: boolean;
}

// 🧠 CONTEXTO COMPARTILHADO ENTRE AGENTES
export interface SharedContext {
  leadId: string;
  conversationHistory: ConversationEntry[];
  leadData: LeadData;
  currentStage: LeadStage;
  decisions: Record<string, DecisionRecord>;
  metadata: ContextMetadata;
}

export interface ConversationEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentName?: string;
}

export interface LeadData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  legal_area?: string;
  urgency?: MessagePriority;
  source?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export type LeadStage =
  | 'new'
  | 'analyzing'
  | 'qualified'
  | 'legal_validation'
  | 'proposal_created'
  | 'proposal_sent'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export interface DecisionRecord {
  decisionMaker: string;
  decision: string;
  reasoning: string;
  timestamp: Date;
  confidence: number;
}

export interface ContextMetadata {
  channel: 'whatsapp' | 'email' | 'chat' | 'phone' | 'playground';
  timestamp: Date;
  tenantId?: string;
  userId?: string;
  [key: string]: unknown;
}

// 🤖 CONFIGURAÇÃO DE AGENTE
export interface AgentConfig {
  name: string;
  specialization: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// 🧠 REQUISIÇÃO DE IA PARA EDGE FUNCTION
export interface AgentAIRequest {
  agentName: string;
  agentSpecialization: string;
  systemPrompt: string;
  userPrompt: string;
  context?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  leadId?: string;
  tenantId?: string;
}

// ✅ RESPOSTA DE IA DA EDGE FUNCTION
export interface AgentAIResponse {
  result: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  agentName: string;
  timestamp: string;
}

// 📊 ESTATÍSTICAS DO SISTEMA
export interface SystemStats {
  total_agents: number;
  messages_processed: number;
  active_agents: string[];
  last_activity?: Date;
}

// 🎯 PAYLOADS ESPECÍFICOS DE TAREFAS
export interface TaskRequestPayload {
  task: string;
  data: unknown;
  context?: SharedContext;
  plan?: string;
  [key: string]: unknown;
}

export interface TaskResponsePayload {
  task: string;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface StatusUpdatePayload {
  stage: LeadStage;
  message?: string;
  data?: unknown;
  next_action?: string;
  analysis?: string;
  validation?: string;
  proposal?: string;
  channel?: string;
  message_id?: string;
  viable?: boolean;
}

export interface ErrorReportPayload {
  error: string;
  original_message_id: string;
  stack?: string;
  context?: unknown;
}

// 🔄 INTERFACE DE ROTEADOR DE MENSAGENS
export interface IMessageRouter {
  routeMessage(message: AgentMessage): Promise<void>;
}

// 🤖 INTERFACE BASE DE AGENTE
export interface IAgent {
  getName(): string;
  getSpecialization(): string;
  receiveMessage(message: AgentMessage): Promise<void>;
}

// =========================================================================
// 🎯 EXECUTION TRACKER TYPES - Sistema de rastreamento de execução
// =========================================================================

export type ExecutionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';

export interface StageResult {
  stageName: string;
  agentName: string;
  result: unknown;
  tokens: number;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface ExecutionResult {
  executionId: string;
  leadId: string;
  tenantId: string;
  status: ExecutionStatus;
  stages: StageResult[];
  qualificationResult: unknown | null;
  legalValidation: unknown | null;
  proposal: unknown | null;
  formattedMessages: string | null;
  finalResult: unknown | null;
  totalTokens: number;
  estimatedCost: number;
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs?: number;
  error?: string;
}

export interface ExecutionTrackerConfig {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export const DEFAULT_EXECUTION_CONFIG: ExecutionTrackerConfig = {
  timeoutMs: 60000,
  maxRetries: 3,
  retryDelayMs: 2000,
};

// =========================================================================
// 🔄 TIPOS MIGRADOS DO LEGACY (agents-legacy/AgentEngine)
// Mantidos para compatibilidade com componentes de UI existentes
// =========================================================================

export enum AgentType {
  SDR = 'sdr',
  CLOSER = 'closer',
  CS = 'customer_success',
}

export interface LegacyAgentConfig {
  id: string;
  name: string;
  type: AgentType;
  area_juridica: string;
  prompt_base: string;
  personality: string;
  specialization: string[];
  max_interactions: number;
  escalation_rules: EscalationRule[];
  active: boolean;
}

export interface EscalationRule {
  condition: string;
  next_agent_type: AgentType;
  trigger_keywords: string[];
  confidence_threshold: number;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  agent_id: string;
  message: string;
  response: string;
  sentiment: number;
  confidence: number;
  next_action: string;
  created_at: Date;
}
