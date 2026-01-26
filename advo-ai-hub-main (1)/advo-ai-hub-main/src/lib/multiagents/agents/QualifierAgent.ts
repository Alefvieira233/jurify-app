import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, Priority, AGENT_CONFIG } from '../types';

export class QualifierAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.QUALIFIER, 'Qualificacao de Leads', AGENT_CONFIG.IDS.QUALIFIER);
  }

  protected getSystemPrompt(): string {
    return `Você é especialista em qualificação de leads jurídicos. Analise perfil, identifique área jurídica, avalie urgência e potencial.`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const payload = message.payload as { task?: string };
    if (payload?.task === 'analyze_lead') {
      await this.analyzeLead(payload);
    }
  }

  private async analyzeLead(payload: any): Promise<void> {
    const analysis = await this.processWithAI(
      `Analise este lead: ${JSON.stringify(payload.data)}. Determine área jurídica, urgência e viabilidade.`
    );

    this.updateContext(payload.leadId, { 
      stage: 'qualified', 
      analysis,
      legal_area: 'trabalhista' // Extrair da análise
    });

    await this.sendMessage(
      AGENT_CONFIG.NAMES.COORDINATOR,
      MessageType.STATUS_UPDATE,
      { stage: 'qualified', leadId: payload.leadId, analysis },
      Priority.HIGH
    );
  }
}
