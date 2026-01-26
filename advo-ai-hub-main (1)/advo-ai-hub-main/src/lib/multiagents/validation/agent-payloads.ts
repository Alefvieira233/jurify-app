/**
 * 🛡️ JURIFY - AGENT-SPECIFIC PAYLOAD SCHEMAS
 *
 * Schemas Zod específicos para cada agente do sistema.
 * Validação blindada de inputs/outputs de cada agente especializado.
 *
 * @version 2.0.0
 */

import { z } from 'zod';
import { LeadDataSchema, PrioritySchema } from './schemas';

// =========================================================================
// QUALIFICADOR (Qualifier Agent)
// =========================================================================

export const QualificationResultSchema = z.object({
  legal_area: z.enum([
    'Trabalhista',
    'Civil',
    'Família',
    'Previdenciário',
    'Criminal',
    'Empresarial',
    'Tributário',
    'Consumidor',
    'Outros'
  ]),
  urgency: PrioritySchema,
  potential_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  recommended_next_steps: z.array(z.string()),
  qualification_notes: z.string().optional(),
  estimated_complexity: z.enum(['baixa', 'média', 'alta', 'muito alta']),
  estimated_duration_days: z.number().int().positive().optional()
});

export const AnalyzeLeadPayloadSchema = z.object({
  task: z.literal('analyze_lead'),
  leadId: z.string(),
  data: LeadDataSchema,
  context: z.record(z.unknown()).optional()
});

// =========================================================================
// JURÍDICO (Legal Agent)
// =========================================================================

export const LegalValidationSchema = z.object({
  is_viable: z.boolean(),
  legal_basis: z.array(z.string()),
  precedents: z.array(z.object({
    case_number: z.string().optional(),
    court: z.string(),
    summary: z.string(),
    relevance: z.number().min(0).max(1)
  })).optional(),
  complexity_assessment: z.enum(['simples', 'moderada', 'complexa', 'muito complexa']),
  estimated_duration_months: z.number().positive().optional(),
  success_probability: z.number().min(0).max(100),
  required_documents: z.array(z.string()),
  legal_risks: z.array(z.string()),
  recommended_strategy: z.string(),
  estimated_court_costs: z.number().nonnegative().optional(),
  additional_notes: z.string().optional()
});

export const ValidateLegalCasePayloadSchema = z.object({
  task: z.literal('validate_legal_case'),
  leadId: z.string(),
  analysis: z.string(), // Resultado do Qualificador
  original_data: LeadDataSchema,
  context: z.record(z.unknown()).optional()
});

// =========================================================================
// COMERCIAL (Commercial Agent)
// =========================================================================

export const ProposalSchema = z.object({
  proposal_id: z.string(),
  service_description: z.string(),
  service_type: z.enum([
    'consultoria',
    'acao_judicial',
    'elaboracao_contratos',
    'recurso',
    'defesa',
    'acordo_extrajudicial',
    'outro'
  ]),

  // Pricing
  base_value: z.number().positive(),
  discount_percentage: z.number().min(0).max(100).optional(),
  final_value: z.number().positive(),
  currency: z.string().default('BRL'),

  // Payment terms
  payment_method: z.enum([
    'pix',
    'boleto',
    'cartao_credito',
    'transferencia',
    'parcelado'
  ]),
  installments: z.number().int().positive().default(1),
  installment_value: z.number().positive().optional(),

  // Timeline
  estimated_start_date: z.string().optional(),
  estimated_completion_date: z.string().optional(),
  estimated_duration: z.string(),

  // Deliverables
  deliverables: z.array(z.string()),
  guarantees: z.array(z.string()).optional(),
  terms_and_conditions: z.string(),

  // Validity
  valid_until: z.string(),
  proposal_version: z.string().default('1.0'),

  metadata: z.record(z.unknown()).optional()
});

export const PrepareProposalPayloadSchema = z.object({
  task: z.enum(['prepare_proposal', 'create_proposal']),
  leadId: z.string(),
  legal_validation: z.string(), // Resultado do Jurídico
  case_data: z.unknown(),
  context: z.record(z.unknown()).optional()
});

// =========================================================================
// COMUNICADOR (Communicator Agent)
// =========================================================================

export const FormattedMessageSchema = z.object({
  channel: z.enum(['whatsapp', 'email', 'sms', 'chat']),
  message_type: z.enum([
    'proposal',
    'follow_up',
    'onboarding',
    'update',
    'notification',
    'reminder'
  ]),
  subject: z.string().optional(), // Para email
  body: z.string(),
  formatted_body: z.string(), // Com formatação específica do canal
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    type: z.string()
  })).optional(),
  metadata: z.object({
    contains_emoji: z.boolean().optional(),
    word_count: z.number().optional(),
    estimated_read_time_seconds: z.number().optional()
  }).optional()
});

export const SendProposalPayloadSchema = z.object({
  task: z.literal('send_proposal'),
  leadId: z.string(),
  proposal: z.union([z.string(), ProposalSchema]),
  lead_data: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional()
});

// =========================================================================
// ANALISTA (Analyst Agent)
// =========================================================================

export const PerformanceAnalysisSchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d', 'custom']),
  total_leads: z.number().int().nonnegative(),
  qualified_leads: z.number().int().nonnegative(),
  conversion_rate: z.number().min(0).max(100),

  by_legal_area: z.record(z.object({
    count: z.number().int().nonnegative(),
    conversion_rate: z.number().min(0).max(100),
    avg_value: z.number().nonnegative().optional()
  })).optional(),

  by_channel: z.record(z.object({
    count: z.number().int().nonnegative(),
    conversion_rate: z.number().min(0).max(100)
  })).optional(),

  avg_qualification_time_seconds: z.number().nonnegative().optional(),
  avg_proposal_time_hours: z.number().nonnegative().optional(),

  top_performing_agents: z.array(z.object({
    agent_name: z.string(),
    success_rate: z.number().min(0).max(100),
    avg_latency_ms: z.number().nonnegative()
  })).optional(),

  recommendations: z.array(z.string()),
  insights: z.array(z.string())
});

export const AnalyzePerformancePayloadSchema = z.object({
  task: z.literal('analyze_performance'),
  period: z.enum(['24h', '7d', '30d', '90d', 'custom']).optional(),
  filters: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional()
});

// =========================================================================
// CUSTOMER SUCCESS
// =========================================================================

export const OnboardingPlanSchema = z.object({
  client_id: z.string(),
  client_name: z.string(),
  service_type: z.string(),

  timeline: z.array(z.object({
    phase: z.string(),
    description: z.string(),
    duration_days: z.number().positive(),
    responsible: z.string(),
    deliverables: z.array(z.string())
  })),

  required_documents: z.array(z.object({
    document_name: z.string(),
    description: z.string(),
    due_date: z.string().optional(),
    priority: PrioritySchema
  })),

  next_steps: z.array(z.string()),
  contact_points: z.array(z.object({
    type: z.enum(['email', 'phone', 'whatsapp', 'meeting']),
    frequency: z.string(),
    responsible: z.string()
  })),

  success_metrics: z.array(z.string()).optional()
});

export const OnboardClientPayloadSchema = z.object({
  task: z.literal('onboard_client'),
  client_data: z.record(z.unknown()),
  service: z.string(),
  context: z.record(z.unknown()).optional()
});

// =========================================================================
// COORDENADOR (Coordinator Agent)
// =========================================================================

export const ExecutionPlanSchema = z.object({
  plan_id: z.string(),
  lead_id: z.string(),
  planned_agents: z.array(z.object({
    agent_name: z.string(),
    order: z.number().int().positive(),
    estimated_duration_seconds: z.number().positive().optional(),
    depends_on: z.array(z.string()).optional()
  })),
  total_estimated_duration_seconds: z.number().positive().optional(),
  complexity: z.enum(['baixa', 'média', 'alta']),
  priority: PrioritySchema,
  notes: z.string().optional()
});

// =========================================================================
// EXECUTION TRACKING (Para Mission Control)
// =========================================================================

export const AgentExecutionSchema = z.object({
  id: z.string().uuid(),
  execution_id: z.string(),
  lead_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  current_agent: z.string().optional(),
  current_stage: z.string().optional(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  total_duration_ms: z.number().int().nonnegative().optional(),
  agents_involved: z.array(z.string()),
  total_agents_used: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  estimated_cost_usd: z.number().nonnegative(),
  error_message: z.string().optional()
});

export const AgentLogSchema = z.object({
  id: z.string().uuid(),
  execution_id: z.string().uuid().optional(),
  agent_name: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  latency_ms: z.number().int().nonnegative().optional(),
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  model: z.string(),
  input_preview: z.string().optional(),
  result_preview: z.string().optional(),
  error_message: z.string().optional(),
  created_at: z.string().datetime()
});

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

export function validateQualificationResult(data: unknown) {
  return QualificationResultSchema.parse(data);
}

export function validateLegalValidation(data: unknown) {
  return LegalValidationSchema.parse(data);
}

export function validateProposal(data: unknown) {
  return ProposalSchema.parse(data);
}

export function validateFormattedMessage(data: unknown) {
  return FormattedMessageSchema.parse(data);
}

export function validatePerformanceAnalysis(data: unknown) {
  return PerformanceAnalysisSchema.parse(data);
}

export function validateOnboardingPlan(data: unknown) {
  return OnboardingPlanSchema.parse(data);
}

export function validateExecutionPlan(data: unknown) {
  return ExecutionPlanSchema.parse(data);
}

// Safe parse functions
export function safeParseQualificationResult(data: unknown) {
  return QualificationResultSchema.safeParse(data);
}

export function safeParseLegalValidation(data: unknown) {
  return LegalValidationSchema.safeParse(data);
}

export function safeParseProposal(data: unknown) {
  return ProposalSchema.safeParse(data);
}

// Type exports
export type ValidatedQualificationResult = z.infer<typeof QualificationResultSchema>;
export type ValidatedLegalValidation = z.infer<typeof LegalValidationSchema>;
export type ValidatedProposal = z.infer<typeof ProposalSchema>;
export type ValidatedFormattedMessage = z.infer<typeof FormattedMessageSchema>;
export type ValidatedPerformanceAnalysis = z.infer<typeof PerformanceAnalysisSchema>;
export type ValidatedOnboardingPlan = z.infer<typeof OnboardingPlanSchema>;
export type ValidatedExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type ValidatedAgentExecution = z.infer<typeof AgentExecutionSchema>;
export type ValidatedAgentLog = z.infer<typeof AgentLogSchema>;
