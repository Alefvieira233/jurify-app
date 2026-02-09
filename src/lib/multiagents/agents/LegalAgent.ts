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

  private async validateCase(payload: { task?: string; leadId?: string; data?: unknown; [key: string]: unknown }): Promise<void> {
    try {
      console.log(`⚖️ [Legal] Validando caso: ${payload.leadId || 'novo'}`);
      
      const validation = await this.processWithAIRetry(
        `Valide juridicamente este caso: ${JSON.stringify(payload.data)}. Analise viabilidade, complexidade e estratégia.`
      );

      // Usa o safeParseJSON do BaseAgent para parsing robusto
      let parsedValidation: Record<string, unknown> = this.safeParseJSON(validation) || { raw_validation: validation };
      
      // Determina viabilidade
      let viable = false;
      if (parsedValidation.viavel !== undefined) {
        viable = parsedValidation.viavel === true;
      } else if (parsedValidation.viable !== undefined) {
        viable = parsedValidation.viable === true;
      } else {
        // Fallback: busca no texto
        viable = validation.toLowerCase().includes('viável') || validation.toLowerCase().includes('viable');
      }
      
      console.log(`✅ [Legal] Validação concluída: viável=${viable}`);

      this.updateContext(payload.leadId || '', { 
        stage: 'validated', 
        validation: parsedValidation,
        viable 
      });

      // Registra resultado no ExecutionTracker
      await this.recordStageResult('legal_validation', { ...parsedValidation, viable }, true);

      await this.sendMessage(
        AGENT_CONFIG.NAMES.COORDINATOR,
        MessageType.STATUS_UPDATE,
        { stage: 'validated', leadId: payload.leadId, validation: parsedValidation, viable },
        Priority.HIGH
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.recordStageResult('legal_validation', null, false, errorMsg);
      await this.markExecutionFailed(`Legal validation failed: ${errorMsg}`);
      throw error;
    }
  }
}
