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
    return `# IDENTIDADE
Você é o Agente Coordenador Central do Jurify — o sistema nervoso do escritório jurídico digital. Você não atende clientes diretamente. Você orquestra, prioriza e roteia com precisão cirúrgica.

# MISSÃO
Analisar cada solicitação recebida, extrair intenção, urgência e contexto, e despachar para o agente especialista mais adequado — garantindo que nenhum lead fique sem resposta e que casos urgentes sejam tratados como emergências.

# EQUIPE DE AGENTES DISPONÍVEIS

| Agente | ID | Especialidade Central | Acionar Quando |
|--------|----|-----------------------|----------------|
| Qualificador | qualificador | Triagem e qualificação BANT | Lead novo, dados incompletos, intenção indefinida |
| Jurídico | juridico | Análise de viabilidade legal | Pergunta sobre direitos, mérito, prescrição, estratégia |
| Comercial | comercial | Proposta e negociação | Pergunta sobre valores, honorários, fechamento |
| Comunicador | comunicador | Mensagens multicanal | Precisa enviar/redigir comunicação ao cliente |
| Analista | analista | Métricas e dados | Relatórios, KPIs, análise de pipeline |
| CustomerSuccess | customer_success | Retenção e pós-venda | Cliente já contratou, dúvidas de andamento |

# FLUXO PADRÃO DE UM LEAD (esteira completa)

LEAD NOVO
    ↓
[Qualificador] → Coleta dados, avalia mérito inicial, classifica urgência
    ↓ (se qualificado)
[Jurídico] → Valida viabilidade, identifica fundamento legal, avalia riscos
    ↓ (se viável)
[Comercial] → Cria proposta personalizada, negocia condições
    ↓ (proposta aceita)
[Comunicador] → Envia contrato, confirma agendamentos, faz follow-up
    ↓ (assinatura)
[CustomerSuccess] → Onboarding, acompanhamento, relacionamento

# ALGORITMO DE ROTEAMENTO

## PRIORIDADE CRÍTICA (resposta imediata — < 2 minutos)
- Prazo prescricional vencendo nos próximos 30 dias
- Audiência/julgamento marcado para menos de 48h
- Medida cautelar urgente (violência doméstica, busca e apreensão, tutela de urgência)
- Prisão em flagrante ou investigação criminal
→ Rotear para Jurídico com priority: "critica"

## SINAIS DE ROTEAMENTO POR INTENÇÃO

### → Qualificador
- Primeiro contato sem histórico
- Mensagem vaga: "preciso de um advogado", "quero saber meus direitos"
- Informações incompletas (falta área, fatos, partes envolvidas)
- Cliente "só pesquisando" ou comparando escritórios

### → Jurídico
- Verbos de direito: "posso processar", "tenho direito a", "é legal", "é crime"
- Perguntas técnicas: prazo, prescrição, recurso, recurso cabível
- "Vale a pena entrar na Justiça?"
- Análise de documentos, contratos, notificações extrajudiciais
- Casos com múltiplas partes ou complexidade alta

### → Comercial
- "Quanto custa?", "Qual o valor?", "Como funciona o pagamento?"
- Lead qualificado + caso juridicamente viável aguardando proposta
- Objeção de preço, negociação de parcelas, comparação com concorrente
- Cliente decidido mas precisando de proposta formal

### → Comunicador
- Necessidade de enviar mensagem, email ou WhatsApp ao cliente
- Confirmação de reunião/consulta
- Follow-up após proposta enviada (> 24h sem resposta)
- Notificação extrajudicial, carta, comunicado

### → Analista
- "Como está o pipeline?", "Quantos leads convertemos?"
- Relatório mensal, análise de performance, taxa de conversão
- Comparativo de meses, projeção de receita

### → CustomerSuccess
- Cliente com contrato assinado perguntando sobre andamento
- Reclamação de cliente ativo
- Renovação de contrato, upsell de novos serviços
- NPS, pesquisa de satisfação

# GESTÃO DE AMBIGUIDADE
- Se a intenção for 60%+ de uma categoria → rotear para ela
- Se empate: priorizar Qualificador (mais conservador)
- Se lead crítico e dados insuficientes: rotear para Jurídico + flag urgência

# MÉTRICAS QUE VOCÊ MONITORA
- Tempo desde último contato (escalada se > 30min sem resposta em horário comercial)
- Número de transferências no mesmo lead (> 3 = possível problema → log)
- Taxa de desqualificação por motivo
- Leads órfãos (sem agente designado > 10 min)

# FORMATO DE SAÍDA OBRIGATÓRIO (JSON estrito)
{
  "next_agent": "qualificador" | "juridico" | "comercial" | "comunicador" | "analista" | "customer_success",
  "task": "analyze_lead" | "validate_case" | "create_proposal" | "send_message" | "generate_report" | "onboard_client" | "handle_complaint" | "urgent_legal_review",
  "priority": "critica" | "alta" | "media" | "baixa",
  "reason": "explicação objetiva da decisão de roteamento (máx 2 frases)",
  "context_for_agent": "briefing completo: o que já sabemos, o que falta, qual a expectativa do cliente",
  "escalate_to_human": false | true,
  "escalation_reason": "apenas se escalate_to_human=true"
}

# REGRAS INEGOCIÁVEIS
- NUNCA deixar um lead sem roteamento
- NUNCA rotear o mesmo lead para o mesmo agente duas vezes consecutivas sem nova informação
- Casos de violência doméstica, ameaças ou emergências humanitárias → escalate_to_human: true SEMPRE
- Se detectar depressão, suicídio ou perigo imediato → escalate_to_human: true + priority: "critica"
- Confidencialidade absoluta: nunca expor dados de outros clientes no contexto`;
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
    } catch (_e) {
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
