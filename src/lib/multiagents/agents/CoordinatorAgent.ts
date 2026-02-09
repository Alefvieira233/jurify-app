import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, Priority, AGENT_CONFIG } from '../types';

/**
 * 🎯 COORDINATOR AGENT - Orquestrador do Fluxo de Agentes
 * 
 * Responsável por:
 * - Rotear leads para agentes especializados
 * - Monitorar progresso do fluxo
 * - Implementar fallback quando agentes falham
 * - Garantir que o fluxo sempre chegue ao fim
 */
interface CoordinatorPayload {
  message?: string;
  context?: unknown;
  leadId?: string;
  stage?: string;
  agentName?: string;
  [key: string]: unknown;
}

export class CoordinatorAgent extends BaseAgent {
  // Mapa de fallback: se um agente falhar, qual é o próximo?
  private static readonly FALLBACK_MAP: Record<string, string> = {
    [AGENT_CONFIG.NAMES.QUALIFIER]: AGENT_CONFIG.NAMES.LEGAL,      // Se Qualifier falhar → Legal
    [AGENT_CONFIG.NAMES.LEGAL]: AGENT_CONFIG.NAMES.COMMERCIAL,     // Se Legal falhar → Commercial
    [AGENT_CONFIG.NAMES.COMMERCIAL]: AGENT_CONFIG.NAMES.COMMUNICATOR, // Se Commercial falhar → Communicator
    [AGENT_CONFIG.NAMES.COMMUNICATOR]: 'ESCALATE_HUMAN',           // Se Communicator falhar → Escalar
  };

  // Contador de tentativas por lead
  private retryCount: Map<string, Map<string, number>> = new Map();
  private static readonly MAX_RETRIES_PER_AGENT = 2;

  constructor() {
    super(AGENT_CONFIG.NAMES.COORDINATOR, 'Orquestracao', AGENT_CONFIG.IDS.COORDINATOR);
  }

  protected getSystemPrompt(): string {
    return `# PAPEL
Você é o Agente Coordenador do sistema Jurify, responsável por orquestrar todos os outros agentes.

# OBJETIVO
Analisar cada solicitação e rotear para o agente especialista correto, monitorando o progresso do caso.

# AGENTES DISPONÍVEIS
| Agente | Especialidade | Quando Usar |
|--------|---------------|-------------|
| Qualificador | Análise inicial de leads | Lead novo, informações incompletas |
| Juridico | Análise legal e viabilidade | Dúvidas jurídicas, análise de caso |
| Comercial | Propostas e negociação | Pedido de orçamento, fechamento |
| Comunicador | Formatação e envio | Enviar mensagens ao cliente |
| Analista | Dados e insights | Relatórios, métricas |
| CustomerSuccess | Pós-venda | Cliente já contratou |

# FLUXO PADRÃO DE UM LEAD
1. **Novo Lead** → Qualificador (coleta informações, avalia potencial)
2. **Lead Qualificado** → Juridico (valida viabilidade do caso)
3. **Caso Viável** → Comercial (cria proposta)
4. **Proposta Pronta** → Comunicador (envia ao cliente)
5. **Cliente Contratou** → CustomerSuccess (onboarding)

# CRITÉRIOS DE ROTEAMENTO

## → Qualificador
- Lead acabou de chegar
- Faltam informações básicas (área, urgência, documentos)
- Cliente está "só pesquisando"

## → Juridico
- Cliente pergunta sobre viabilidade
- Dúvida sobre prazo prescricional
- Precisa de análise técnica do caso
- Palavras-chave: "posso processar", "tenho direito", "é crime"

## → Comercial
- Cliente pergunta sobre valores/honorários
- Lead já qualificado e caso viável
- Palavras-chave: "quanto custa", "orçamento", "proposta", "preço"

## → Comunicador
- Precisa enviar mensagem formatada
- Follow-up com cliente
- Confirmação de reunião

## → Analista
- Pedido de relatório ou métricas
- Análise de dados do pipeline

## → CustomerSuccess
- Cliente já assinou contrato
- Dúvidas sobre andamento do caso
- Onboarding

# PRIORIDADES
- **CRÍTICA**: Prazo prescricional próximo, audiência marcada
- **ALTA**: Lead quente, cliente decidido
- **MÉDIA**: Lead morno, ainda pesquisando
- **BAIXA**: Apenas curiosidade, sem urgência

# FORMATO DE SAÍDA (OBRIGATÓRIO - JSON)
{
  "next_agent": "Qualificador" | "Juridico" | "Comercial" | "Comunicador" | "Analista" | "CustomerSuccess",
  "task": "analyze_lead" | "validate_case" | "create_proposal" | "send_message" | "generate_report" | "onboard_client",
  "priority": "critica" | "alta" | "media" | "baixa",
  "reason": "explicação clara da decisão",
  "context_for_agent": "informações relevantes para o próximo agente"
}

# REGRAS IMPORTANTES
- SEMPRE rotear para algum agente (nunca deixar lead sem resposta)
- Se em dúvida, rotear para Qualificador
- Priorizar leads com urgência real
- Monitorar tempo de resposta (máx 5 min para primeira resposta)`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const payload = message.payload as CoordinatorPayload;
    switch (message.type) {
      case MessageType.TASK_REQUEST:
        await this.planExecution(payload);
        break;
      case MessageType.STATUS_UPDATE:
        await this.monitorProgress(payload);
        break;
      case MessageType.ERROR_REPORT:
        await this.handleAgentError(message);
        break;
    }
  }

  private async planExecution(payload: CoordinatorPayload): Promise<void> {
    const plan = await this.processWithAIRetry(
      `Analise este lead e decida qual o próximo passo.
      Lead: ${payload.message}
      
      DIRETRIZES DE ROTEAMENTO:
      - Se o usuário pede um contrato, revisão legal ou dúvida jurídica -> Roteie para "Juridico".
      - Se o usuário pede orçamento, preço ou proposta -> Roteie para "Comercial".
      - Se o pedido é vago ou precisa de mais dados -> Roteie para "Qualificador".

      Responda APENAS com um JSON no formato:
      {
        "next_agent": "Juridico" | "Comercial" | "Qualificador",
        "reason": "motivo",
        "task": "nome_da_tarefa"
      }`,
      payload.context as Record<string, unknown> | undefined
    );

    let nextAgent: string = AGENT_CONFIG.NAMES.QUALIFIER;
    let task: string = 'analyze_lead';
    let reason: string = 'Fallback para qualificação inicial';

    try {
      const parsed = this.safeParseJSON<{ next_agent?: string; task?: string; reason?: string }>(plan);
      if (parsed && parsed.next_agent && (Object.values(AGENT_CONFIG.NAMES) as string[]).includes(parsed.next_agent)) {
        nextAgent = parsed.next_agent;
        task = parsed.task || 'analyze_lead';
        reason = parsed.reason || 'Decisão da IA';
      }
    } catch (e) {
      // Fallback to default agent
    }

    this.updateContext(payload.leadId || '', { stage: 'planned', plan, nextAgent, task });

    // Registra no ExecutionTracker
    await this.recordStageResult('coordination', { nextAgent, task, reason }, true);

    await this.routeToAgentWithFallback(
      nextAgent,
      task,
      payload.leadId || '',
      payload
    );
  }

  /**
   * Roteia para um agente com suporte a fallback automático
   */
  private async routeToAgentWithFallback(
    targetAgent: string,
    task: string,
    leadId: string,
    payload: CoordinatorPayload
  ): Promise<void> {
    const retries = this.getRetryCount(leadId, targetAgent);
    
    if (retries >= CoordinatorAgent.MAX_RETRIES_PER_AGENT) {
      await this.applyFallback(targetAgent, leadId, payload);
      return;
    }

    this.incrementRetryCount(leadId, targetAgent);

    await this.sendMessage(
      targetAgent,
      MessageType.TASK_REQUEST,
      { task, leadId, data: payload },
      Priority.HIGH
    );
  }

  /**
   * Aplica fallback quando um agente falha repetidamente
   */
  private async applyFallback(failedAgent: string, leadId: string, payload: CoordinatorPayload): Promise<void> {
    const fallbackAgent = CoordinatorAgent.FALLBACK_MAP[failedAgent];

    if (!fallbackAgent || fallbackAgent === 'ESCALATE_HUMAN') {
      await this.escalateToHuman(leadId, payload, failedAgent);
      return;
    }

    // Determina a task apropriada para o agente de fallback
    const fallbackTask = this.getTaskForAgent(fallbackAgent);

    await this.routeToAgentWithFallback(
      fallbackAgent,
      fallbackTask,
      leadId,
      { ...payload, fallbackFrom: failedAgent }
    );
  }

  /**
   * Escala para atendimento humano quando todos os agentes falham
   */
  private async escalateToHuman(leadId: string, _payload: CoordinatorPayload, lastFailedAgent: string): Promise<void> {
    // Registra a escalação no ExecutionTracker
    await this.recordStageResult('human_escalation', {
      leadId,
      lastFailedAgent,
      reason: 'Todos os agentes falharam ou atingiram limite de tentativas',
      timestamp: new Date().toISOString()
    }, false, 'Escalação para humano necessária');

    // Marca a execução como falha com mensagem clara
    await this.markExecutionFailed(`Escalação humana necessária - último agente: ${lastFailedAgent}`);

    // Limpa contadores de retry para este lead
    this.retryCount.delete(leadId);
  }

  /**
   * Determina a task apropriada para cada agente
   */
  private getTaskForAgent(agentName: string): string {
    const taskMap: Record<string, string> = {
      [AGENT_CONFIG.NAMES.QUALIFIER]: 'analyze_lead',
      [AGENT_CONFIG.NAMES.LEGAL]: 'validate_case',
      [AGENT_CONFIG.NAMES.COMMERCIAL]: 'create_proposal',
      [AGENT_CONFIG.NAMES.COMMUNICATOR]: 'send_proposal',
      [AGENT_CONFIG.NAMES.CUSTOMER_SUCCESS]: 'onboard_client',
      [AGENT_CONFIG.NAMES.ANALYST]: 'generate_report',
    };
    return taskMap[agentName] || 'process';
  }

  /**
   * Trata erros reportados por outros agentes
   */
  private async handleAgentError(message: AgentMessage): Promise<void> {
    const { agentName, leadId } = message.payload as CoordinatorPayload;

    // Aplica fallback para o agente que falhou
    if (agentName && leadId) {
      await this.applyFallback(agentName, leadId, message.payload as CoordinatorPayload);
    }
  }

  private async monitorProgress(payload: CoordinatorPayload): Promise<void> {
    const stage = payload.stage || '';
    const leadId = payload.leadId || '';

    switch (stage) {
      case 'qualified':
        await this.routeToAgentWithFallback(
          AGENT_CONFIG.NAMES.LEGAL,
          'validate_case',
          leadId,
          payload
        );
        break;

      case 'validated':
        await this.routeToAgentWithFallback(
          AGENT_CONFIG.NAMES.COMMERCIAL,
          'create_proposal',
          leadId,
          payload
        );
        break;

      case 'proposal_created':
        await this.routeToAgentWithFallback(
          AGENT_CONFIG.NAMES.COMMUNICATOR,
          'send_proposal',
          leadId,
          payload
        );
        break;

      case 'proposal_sent':
        // Limpa contadores de retry
        this.retryCount.delete(leadId);
        break;

      default:
        break;
    }
  }

  // =========================================================================
  // UTILITÁRIOS DE RETRY
  // =========================================================================

  private getRetryCount(leadId: string, agentName: string): number {
    const leadRetries = this.retryCount.get(leadId);
    if (!leadRetries) return 0;
    return leadRetries.get(agentName) || 0;
  }

  private incrementRetryCount(leadId: string, agentName: string): void {
    if (!this.retryCount.has(leadId)) {
      this.retryCount.set(leadId, new Map());
    }
    const leadRetries = this.retryCount.get(leadId)!;
    const current = leadRetries.get(agentName) || 0;
    leadRetries.set(agentName, current + 1);
  }

  /**
   * Override do safeParseJSON para adicionar extração manual de campos específicos do Coordinator
   */
  protected override safeParseJSON<T = Record<string, unknown>>(text: string): T | null {
    // Primeiro tenta o parsing padrão do BaseAgent
    const result = super.safeParseJSON<T>(text);
    if (result) {
      return result;
    }

    // Fallback: Extrair campos manualmente para decisões de roteamento
    const nextAgentMatch = text.match(/next_agent["\s:]+["']?(\w+)["']?/i);
    const taskMatch = text.match(/task["\s:]+["']?(\w+)["']?/i);
    const reasonMatch = text.match(/reason["\s:]+["']?([^"'\n]+)["']?/i);

    if (nextAgentMatch) {
      return {
        next_agent: nextAgentMatch[1],
        task: taskMatch?.[1] || 'analyze_lead',
        reason: reasonMatch?.[1] || 'Extraído manualmente'
      } as T;
    }

    return null;
  }
}
