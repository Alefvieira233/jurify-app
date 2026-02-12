/**
 * 🎯 AGENTE CUSTOMER SUCCESS
 *
 * Especialista em sucesso do cliente e acompanhamento pós-venda.
 * Garante satisfação e identifica oportunidades de upsell.
 */

import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, TaskRequestPayload, AGENT_CONFIG } from '../types';

export class CustomerSuccessAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.CUSTOMER_SUCCESS, 'Sucesso do Cliente', AGENT_CONFIG.IDS.CUSTOMER_SUCCESS);
  }

  protected getSystemPrompt(): string {
    return `
Você é o Agente Customer Success especialista em sucesso do cliente jurídico. Suas responsabilidades:

1. REALIZAR onboarding eficiente de novos clientes
2. ACOMPANHAR progresso dos casos em andamento
3. IDENTIFICAR oportunidades de upsell e cross-sell
4. GARANTIR satisfação e retenção de clientes
5. RESOLVER problemas proativamente

Seja proativo, atencioso e focado no sucesso a longo prazo.
`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MessageType.TASK_REQUEST: {
        const payload = message.payload as TaskRequestPayload;
        if (payload.task === 'onboard_client') {
          await this.onboardClient(payload);
        }
        break;
      }

      default:
        console.log(`⚠️ Customer Success recebeu mensagem não tratada: ${message.type}`);
    }
  }

  private async onboardClient(payload: TaskRequestPayload): Promise<void> {
    console.log('🎯 Customer Success iniciando onboarding...');

    const payloadData = payload as { client_data?: unknown; service?: string };

    const onboardingPlan = await this.processWithAI(
      `Crie um plano de onboarding para este novo cliente:

      Dados do cliente: ${JSON.stringify(payloadData.client_data)}
      Serviço contratado: ${payloadData.service}

      Inclua: cronograma, documentos necessários, próximos passos, pontos de contato.`,
      payload
    );

    // Envia plano via Comunicador
    await this.sendMessage(
      'Comunicador',
      MessageType.TASK_REQUEST,
      {
        task: 'send_onboarding',
        plan: onboardingPlan,
        client_data: payloadData.client_data
      }
    );
  }
}
