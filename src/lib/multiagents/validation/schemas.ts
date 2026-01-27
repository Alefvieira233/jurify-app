/**
 * 🛡️ JURIFY MULTIAGENT SYSTEM - VALIDATION SCHEMAS
 *
 * Schemas Zod para validação estrita de todas as entradas.
 * Type-safe, runtime validation, enterprise grade.
 *
 * @version 2.0.0
 */

import { z } from 'zod';
import { MessageType, Priority } from '../types';

// 🎯 SCHEMAS DE ENUMS
export const MessageTypeSchema = z.nativeEnum(MessageType);
export const PrioritySchema = z.nativeEnum(Priority);
export const LeadStageSchema = z.enum([
  'new',
  'analyzing',
  'qualified',
  'legal_validation',
  'proposal_created',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost'
]);
export const ChannelSchema = z.enum(['whatsapp', 'email', 'chat', 'phone']);

// 📨 SCHEMA DE MENSAGEM ENTRE AGENTES
export const AgentMessageSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  type: MessageTypeSchema,
  payload: z.unknown(),
  timestamp: z.date(),
  priority: PrioritySchema,
  requires_response: z.boolean()
});

// 🧠 SCHEMA DE CONTEXTO COMPARTILHADO
export const ConversationEntrySchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  agentName: z.string().optional()
});

export const LeadDataSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
  legal_area: z.string().optional(),
  urgency: PrioritySchema.optional(),
  source: z.string().optional(),
  tenantId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const DecisionRecordSchema = z.object({
  decisionMaker: z.string(),
  decision: z.string(),
  reasoning: z.string(),
  timestamp: z.date(),
  confidence: z.number().min(0).max(1)
});

export const ContextMetadataSchema = z.object({
  channel: ChannelSchema,
  timestamp: z.date(),
  tenantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional()
}).catchall(z.unknown());

export const SharedContextSchema = z.object({
  leadId: z.string(),
  conversationHistory: z.array(ConversationEntrySchema),
  leadData: LeadDataSchema,
  currentStage: LeadStageSchema,
  decisions: z.record(DecisionRecordSchema),
  metadata: ContextMetadataSchema
});

// 🧠 SCHEMAS DE REQUISIÇÕES DE IA
export const AgentAIRequestSchema = z.object({
  agentName: z.string().min(1, 'Agent name is required'),
  agentSpecialization: z.string().min(1, 'Agent specialization is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  userPrompt: z.string().min(1, 'User prompt is required'),
  context: z.record(z.unknown()).optional(),
  model: z.string().default('gpt-4-turbo-preview'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1500),
  leadId: z.string().optional(),
  tenantId: z.string().uuid().optional()
});

export const AgentAIResponseSchema = z.object({
  result: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  }).optional(),
  model: z.string(),
  agentName: z.string(),
  timestamp: z.string().datetime()
});

// 🎯 SCHEMAS DE PAYLOADS ESPECÍFICOS
export const TaskRequestPayloadSchema = z.object({
  task: z.string().min(1, 'Task name is required'),
  data: z.unknown(),
  context: SharedContextSchema.optional(),
  plan: z.string().optional()
}).catchall(z.unknown());

export const TaskResponsePayloadSchema = z.object({
  task: z.string(),
  result: z.unknown(),
  success: z.boolean(),
  error: z.string().optional()
});

export const StatusUpdatePayloadSchema = z.object({
  stage: LeadStageSchema,
  message: z.string().optional(),
  data: z.unknown().optional(),
  next_action: z.string().optional(),
  analysis: z.string().optional(),
  validation: z.string().optional(),
  proposal: z.string().optional(),
  channel: z.string().optional(),
  message_id: z.string().optional(),
  viable: z.boolean().optional()
});

export const ErrorReportPayloadSchema = z.object({
  error: z.string(),
  original_message_id: z.string(),
  stack: z.string().optional(),
  context: z.unknown().optional()
});

// 📊 SCHEMA DE ESTATÍSTICAS DO SISTEMA
export const SystemStatsSchema = z.object({
  total_agents: z.number().int().nonnegative(),
  messages_processed: z.number().int().nonnegative(),
  active_agents: z.array(z.string()),
  last_activity: z.date().optional()
});

// 🔧 FUNÇÕES HELPER DE VALIDAÇÃO
export function validateAgentMessage(data: unknown) {
  return AgentMessageSchema.parse(data);
}

export function validateAgentAIRequest(data: unknown) {
  return AgentAIRequestSchema.parse(data);
}

export function validateAgentAIResponse(data: unknown) {
  return AgentAIResponseSchema.parse(data);
}

export function validateLeadData(data: unknown) {
  return LeadDataSchema.parse(data);
}

export function validateTaskRequestPayload(data: unknown) {
  return TaskRequestPayloadSchema.parse(data);
}

export function validateStatusUpdatePayload(data: unknown) {
  return StatusUpdatePayloadSchema.parse(data);
}

// 🔒 SAFE PARSE (retorna resultado em vez de throw)
export function safeParseAgentMessage(data: unknown) {
  return AgentMessageSchema.safeParse(data);
}

export function safeParseAgentAIRequest(data: unknown) {
  return AgentAIRequestSchema.safeParse(data);
}

export function safeParseLeadData(data: unknown) {
  return LeadDataSchema.safeParse(data);
}

// 📝 TIPOS INFERRED A PARTIR DOS SCHEMAS (type-safe)
export type ValidatedAgentMessage = z.infer<typeof AgentMessageSchema>;
export type ValidatedAgentAIRequest = z.infer<typeof AgentAIRequestSchema>;
export type ValidatedAgentAIResponse = z.infer<typeof AgentAIResponseSchema>;
export type ValidatedLeadData = z.infer<typeof LeadDataSchema>;
export type ValidatedTaskRequestPayload = z.infer<typeof TaskRequestPayloadSchema>;
export type ValidatedStatusUpdatePayload = z.infer<typeof StatusUpdatePayloadSchema>;
