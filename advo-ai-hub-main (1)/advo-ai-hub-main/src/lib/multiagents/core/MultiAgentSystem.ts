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
  MessageType,
  LeadData,
  Priority,
  IMessageRouter
} from '../types';
import type { BaseAgent } from './BaseAgent';

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
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Sistema já inicializado, pulando...');
      return;
    }

    console.log('🚀 Inicializando Sistema Multiagentes...');

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
      console.log(`✅ ${this.agents.size} agentes inicializados com sucesso`);

    } catch (error) {
      console.error('❌ Erro ao inicializar agentes:', error);
      throw new Error('Failed to initialize MultiAgentSystem');
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
      console.error(`❌ Agente não encontrado: ${message.to}`);
      throw new Error(`Agent not found: ${message.to}`);
    }

    // Roteia mensagem
    await targetAgent.receiveMessage(message);
  }

  /**
   * 🎯 Ponto de entrada principal - Processa novo lead
   *
   * @param leadData - Dados do lead
   * @param message - Mensagem inicial do lead
   * @param channel - Canal de origem (whatsapp, email, etc)
   * @returns Resultado do processamento com executionId e dados dos agentes
   */
  public async processLead(
    leadData: LeadData,
    message: string,
    channel: 'whatsapp' | 'email' | 'chat' | 'phone' | 'playground' = 'whatsapp'
  ): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🎯 Sistema Multiagentes processando lead...');

    // Cria contexto compartilhado
    const tenantId = (leadData as any)?.tenantId || (leadData as any)?.tenant_id;
    const context: SharedContext = {
      leadId: leadData.id || `lead_${Date.now()}`,
      conversationHistory: [],
      leadData,
      currentStage: 'new',
      decisions: {},
      metadata: {
        channel,
        timestamp: new Date(),
        tenantId,
      }
    };

    // Compartilha contexto com todos os agentes
    this.agents.forEach((agent) => agent.setContext(context));

    // Busca agente coordenador
    const coordinator = this.agents.get('Coordenador');
    if (!coordinator) {
      throw new Error('Coordinator agent not found');
    }

    // Define contexto no coordenador
    coordinator.setContext(context);

    // Importa tipos dinamicamente
    const { MessageType, Priority } = await import('../types');

    // Gera execution ID único
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Envia tarefa inicial para coordenador
    await coordinator.receiveMessage({
      id: `init_${Date.now()}`,
      from: 'System',
      to: 'Coordenador',
      type: MessageType.TASK_REQUEST,
      payload: {
        message,
        context,
        leadData
      },
      timestamp: new Date(),
      priority: Priority.HIGH,
      requires_response: false
    });

    // ✅ RETORNAR resultado estruturado
    // TODO: Implementar coleta real de resultados dos agentes via context
    // Por enquanto, retorna estrutura básica para não quebrar o Playground
    return {
      executionId,
      qualificationResult: context.decisions?.qualification || null,
      legalValidation: context.decisions?.legalValidation || null,
      proposal: context.decisions?.proposal || null,
      formattedMessages: context.decisions?.formattedMessages || null,
      finalResult: context.decisions?.finalResult || null,
      totalTokens: 0, // TODO: Implementar tracking de tokens
      estimatedCost: 0 // TODO: Implementar cálculo de custo
    };
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
    console.log('🧹 Histórico de mensagens limpo');
  }

  /**
   * 🔄 Reseta sistema completamente (útil para testes)
   */
  public async reset(): Promise<void> {
    console.log('🔄 Resetando sistema multiagentes...');
    this.agents.clear();
    this.messageHistory = [];
    this.isInitialized = false;
    await this.initialize();
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
