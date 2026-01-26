/**
 * 🛡️ EXEMPLO: ENTERPRISE AGENT COM VALIDAÇÃO ZOD INTEGRADA
 *
 * Este é um exemplo de como integrar validação Zod no EnterpriseAgent.
 * Use este código como referência para atualizar seus agentes existentes.
 *
 * @version 1.0.0
 */

import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { AgentMessage, MessageType, Priority } from '../types';
import {
  validateQualificationResult,
  validateLegalValidation,
  validateProposal,
  type ValidatedQualificationResult,
  type ValidatedLegalValidation,
  type ValidatedProposal
} from '../validation/agent-payloads';

// =========================================================================
// EXEMPLO 1: QUALIFICADOR COM VALIDAÇÃO
// =========================================================================

export class ValidatedQualifierAgent {
  protected name = 'Qualificador';
  protected agentId = 'qualificador';

  async analyzeLead(payload: unknown): Promise<ValidatedQualificationResult> {
    console.log('🔍 Qualificador analisando lead com validação...');

    // 1. VALIDAR INPUT antes de processar
    const inputSchema = z.object({
      leadId: z.string().uuid(),
      data: z.object({
        message: z.string().min(10, 'Mensagem muito curta'),
        name: z.string().optional(),
        email: z.string().email().optional()
      })
    });

    let validatedInput;
    try {
      validatedInput = inputSchema.parse(payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validação de input falhou: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }

    // 2. PROCESSAR com IA (via Edge Function)
    const { data: aiResponse, error } = await supabase.functions.invoke('ai-agent-processor', {
      body: {
        agentName: this.name,
        agentSpecialization: 'Qualificação de leads jurídicos',
        systemPrompt: 'Você é especialista em qualificação...',
        userPrompt: `Analise este lead: ${JSON.stringify(validatedInput.data)}`,
        leadId: validatedInput.leadId
      }
    });

    if (error) throw error;

    // 3. PARSEAR RESULTADO DA IA
    let aiResult;
    try {
      aiResult = JSON.parse(aiResponse.result);
    } catch {
      // Se não for JSON, tentar extrair informações
      aiResult = {
        legal_area: 'Outros',
        urgency: 'medium',
        potential_score: 50,
        confidence: 0.5,
        recommended_next_steps: ['Análise jurídica'],
        estimated_complexity: 'média'
      };
    }

    // 4. VALIDAR OUTPUT com Zod
    let validatedResult: ValidatedQualificationResult;
    try {
      validatedResult = validateQualificationResult(aiResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validação de output falhou: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }

    // 5. SALVAR LOG no banco
    await supabase.from('agent_ai_logs').insert({
      agent_name: this.name,
      lead_id: validatedInput.leadId,
      tenant_id: 'tenant_id_here', // Obter do contexto
      model: aiResponse.model,
      prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
      completion_tokens: aiResponse.usage?.completion_tokens || 0,
      total_tokens: aiResponse.usage?.total_tokens || 0,
      status: 'completed',
      result_preview: JSON.stringify(validatedResult).substring(0, 200),
      input_preview: JSON.stringify(validatedInput.data).substring(0, 200)
    });

    return validatedResult;
  }
}

// =========================================================================
// EXEMPLO 2: JURÍDICO COM VALIDAÇÃO
// =========================================================================

export class ValidatedLegalAgent {
  protected name = 'Juridico';
  protected agentId = 'juridico';

  async validateCase(payload: unknown): Promise<ValidatedLegalValidation> {
    console.log('⚖️ Jurídico validando caso com validação...');

    // 1. VALIDAR INPUT
    const inputSchema = z.object({
      leadId: z.string().uuid(),
      analysis: z.string().min(50, 'Análise muito curta'),
      original_data: z.record(z.unknown())
    });

    const validatedInput = inputSchema.parse(payload);

    // 2. PROCESSAR com IA
    const { data: aiResponse, error } = await supabase.functions.invoke('ai-agent-processor', {
      body: {
        agentName: this.name,
        agentSpecialization: 'Validação jurídica especializada',
        systemPrompt: 'Você é um advogado especialista...',
        userPrompt: `Valide este caso juridicamente: ${validatedInput.analysis}`,
        leadId: validatedInput.leadId
      }
    });

    if (error) throw error;

    // 3. PARSEAR e VALIDAR OUTPUT
    const aiResult = JSON.parse(aiResponse.result);
    const validatedResult: ValidatedLegalValidation = validateLegalValidation(aiResult);

    // 4. SALVAR LOG
    await supabase.from('agent_ai_logs').insert({
      agent_name: this.name,
      lead_id: validatedInput.leadId,
      tenant_id: 'tenant_id_here',
      model: aiResponse.model,
      prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
      completion_tokens: aiResponse.usage?.completion_tokens || 0,
      total_tokens: aiResponse.usage?.total_tokens || 0,
      status: 'completed',
      result_preview: `Viável: ${validatedResult.is_viable}, Sucesso: ${validatedResult.success_probability}%`,
      input_preview: validatedInput.analysis.substring(0, 200)
    });

    return validatedResult;
  }
}

// =========================================================================
// EXEMPLO 3: COMERCIAL COM VALIDAÇÃO
// =========================================================================

export class ValidatedCommercialAgent {
  protected name = 'Comercial';
  protected agentId = 'comercial';

  async createProposal(payload: unknown): Promise<ValidatedProposal> {
    console.log('💼 Comercial criando proposta com validação...');

    // 1. VALIDAR INPUT
    const inputSchema = z.object({
      leadId: z.string().uuid(),
      legal_validation: z.object({
        is_viable: z.boolean(),
        success_probability: z.number(),
        estimated_duration_months: z.number().optional()
      }),
      case_data: z.record(z.unknown())
    });

    const validatedInput = inputSchema.parse(payload);

    // Verificar se caso é viável antes de criar proposta
    if (!validatedInput.legal_validation.is_viable) {
      throw new Error('Caso não é juridicamente viável. Não é possível criar proposta.');
    }

    // 2. PROCESSAR com IA
    const { data: aiResponse, error } = await supabase.functions.invoke('ai-agent-processor', {
      body: {
        agentName: this.name,
        agentSpecialization: 'Propostas comerciais jurídicas',
        systemPrompt: 'Você é especialista em vendas jurídicas...',
        userPrompt: `Crie uma proposta para: ${JSON.stringify(validatedInput.case_data)}`,
        leadId: validatedInput.leadId
      }
    });

    if (error) throw error;

    // 3. PARSEAR e VALIDAR OUTPUT
    const aiResult = JSON.parse(aiResponse.result);

    // Adicionar campos obrigatórios se não vieram da IA
    const proposalData = {
      ...aiResult,
      proposal_id: `prop_${Date.now()}`,
      currency: aiResult.currency || 'BRL',
      installments: aiResult.installments || 1,
      proposal_version: '1.0',
      valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 dias
    };

    const validatedResult: ValidatedProposal = validateProposal(proposalData);

    // 4. VALIDAÇÕES DE NEGÓCIO ADICIONAIS
    if (validatedResult.base_value < 0) {
      throw new Error('Valor base da proposta não pode ser negativo');
    }

    if (validatedResult.final_value > validatedResult.base_value) {
      throw new Error('Valor final não pode ser maior que valor base (com desconto)');
    }

    if (validatedResult.installments > 12) {
      throw new Error('Máximo de 12 parcelas permitido');
    }

    // 5. SALVAR LOG
    await supabase.from('agent_ai_logs').insert({
      agent_name: this.name,
      lead_id: validatedInput.leadId,
      tenant_id: 'tenant_id_here',
      model: aiResponse.model,
      prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
      completion_tokens: aiResponse.usage?.completion_tokens || 0,
      total_tokens: aiResponse.usage?.total_tokens || 0,
      status: 'completed',
      result_preview: `Proposta ${validatedResult.proposal_id}: R$ ${validatedResult.final_value}`,
      input_preview: `Caso viável (${validatedInput.legal_validation.success_probability}%)`
    });

    return validatedResult;
  }
}

// =========================================================================
// EXEMPLO 4: HELPER GENÉRICO DE VALIDAÇÃO
// =========================================================================

export class ValidationHelper {
  /**
   * Valida e executa uma operação de agente com tratamento de erros completo
   */
  static async executeWithValidation<TInput, TOutput>(
    agentName: string,
    inputSchema: z.ZodSchema<TInput>,
    outputSchema: z.ZodSchema<TOutput>,
    input: unknown,
    processFn: (validatedInput: TInput) => Promise<unknown>
  ): Promise<TOutput> {
    // 1. Validar input
    let validatedInput: TInput;
    try {
      validatedInput = inputSchema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`❌ ${agentName} - Input validation failed:`, error.errors);
        throw new Error(`Input inválido: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
      throw error;
    }

    // 2. Processar
    let result: unknown;
    try {
      result = await processFn(validatedInput);
    } catch (error) {
      console.error(`❌ ${agentName} - Processing failed:`, error);
      throw error;
    }

    // 3. Validar output
    let validatedOutput: TOutput;
    try {
      validatedOutput = outputSchema.parse(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`❌ ${agentName} - Output validation failed:`, error.errors);
        throw new Error(`Output inválido: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
      throw error;
    }

    console.log(`✅ ${agentName} - Validação completa e bem-sucedida`);
    return validatedOutput;
  }
}

// =========================================================================
// EXEMPLO 5: USO DO HELPER
// =========================================================================

// Schema de input
const AnalyzeLeadInputSchema = z.object({
  leadId: z.string().uuid(),
  message: z.string().min(10)
});

// Schema de output
const QualificationOutputSchema = z.object({
  legal_area: z.string(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  potential_score: z.number().min(0).max(100)
});

// Usar helper
async function analyzeLeadWithHelper(input: unknown) {
  return ValidationHelper.executeWithValidation(
    'Qualificador',
    AnalyzeLeadInputSchema,
    QualificationOutputSchema,
    input,
    async (validatedInput) => {
      // Processar com IA
      const { data } = await supabase.functions.invoke('ai-agent-processor', {
        body: {
          agentName: 'Qualificador',
          agentSpecialization: 'Qualificação',
          systemPrompt: 'Você é qualificador...',
          userPrompt: validatedInput.message,
          leadId: validatedInput.leadId
        }
      });

      return JSON.parse(data.result);
    }
  );
}

// =========================================================================
// EXEMPLO 6: LOGGING AUTOMÁTICO
// =========================================================================

export async function logAgentActivity(params: {
  agentName: string;
  leadId?: string;
  executionId?: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
  error?: Error;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latencyMs?: number;
  model?: string;
}) {
  await supabase.from('agent_ai_logs').insert({
    agent_name: params.agentName,
    lead_id: params.leadId || null,
    execution_id: params.executionId || null,
    tenant_id: params.tenantId,
    status: params.status,
    model: params.model || 'gpt-4-turbo-preview',
    prompt_tokens: params.usage?.prompt_tokens || 0,
    completion_tokens: params.usage?.completion_tokens || 0,
    total_tokens: params.usage?.total_tokens || 0,
    latency_ms: params.latencyMs || null,
    input_preview: params.input ? JSON.stringify(params.input).substring(0, 500) : null,
    result_preview: params.output ? JSON.stringify(params.output).substring(0, 500) : null,
    error_message: params.error?.message || null
  });
}

// =========================================================================
// EXEMPLO DE USO COMPLETO
// =========================================================================

export async function exampleFullFlow() {
  const qualifierAgent = new ValidatedQualifierAgent();

  try {
    // Input de exemplo
    const input = {
      leadId: '123e4567-e89b-12d3-a456-426614174000',
      data: {
        message: 'Fui demitido sem justa causa e quero processar a empresa',
        name: 'João Silva',
        email: 'joao@example.com'
      }
    };

    // Processar com validação automática
    const result = await qualifierAgent.analyzeLead(input);

    console.log('✅ Resultado validado:', result);
    // result é do tipo ValidatedQualificationResult
    // TypeScript garante que todos os campos existem e têm o tipo correto

    // Usar resultado validado com segurança
    if (result.legal_area === 'Trabalhista') {
      console.log('Lead trabalhista com potencial:', result.potential_score);
    }

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    // Error handling robusto
  }
}
