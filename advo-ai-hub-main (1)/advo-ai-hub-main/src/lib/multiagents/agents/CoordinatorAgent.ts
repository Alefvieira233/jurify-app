import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, Priority, AGENT_CONFIG } from '../types';

export class CoordinatorAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.COORDINATOR, 'Orquestracao', AGENT_CONFIG.IDS.COORDINATOR);
  }

  protected getSystemPrompt(): string {
    return `Você é o Coordenador do sistema jurídico. Orquestre outros agentes, tome decisões estratégicas e monitore o progresso dos casos.`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MessageType.TASK_REQUEST:
        await this.planExecution(message.payload);
        break;
      case MessageType.STATUS_UPDATE:
        await this.monitorProgress(message.payload);
        break;
    }
  }

  private async planExecution(payload: any): Promise<void> {
    const plan = await this.processWithAI(
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
      payload.context
    );

    let nextAgent = AGENT_CONFIG.NAMES.QUALIFIER;
    let task = 'analyze_lead';

    try {
      // More robust JSON extraction
      const jsonMatch = plan.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const decision = JSON.parse(jsonStr);

        if (decision.next_agent && Object.values(AGENT_CONFIG.NAMES).includes(decision.next_agent)) {
          nextAgent = decision.next_agent;
          task = decision.task || 'analyze_lead';
        }
      } else {
        console.warn('Nenhum JSON encontrado na resposta do Coordenador');
      }
    } catch (e) {
      console.warn('Falha ao parsear decisão do Coordenador, usando fallback:', e);
    }

    this.updateContext(payload.leadId, { stage: 'planned', plan });

    await this.sendMessage(
      nextAgent,
      MessageType.TASK_REQUEST,
      { task, leadId: payload.leadId, data: payload },
      Priority.HIGH
    );
  }

  private async monitorProgress(payload: any): Promise<void> {
    const { stage, leadId } = payload;

    switch (stage) {
      case 'qualified':
        await this.sendMessage(
          AGENT_CONFIG.NAMES.LEGAL,
          MessageType.TASK_REQUEST,
          { task: 'validate_case', leadId, data: payload },
          Priority.HIGH
        );
        break;
      case 'validated':
        await this.sendMessage(
          AGENT_CONFIG.NAMES.COMMERCIAL,
          MessageType.TASK_REQUEST,
          { task: 'create_proposal', leadId, data: payload },
          Priority.HIGH
        );
        break;
    }
  }
}
