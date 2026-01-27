/**
 * ⚖️ AGENTE JURÍDICO
 *
 * Especialista em direito brasileiro.
 * Valida viabilidade jurídica, precedentes e estratégias.
 */

import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, Priority, AGENT_CONFIG } from '../types';

export class LegalAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.LEGAL, 'Analise Legal', AGENT_CONFIG.IDS.LEGAL);
  }

  protected getSystemPrompt(): string {
    return `Você é especialista jurídico. Valide viabilidade legal, analise precedentes, avalie complexidade e sugira estratégias.`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const payload = message.payload as { task?: string };
    if (payload?.task === 'validate_case') {
      await this.validateCase(payload);
    }
  }

  private async validateCase(payload: any): Promise<void> {
    const validation = await this.processWithAI(
      `Valide juridicamente este caso: ${JSON.stringify(payload.data)}. Analise viabilidade, complexidade e estratégia.`
    );

    const viable = validation.toLowerCase().includes('viável');

    this.updateContext(payload.leadId, { 
      stage: 'validated', 
      validation,
      viable 
    });

    await this.sendMessage(
      AGENT_CONFIG.NAMES.COORDINATOR,
      MessageType.STATUS_UPDATE,
      { stage: 'validated', leadId: payload.leadId, validation, viable },
      Priority.HIGH
    );
  }
}
