/**
 * 🚀 JURIFY MULTIAGENT SYSTEM - CORE ORCHESTRATOR
 *
 * Sistema de orquestração de multiagentes autônomos.
 * Singleton pattern para garantir instância única.
 * Refatorado para ser apenas o orquestrador (separação de responsabilidades).
 *
 * @version 2.0.0
 * @architecture Enterprise Grade
 */

import type {
  AgentMessage,
  SharedContext,
  SystemStats,
  LeadData,
  IMessageRouter,
  ExecutionResult
} from '../types';
import type { BaseAgent } from './BaseAgent';
import { ExecutionTracker } from './ExecutionTracker';

// Importações dinâmicas dos agentes para evitar circular dependencies
import { CoordinatorAgent } from '../agents/CoordinatorAgent';
import { QualifierAgent } from '../agents/QualifierAgent';
import { LegalAgent } from '../agents/LegalAgent';
import { CommercialAgent } from '../agents/CommercialAgent';
import { AnalystAgent } from '../agents/AnalystAgent';
import { CommunicatorAgent } from '../agents/CommunicatorAgent';
import { CustomerSuccessAgent } from '../agents/CustomerSuccessAgent';

/**
 * 🎯 SISTEMA MULTIAGENTES PRINCIPAL
 *
 * Responsabilidades:
 * - Gerenciar ciclo de vida dos agentes
 * - Rotear mensagens entre agentes
 * - Manter histórico de comunicação
 * - Fornecer estatísticas do sistema
 * - Garantir singleton (uma única instância)
 */
export class MultiAgentSystem implements IMessageRouter {
  private static instance: MultiAgentSystem | null = null;
  private agents: Map<string, BaseAgent> = new Map();
  private messageHistory: AgentMessage[] = [];
  private isInitialized = false;

  // 🔒 Constructor privado para Singleton
  private constructor() {
    // Inicialização vazia - usar initialize() explicitamente
  }

  /**
   * 🏭 Obtém instância única do sistema (Singleton)
   */
  public static getInstance(): MultiAgentSystem {
    if (!MultiAgentSystem.instance) {
      MultiAgentSystem.instance = new MultiAgentSystem();
    }
    return MultiAgentSystem.instance;
  }

  /**
   * 🚀 Inicializa todos os agentes do sistema
   *
   * Deve ser chamado explicitamente antes de usar o sistema.
   * Idempotente - pode ser chamado múltiplas vezes sem problemas.
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      // Cria todos os agentes especializados
      this.agents.set('Coordenador', new CoordinatorAgent());
      this.agents.set('Qualificador', new QualifierAgent());
      this.agents.set('Juridico', new LegalAgent());
      this.agents.set('Comercial', new CommercialAgent());
      this.agents.set('Analista', new AnalystAgent());
      this.agents.set('Comunicador', new CommunicatorAgent());
      this.agents.set('CustomerSuccess', new CustomerSuccessAgent());

      this.isInitialized = true;

    } catch (error) {
      this.isInitialized = false;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize MultiAgentSystem: ${msg}`);
    }
  }

  /**
   * 📨 Roteia mensagem para o agente de destino
   *
   * @param message - Mensagem a ser roteada
   */
  public async routeMessage(message: AgentMessage): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MultiAgentSystem not initialized. Call initialize() first.');
    }

    // Adiciona ao histórico
    this.messageHistory.push(message);

    // Busca agente de destino
    const targetAgent = this.agents.get(message.to);

    if (!targetAgent) {
      throw new Error(`Agent not found: ${message.to}. Available: ${Array.from(this.agents.keys()).join(', ')}`);
    }

    // Roteia mensagem com tratamento de erro
    try {
      await targetAgent.receiveMessage(message);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Agent '${message.to}' failed to process message: ${msg}`);
    }
  }

  /**
   * 🎯 Ponto de entrada principal - Processa novo lead
   *
   * @param leadData - Dados do lead
   * @param message - Mensagem inicial do lead
   * @param channel - Canal de origem (whatsapp, email, etc)
   * @param options - Opções de execução (waitForCompletion, timeoutMs)
   * @returns Resultado do processamento com executionId e dados dos agentes
   */
  public async processLead(
    leadData: LeadData,
    message: string,
    channel: 'whatsapp' | 'email' | 'chat' | 'phone' | 'playground' = 'whatsapp',
    options?: { waitForCompletion?: boolean; timeoutMs?: number }
  ): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      this.initialize();
    }

    // Cria contexto compartilhado
    const rawTenant = (leadData as Record<string, unknown>)?.tenantId || (leadData as Record<string, unknown>)?.tenant_id;
    const tenantId = typeof rawTenant === 'string' ? rawTenant : '';
    const leadId = leadData.id || `lead_${Date.now()}`;

    // Cria ExecutionTracker para rastrear esta execução
    const tracker = await ExecutionTracker.create(
      leadId,
      tenantId,
      undefined, // userId
      { timeoutMs: options?.timeoutMs ?? 60000 }
    );

    const context: SharedContext = {
      leadId,
      conversationHistory: [],
      leadData,
      currentStage: 'new',
      decisions: {},
      metadata: {
        channel,
        timestamp: new Date(),
        tenantId,
        executionId: tracker.executionId, // Passa executionId para os agentes
      }
    };

    // Compartilha contexto com todos os agentes
    this.agents.forEach((agent) => agent.setContext(context));

    // Busca agente coordenador
    const coordinator = this.agents.get('Coordenador');
    if (!coordinator) {
      await tracker.markFailed('Coordinator agent not found');
      throw new Error('Coordinator agent not found');
    }

    // Define contexto no coordenador
    coordinator.setContext(context);

    // Importa tipos dinamicamente
    const { MessageType, Priority } = await import('../types');

    // Marca execução como em processamento
    await tracker.markProcessing();

    // Envia tarefa inicial para coordenador
    await coordinator.receiveMessage({
      id: `init_${Date.now()}`,
      from: 'System',
      to: 'Coordenador',
      type: MessageType.TASK_REQUEST,
      payload: {
        message,
        context,
        leadData,
        leadId
      },
      timestamp: new Date(),
      priority: Priority.HIGH,
      requires_response: false
    });

    // Se waitForCompletion = true (ou não especificado), aguarda o fluxo completar
    const shouldWait = options?.waitForCompletion !== false;
    
    if (shouldWait) {
      try {
        const result = await tracker.waitForCompletion(options?.timeoutMs);
        return result;
      } catch (error) {
        // Retorna resultado parcial mesmo em caso de erro/timeout
        const msg = error instanceof Error ? error.message : String(error);
        const partialResult = tracker.getResult();
        partialResult.error = partialResult.error || msg;
        return partialResult;
      }
    }

    // Se waitForCompletion = false, retorna imediatamente com resultado parcial
    return tracker.getResult();
  }

  /**
   * 📊 Obtém estatísticas do sistema
   */
  public getSystemStats(): SystemStats {
    return {
      total_agents: this.agents.size,
      messages_processed: this.messageHistory.length,
      active_agents: Array.from(this.agents.keys()),
      last_activity: this.messageHistory[this.messageHistory.length - 1]?.timestamp
    };
  }

  /**
   * 📜 Obtém histórico de mensagens (últimas N mensagens)
   *
   * @param limit - Número de mensagens a retornar (default: 50)
   */
  public getMessageHistory(limit: number = 50): AgentMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * 🧹 Limpa histórico de mensagens (útil para testes)
   */
  public clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * 🔄 Reseta sistema completamente (útil para testes)
   */
  public reset(): void {
    this.agents.clear();
    this.messageHistory = [];
    this.isInitialized = false;
    this.initialize();
  }

  /**
   * 🤖 Obtém agente específico por nome
   *
   * @param name - Nome do agente
   */
  public getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * 📋 Lista todos os agentes disponíveis
   */
  public listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * ✅ Verifica se sistema está inicializado
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// 🚀 Exporta instância singleton para uso global
export const multiAgentSystem = MultiAgentSystem.getInstance();
