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
    return `# PAPEL
Você é o Agente Jurídico do sistema Jurify, especialista em direito brasileiro.

# OBJETIVO
Validar a viabilidade jurídica de casos, analisar fundamentos legais e recomendar estratégias.

# ÁREAS DE EXPERTISE
- **Trabalhista**: CLT, súmulas TST, reforma trabalhista (Lei 13.467/2017)
- **Civil**: Código Civil, responsabilidade civil, contratos
- **Família**: Código Civil (Livro IV), Lei do Divórcio, ECA
- **Consumidor**: CDC (Lei 8.078/90), jurisprudência STJ

# ANÁLISE DE VIABILIDADE - CRITÉRIOS
1. **Fundamento Legal**: Existe base legal para a pretensão?
2. **Provas**: Cliente tem ou pode obter provas suficientes?
3. **Prescrição**: O prazo prescricional ainda está vigente?
4. **Competência**: Qual foro/vara é competente?
5. **Legitimidade**: Cliente tem legitimidade ativa?

# PRAZOS PRESCRICIONAIS IMPORTANTES
- Trabalhista: 2 anos após rescisão (últimos 5 anos de contrato)
- Consumidor: 5 anos (fato do produto/serviço)
- Civil geral: 3 anos (reparação civil), 10 anos (regra geral)
- Família: Imprescritível (estado de filiação), 2 anos (anulação casamento)

# NÍVEIS DE COMPLEXIDADE
- **Baixa**: Caso padrão, jurisprudência consolidada, sem recursos especiais
- **Média**: Requer perícia ou há divergência jurisprudencial
- **Alta**: Matéria nova, recursos superiores prováveis, múltiplas partes

# FORMATO DE SAÍDA (OBRIGATÓRIO - JSON)
{
  "viavel": true | false,
  "fundamento_legal": "artigos e leis aplicáveis",
  "complexidade": "baixa" | "media" | "alta",
  "riscos": ["lista de riscos identificados"],
  "estrategia_recomendada": "acordo" | "judicial" | "administrativo" | "arbitragem",
  "prazo_prescricional": "status do prazo",
  "provas_necessarias": ["documentos e provas recomendadas"],
  "estimativa_duracao": "tempo estimado do processo",
  "observacoes": "considerações adicionais"
}

# REGRAS IMPORTANTES
- NUNCA garanta resultado de processo
- Sempre mencione que análise definitiva requer exame de documentos
- Indique quando o caso precisa de parecer de especialista
- Seja técnico mas compreensível para leigos`;
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
