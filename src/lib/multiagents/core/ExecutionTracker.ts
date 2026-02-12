/**
 * 🎯 EXECUTION TRACKER - Gerenciador de Estado de Execução
 *
 * Rastreia o estado de uma execução de fluxo de agentes.
 * Permite aguardar a conclusão do fluxo e coletar resultados.
 *
 * @version 1.0.0
 */

import { ExecutionStore } from './ExecutionStore';
import type {
  ExecutionStatus,
  ExecutionResult,
  StageResult,
  ExecutionTrackerConfig,
} from '../types';

type ResolveFunction = (result: ExecutionResult) => void;
type RejectFunction = (error: Error) => void;

export class ExecutionTracker {
  private static instances: Map<string, ExecutionTracker> = new Map();

  public readonly executionId: string;
  public readonly leadId: string;
  public readonly tenantId: string;
  private readonly config: ExecutionTrackerConfig;

  private status: ExecutionStatus = 'pending';
  private stages: Map<string, StageResult> = new Map();
  private totalTokens: number = 0;
  private startedAt: Date;
  private completedAt?: Date;
  private error?: string;

  private resolveCompletion?: ResolveFunction;
  private rejectCompletion?: RejectFunction;
  private completionPromise: Promise<ExecutionResult>;
  private timeoutId?: ReturnType<typeof setTimeout>;

  private constructor(
    executionId: string,
    leadId: string,
    tenantId: string,
    config: ExecutionTrackerConfig = {}
  ) {
    this.executionId = executionId;
    this.leadId = leadId;
    this.tenantId = tenantId;
    this.startedAt = new Date();
    this.config = {
      timeoutMs: config.timeoutMs ?? 60000,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 2000,
    };

    this.completionPromise = new Promise((resolve, reject) => {
      this.resolveCompletion = resolve;
      this.rejectCompletion = reject;
    });

    this.startTimeout();
  }

  /**
   * Cria ou obtém um tracker para uma execução
   */
  static async create(
    leadId: string,
    tenantId: string,
    userId?: string,
    config?: ExecutionTrackerConfig
  ): Promise<ExecutionTracker> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Persiste no banco
    await ExecutionStore.createExecution(executionId, leadId, tenantId, userId);

    const tracker = new ExecutionTracker(executionId, leadId, tenantId, config);
    ExecutionTracker.instances.set(executionId, tracker);

    return tracker;
  }

  /**
   * Obtém um tracker existente pelo executionId
   */
  static get(executionId: string): ExecutionTracker | undefined {
    return ExecutionTracker.instances.get(executionId);
  }

  /**
   * Remove um tracker da memória
   */
  static remove(executionId: string): void {
    ExecutionTracker.instances.delete(executionId);
  }

  /**
   * Inicia o timeout da execução
   */
  private startTimeout(): void {
    if (this.config.timeoutMs && this.config.timeoutMs > 0) {
      this.timeoutId = setTimeout(() => {
        if (this.status === 'pending' || this.status === 'processing') {
          void this.markTimeout();
        }
      }, this.config.timeoutMs);
    }
  }

  /**
   * Cancela o timeout
   */
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  /**
   * Marca execução como em processamento
   */
  async markProcessing(): Promise<void> {
    this.status = 'processing';
    await ExecutionStore.updateExecutionStatus(this.executionId, 'processing');
  }

  /**
   * Registra o resultado de um estágio
   */
  async recordStageResult(
    stageName: string,
    agentName: string,
    result: unknown,
    tokens: number = 0,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    const now = new Date();
    const existingStage = this.stages.get(stageName);
    const startedAt = existingStage?.startedAt || now;

    const stageResult: StageResult = {
      stageName,
      agentName,
      result,
      tokens,
      startedAt,
      completedAt: now,
      durationMs: now.getTime() - startedAt.getTime(),
      success,
      error,
    };

    this.stages.set(stageName, stageResult);
    this.totalTokens += tokens;

    // Persiste no banco
    await ExecutionStore.recordStageResult(this.executionId, stageResult);

  }

  /**
   * Marca execução como completa
   */
  async markCompleted(): Promise<void> {
    this.clearTimeout();
    this.status = 'completed';
    this.completedAt = new Date();

    const result = this.buildResult();

    // Persiste no banco
    await ExecutionStore.completeExecution(
      this.executionId,
      {
        qualificationResult: result.qualificationResult,
        legalValidation: result.legalValidation,
        proposal: result.proposal,
        formattedMessages: result.formattedMessages,
        stages: result.stages,
      },
      this.totalTokens
    );

    // Resolve a promise de conclusão
    if (this.resolveCompletion) {
      this.resolveCompletion(result);
    }

    // Remove da memória após um tempo
    setTimeout(() => ExecutionTracker.remove(this.executionId), 60000);
  }

  /**
   * Marca execução como falha
   */
  async markFailed(errorMessage: string): Promise<void> {
    this.clearTimeout();
    this.status = 'failed';
    this.completedAt = new Date();
    this.error = errorMessage;

    // Persiste no banco
    await ExecutionStore.failExecution(this.executionId, errorMessage);

    // Rejeita a promise de conclusão
    if (this.rejectCompletion) {
      this.rejectCompletion(new Error(errorMessage));
    }

    // Remove da memória
    setTimeout(() => ExecutionTracker.remove(this.executionId), 60000);
  }

  /**
   * Marca execução como timeout
   */
  private async markTimeout(): Promise<void> {
    this.status = 'timeout';
    this.completedAt = new Date();
    this.error = 'Execution timeout';

    await ExecutionStore.failExecution(this.executionId, 'Execution timeout');

    if (this.rejectCompletion) {
      this.rejectCompletion(new Error('Execution timeout'));
    }

    setTimeout(() => ExecutionTracker.remove(this.executionId), 60000);
  }

  /**
   * Aguarda a conclusão da execução
   */
  async waitForCompletion(timeoutMs?: number): Promise<ExecutionResult> {
    const timeout = timeoutMs ?? this.config.timeoutMs ?? 60000;

    return Promise.race([
      this.completionPromise,
      new Promise<ExecutionResult>((_, reject) => {
        setTimeout(() => {
          if (this.status !== 'completed' && this.status !== 'failed') {
            reject(new Error(`Execution timeout after ${timeout}ms`));
          }
        }, timeout);
      }),
    ]);
  }

  /**
   * Constrói o resultado final da execução
   */
  buildResult(): ExecutionResult {
    const stages = Array.from(this.stages.values());

    // Extrai resultados específicos de cada estágio
    const qualificationStage = this.stages.get('qualification');
    const legalStage = this.stages.get('legal_validation');
    const proposalStage = this.stages.get('proposal');
    const messageStage = this.stages.get('message_sent');

    return {
      executionId: this.executionId,
      leadId: this.leadId,
      tenantId: this.tenantId,
      status: this.status,
      stages,
      qualificationResult: qualificationStage?.result ?? null,
      legalValidation: legalStage?.result ?? null,
      proposal: proposalStage?.result ?? null,
      formattedMessages: (messageStage?.result as string) ?? null,
      finalResult: stages.length > 0 ? (stages[stages.length - 1]?.result ?? null) : null,
      totalTokens: this.totalTokens,
      estimatedCost: this.calculateCost(),
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      totalDurationMs: this.completedAt
        ? this.completedAt.getTime() - this.startedAt.getTime()
        : undefined,
      error: this.error,
    };
  }

  /**
   * Calcula o custo estimado baseado nos tokens
   */
  private calculateCost(): number {
    const COST_PER_1K_TOKENS = 0.01;
    return (this.totalTokens / 1000) * COST_PER_1K_TOKENS;
  }

  /**
   * Obtém o resultado atual (mesmo que incompleto)
   */
  getResult(): ExecutionResult {
    return this.buildResult();
  }

  /**
   * Obtém o status atual
   */
  getStatus(): ExecutionStatus {
    return this.status;
  }

  /**
   * Obtém total de tokens usados
   */
  getTotalTokens(): number {
    return this.totalTokens;
  }

  /**
   * Verifica se a execução está completa
   */
  isComplete(): boolean {
    return this.status === 'completed' || this.status === 'failed' || this.status === 'timeout';
  }
}
