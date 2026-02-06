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
import { ExecutionTracker } from './ExecutionTracker';
import { agentMemory } from './AgentMemory';
import { createLogger } from '@/lib/logger';
import {
  Priority,
  MessageType,
  DEFAULT_EXECUTION_CONFIG
} from '../types';
import type {
  AgentMessage,
  MessagePriority,
  SharedContext,
  AgentAIRequest,
  AgentAIResponse,
  IAgent
} from '../types';

const log = createLogger('BaseAgent');

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

  // ðŸŽ¯ Tracking de execução
  protected lastTokensUsed: number = 0;

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
    context?: Record<string, unknown>,
    options?: { stream?: boolean; onToken?: (token: string) => void }
  ): Promise<string> {
    try {
      log.debug(`${this.name} calling AI Edge Function`);

      let augmentedPrompt = prompt;
      const tenantId = this.context?.metadata?.tenantId as string | undefined;
      const leadId = this.context?.leadId;

      if (tenantId) {
        // 🧠 MCP: Busca memórias de longo prazo relevantes
        try {
          const memoryContext = await agentMemory.buildMemoryContext(
            prompt,
            tenantId,
            leadId,
            this.name
          );
          if (memoryContext.summary) {
            augmentedPrompt = `${prompt}\n\n${memoryContext.summary}`;
          }
        } catch {
          log.warn(`MCP memory recall failed for ${this.name}`);
        }

        // 📚 RAG: Busca documentos relevantes no banco vetorial
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
              augmentedPrompt = `${augmentedPrompt}\n\nDOCUMENT CONTEXT:\n${contextText}`;
            }
          }
        } catch {
          log.warn(`RAG context fetch failed for ${this.name}`);
        }
      }

      if (options?.stream) {
        try {
          return await this.streamChatCompletion(augmentedPrompt, options.onToken);
        } catch (streamError) {
          console.warn(`[stream] Falha no streaming para ${this.name}, usando fallback non-stream.`);
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

      const tokensUsed = data.usage?.total_tokens || 0;
      this.lastTokensUsed = tokensUsed;
      log.info(`${this.name} AI response received (${tokensUsed} tokens)`);

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
          log.warn('Failed to log lead interaction', { error: logError.message });
        }

        // 🧠 MCP: Salva resultado como memória de longo prazo
        if (tenantId) {
          const summary = data.result.length > 500 ? data.result.substring(0, 500) + '...' : data.result;
          agentMemory.store({
            tenant_id: tenantId,
            lead_id: this.context.leadId,
            agent_name: this.name,
            memory_type: 'conversation',
            content: `[${this.name}] Prompt: ${prompt.substring(0, 200)}... | Response: ${summary}`,
            importance: 5,
            metadata: {
              tokens_used: tokensUsed,
              channel: this.context.metadata?.channel,
              execution_id: this.context.metadata?.executionId,
            },
          }).catch(() => { /* non-blocking */ });
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

  private async streamChatCompletion(
    prompt: string,
    onToken?: (token: string) => void
  ): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("Missing access token for streaming");
    }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!baseUrl) {
      throw new Error("Missing VITE_SUPABASE_URL for streaming");
    }

    const response = await fetch(`${baseUrl}/functions/v1/chat-completion`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: this.getSystemPrompt() },
          { role: "user", content: prompt },
        ],
        model: this.model,
        temperature: this.temperature,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Streaming request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let boundaryIndex = buffer.indexOf("\n\n");

      while (boundaryIndex !== -1) {
        const chunk = buffer.slice(0, boundaryIndex).trim();
        buffer = buffer.slice(boundaryIndex + 2);
        boundaryIndex = buffer.indexOf("\n\n");

        if (!chunk.startsWith("data:")) continue;
        const payload = chunk.replace(/^data:\s*/, "");
        if (payload === "[DONE]") {
          return fullText;
        }

        try {
          const parsed = JSON.parse(payload) as { delta?: string };
          if (parsed.delta) {
            fullText += parsed.delta;
            if (onToken) onToken(parsed.delta);
          }
        } catch {
          // Ignore malformed chunks
        }
      }
    }

    return fullText;
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

  // =========================================================================
  // 🎯 EXECUTION TRACKER INTEGRATION
  // =========================================================================

  /**
   * Obtém o ExecutionTracker da execução atual (se existir)
   */
  protected getExecutionTracker(): ExecutionTracker | undefined {
    const executionId = this.context?.metadata?.executionId as string | undefined;
    if (executionId) {
      return ExecutionTracker.get(executionId);
    }
    return undefined;
  }

  /**
   * Registra resultado de um estágio no ExecutionTracker
   */
  protected async recordStageResult(
    stageName: string,
    result: unknown,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    const tracker = this.getExecutionTracker();
    if (tracker) {
      await tracker.recordStageResult(
        stageName,
        this.name,
        result,
        this.lastTokensUsed,
        success,
        error
      );
    }
  }

  /**
   * Marca a execução como completa (chamado pelo último agente do fluxo)
   */
  protected async markExecutionCompleted(): Promise<void> {
    const tracker = this.getExecutionTracker();
    if (tracker) {
      await tracker.markCompleted();
    }
  }

  /**
   * Marca a execução como falha
   */
  protected async markExecutionFailed(errorMessage: string): Promise<void> {
    const tracker = this.getExecutionTracker();
    if (tracker) {
      await tracker.markFailed(errorMessage);
    }
  }

  /**
   * Obtém o total de tokens usados na última chamada de IA
   */
  protected getLastTokensUsed(): number {
    return this.lastTokensUsed;
  }

  // =========================================================================
  // 🔄 RETRY COM BACKOFF EXPONENCIAL
  // =========================================================================

  /**
   * Executa processamento de IA com retry automático
   */
  protected async processWithAIRetry(
    prompt: string,
    context?: Record<string, unknown>,
    options?: { stream?: boolean; onToken?: (token: string) => void; maxRetries?: number }
  ): Promise<string> {
    const maxRetries = options?.maxRetries ?? DEFAULT_EXECUTION_CONFIG.maxRetries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.processWithAI(prompt, context, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ [${this.name}] Tentativa ${attempt}/${maxRetries} falhou:`, lastError.message);

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ [${this.name}] Aguardando ${delayMs}ms antes de retry...`);
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Utilitário para aguardar um tempo
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =========================================================================
  // 🔧 UTILITÁRIOS DE PARSING JSON ROBUSTO
  // =========================================================================

  /**
   * Parse JSON de forma segura com múltiplas estratégias de fallback
   * Usado por todos os agentes para extrair dados estruturados das respostas da IA
   */
  protected safeParseJSON<T = Record<string, unknown>>(text: string): T | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    // Estratégia 1: Extrair JSON com regex (mais comum)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        // Tenta limpar o JSON antes de parsear
        try {
          const cleaned = this.cleanJSONString(jsonMatch[0]);
          return JSON.parse(cleaned) as T;
        } catch {
          // Continua para próxima estratégia
        }
      }
    }

    // Estratégia 2: Tentar parsear o texto inteiro
    try {
      return JSON.parse(text) as T;
    } catch {
      // Continua para próxima estratégia
    }

    // Estratégia 3: Extrair JSON de blocos de código markdown
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as T;
      } catch {
        // Continua para próxima estratégia
      }
    }

    console.warn(`⚠️ [${this.name}] Falha ao parsear JSON da resposta`);
    return null;
  }

  /**
   * Limpa string JSON removendo caracteres problemáticos
   */
  private cleanJSONString(jsonStr: string): string {
    return jsonStr
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
      .replace(/,\s*}/g, '}')          // Remove vírgulas trailing antes de }
      .replace(/,\s*]/g, ']')          // Remove vírgulas trailing antes de ]
      .replace(/'/g, '"')              // Substitui aspas simples por duplas
      .replace(/(\w+):/g, '"$1":')     // Adiciona aspas em chaves sem aspas
      .trim();
  }

  /**
   * Extrai um valor específico de uma resposta de texto
   * Útil quando o JSON falha completamente
   */
  protected extractValueFromText(text: string, key: string): string | null {
    // Tenta extrair valor de padrões comuns
    const patterns = [
      new RegExp(`${key}["\s:]+["']?([^"'\n,}]+)["']?`, 'i'),
      new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, 'i'),
      new RegExp(`${key}\\s*=\\s*["']?([^"'\n,}]+)["']?`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
