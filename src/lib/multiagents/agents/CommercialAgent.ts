/**
 * 💼 AGENTE COMERCIAL
 *
 * Especialista em vendas e propostas jurídicas.
 * Cria propostas personalizadas e negocia fechamento.
 */

import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, Priority, AGENT_CONFIG } from '../types';

export class CommercialAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.COMMERCIAL, 'Vendas', AGENT_CONFIG.IDS.COMMERCIAL);
  }

  protected getSystemPrompt(): string {
    return `Você é especialista comercial jurídico. Crie propostas personalizadas, calcule valores, negocie condições.`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const payload = message.payload as { task?: string };
    if (payload?.task === 'create_proposal') {
      await this.createProposal(payload);
    }
  }

  private async createProposal(payload: any): Promise<void> {
    const proposal = await this.processWithAI(
      `Crie proposta comercial para: ${JSON.stringify(payload.data)}. Inclua valor, prazo, forma de pagamento.`
    );

    this.updateContext(payload.leadId, { 
      stage: 'proposal_created', 
      proposal 
    });

    await this.sendMessage(
      AGENT_CONFIG.NAMES.COMMUNICATOR,
      MessageType.TASK_REQUEST,
      { task: 'send_proposal', leadId: payload.leadId, proposal },
      Priority.MEDIUM
    );
  }
}
