/**
 * ðŸš€ JURIFY MULTIAGENT SYSTEM - BASE AGENT
 *
 * Classe base abstrata para todos os agentes.
 * Refatorada para usar Supabase Edge Function em vez de chamada direta Ã  OpenAI.
 *
 * @version 2.0.0
 * @security Enterprise Grade - API keys protegidas
 */

import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_OPENAI_MODEL } from '@/lib/ai/model';
import {
  Priority,
  MessageType
} from '../types';
import type {
  AgentMessage,
  MessagePriority,
  SharedContext,
  AgentAIRequest,
  AgentAIResponse,
  IAgent
} from '../types';

export abstract class BaseAgent implements IAgent {
  protected readonly name: string;
  protected readonly specialization: string;
  protected readonly agentId: string;
  protected messageQueue: AgentMessage[] = [];
  protected context: SharedContext | null = null;
  protected isProcessing = false;

  // ðŸŽ¯ ConfiguraÃ§Ãµes de IA
  protected model: string = DEFAULT_OPENAI_MODEL;
  protected temperature: number = 0.7;
  protected maxTokens: number = 1500;
  private static readonly MAX_CONTEXT_CHUNKS = 5;
  private static readonly MAX_CONTEXT_CHARS = 2000;

  constructor(name: string, specialization: string, agentId?: string) {
    this.name = name;
    this.specialization = specialization;
    this.agentId = agentId || specialization;
  }

  // ðŸ·ï¸ Getters pÃºblicos
  public getName(): string {
    return this.name;
  }

  public getSpecialization(): string {
    return this.specialization;
  }

  public getAgentId(): string {
    return this.agentId;
  }

  // ðŸ“¨ Recebe mensagem de outro agente
  public async receiveMessage(message: AgentMessage): Promise<void> {
    console.log(`ðŸ¤– ${this.name} recebeu mensagem de ${message.from}: ${message.type}`);

    this.messageQueue.push(message);

    if (!this.isProcessing) {
      await this.processMessages();
    }
  }

  // ðŸ“¤ Envia mensagem para outro agente
  protected async sendMessage(
    to: string,
    type: MessageType,
    payload: unknown,
    priority: MessagePriority = Priority.MEDIUM
  ): Promise<void> {
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      from: this.name,
      to,
      type,
      payload,
      timestamp: new Date(),
      priority,
      requires_response: type.toString().includes('request')
    };

    // Importa dinamicamente para evitar circular dependency
    const { MultiAgentSystem } = await import('./MultiAgentSystem');
    await MultiAgentSystem.getInstance().routeMessage(message);
  }

  // ðŸ”„ Processa fila de mensagens
  private async processMessages(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await this.handleMessage(message);
        } catch (error) {
          console.error(`âŒ Erro ao processar mensagem em ${this.name}:`, error);

          if (message.requires_response) {
            const { MessageType } = await import('../types');
            await this.sendMessage(
              message.from,
              MessageType.ERROR_REPORT,
              {
                error: error instanceof Error ? error.message : 'Unknown error',
                original_message_id: message.id
              },
              Priority.HIGH
            );
          }
        }
      }
    }

    this.isProcessing = false;
  }

  // ðŸŽ¯ MÃ©todo abstrato para cada agente implementar
  protected abstract handleMessage(message: AgentMessage): Promise<void>;

  // ðŸ§  Usa IA para processar informaÃ§Ã£o via Edge Function (SEGURO)
  protected async processWithAI(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<string> {
    try {
      console.log(`🤖 ${this.name} chamando Edge Function de IA...`);

      let augmentedPrompt = prompt;
      const tenantId = this.context?.metadata?.tenantId as string | undefined;

      if (tenantId) {
        try {
          const { data: searchData, error: searchError } = await supabase.functions.invoke<{
            results: Array<{ content: string; similarity: number; metadata?: Record<string, unknown> }>;
          }>(
            'vector-search',
            {
              body: {
                query: prompt,
                tenant_id: tenantId,
                top_k: BaseAgent.MAX_CONTEXT_CHUNKS,
              },
            }
          );

          if (!searchError && searchData?.results?.length) {
            const contextText = BaseAgent.buildContext(searchData.results);
            if (contextText) {
              augmentedPrompt = `${prompt}\n\nCONTEXT:\n${contextText}`;
            }
          }
        } catch {
          console.warn(`[rag] Falha ao buscar contexto para ${this.name}.`);
        }
      }

      // Prepara payload para Edge Function
      const aiRequest: AgentAIRequest = {
        agentName: this.name,
        agentSpecialization: this.specialization,
        systemPrompt: this.getSystemPrompt(),
        userPrompt: augmentedPrompt,
        context: context || {},
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        leadId: this.context?.leadId,
        tenantId: this.context?.metadata?.tenantId as string | undefined
      };

      // ðŸ” Chama Edge Function (API key fica no servidor)
      const { data, error } = await supabase.functions.invoke<AgentAIResponse>(
        'ai-agent-processor',
        {
          body: aiRequest
        }
      );

      if (error) {
        console.error(`âŒ Erro na Edge Function para ${this.name}:`, error);
        throw new Error(`AI processing failed: ${error.message}`);
      }

      if (!data || !data.result) {
        throw new Error('Invalid response from AI processor');
      }

      console.log(`âœ… ${this.name} recebeu resposta da IA (${data.usage?.total_tokens || 0} tokens)`);

      if (this.context?.leadId) {
        const { error: logError } = await supabase
          .from('lead_interactions')
          .insert({
            lead_id: this.context.leadId,
            message: prompt,
            response: data.result,
            tenant_id: this.context.metadata?.tenantId || null,
            channel: this.context.metadata?.channel || 'chat',
            tipo: 'message',
            metadata: {
              agent_id: this.agentId,
              agent_name: this.name,
            },
          });

        if (logError) {
          console.warn('Failed to log lead interaction:', logError);
        }
      }

      return data.result;

    } catch (error) {
      console.error(`âŒ Erro no processamento de IA para ${this.name}:`, error);
      throw error;
    }
  }

  // ðŸ§  ConstrÃ³i contexto com base nos chunks recuperados
  private static buildContext(
    results: Array<{ content: string; similarity: number; metadata?: Record<string, unknown> }>
  ): string {
    let totalChars = 0;
    const lines: string[] = [];

    for (const item of results) {
      const chunk = item.content?.trim();
      if (!chunk) continue;
      if (totalChars + chunk.length > BaseAgent.MAX_CONTEXT_CHARS) break;
      lines.push(`- ${chunk}`);
      totalChars += chunk.length;
      if (lines.length >= BaseAgent.MAX_CONTEXT_CHUNKS) break;
    }

    return lines.join("\n");
  }

  // ðŸ“‹ Prompt especÃ­fico de cada agente (abstrato)
  protected abstract getSystemPrompt(): string;

  // ðŸ” Atualiza contexto compartilhado
  protected updateSharedContext(updates: Partial<SharedContext>): void {
    if (this.context) {
      this.context = { ...this.context, ...updates };
    }
  }

  // ðŸ” Alias para compatibilidade - atualiza contexto por leadId
  protected updateContext(leadId: string, updates: Record<string, any>): void {
    if (!this.context) {
      this.context = {
        leadId,

        leadData: {},
        currentStage: 'new',
        decisions: {},
        conversationHistory: [],
        metadata: {
          channel: 'chat',
          timestamp: new Date(),
          ...updates
        }
      };
    } else {
      this.context.leadId = leadId;
      this.context.metadata = { ...this.context.metadata, ...updates };
    }
  }

  // ðŸŽ¯ Define contexto inicial
  public setContext(context: SharedContext): void {
    this.context = context;
  }

  // ðŸ“Š ObtÃ©m contexto atual
  public getContext(): SharedContext | null {
    return this.context;
  }

  // âš™ï¸ Permite configurar parÃ¢metros de IA
  protected configureAI(config: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): void {
    if (config.model) this.model = config.model;
    if (config.temperature !== undefined) this.temperature = config.temperature;
    if (config.maxTokens) this.maxTokens = config.maxTokens;
  }
}

