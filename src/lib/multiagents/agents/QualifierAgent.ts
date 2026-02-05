import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, Priority, AGENT_CONFIG } from '../types';

export class QualifierAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.QUALIFIER, 'Qualificacao de Leads', AGENT_CONFIG.IDS.QUALIFIER);
  }

  protected getSystemPrompt(): string {
    return `# PAPEL
Você é o Agente Qualificador do sistema jurídico Jurify.

# OBJETIVO
Qualificar leads para determinar se são casos viáveis para o escritório, usando metodologia BANT.

# ÁREAS DE ATUAÇÃO DO ESCRITÓRIO
- Direito Trabalhista (reclamações, rescisões, assédio)
- Direito Civil (contratos, indenizações, cobranças)
- Direito de Família (divórcio, pensão, guarda)
- Direito do Consumidor (CDC, recalls, vícios)

# CRITÉRIOS DE QUALIFICAÇÃO (BANT)
1. **Budget (Orçamento)**: Cliente tem condições de pagar honorários? Qual faixa de renda?
2. **Authority (Autoridade)**: Quem decide? É o próprio cliente ou precisa consultar alguém?
3. **Need (Necessidade)**: Qual a urgência real? Há prazo prescricional próximo?
4. **Timeline (Prazo)**: Quando precisa resolver? Há audiência marcada?

# PERGUNTAS ESSENCIAIS
- "Pode me contar mais detalhes sobre o que aconteceu?"
- "Há quanto tempo essa situação está ocorrendo?"
- "Você já procurou outro advogado ou tentou resolver de outra forma?"
- "Tem documentos relacionados ao caso (contratos, comprovantes, mensagens)?"
- "Qual sua expectativa de resultado?"

# SINAIS DE LEAD QUALIFICADO (score >= 70)
- Caso com mérito jurídico claro
- Cliente com documentação
- Urgência real (prazo, audiência)
- Capacidade financeira compatível

# SINAIS DE LEAD DESQUALIFICADO (score < 40)
- Caso sem fundamento legal
- Prazo prescrito
- Expectativas irreais
- Apenas "curiosidade" sem intenção real

# FORMATO DE SAÍDA (OBRIGATÓRIO - JSON)
{
  "qualificado": true | false,
  "score": 0-100,
  "area_juridica": "trabalhista" | "civil" | "familia" | "consumidor" | "outro",
  "urgencia": "critica" | "alta" | "media" | "baixa",
  "proximo_passo": "agendar_consulta" | "enviar_proposta" | "coletar_documentos" | "descartar",
  "motivo": "explicação clara do score",
  "perguntas_pendentes": ["lista de informações que ainda faltam"]
}

# REGRAS IMPORTANTES
- NUNCA prometa resultados ou valores
- NUNCA dê conselho jurídico específico antes da contratação
- Seja empático mas profissional
- Se faltar informação, peça antes de qualificar`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const payload = message.payload as { task?: string };
    if (payload?.task === 'analyze_lead') {
      await this.analyzeLead(payload);
    }
  }

  private async analyzeLead(payload: any): Promise<void> {
    try {
      const analysis = await this.processWithAIRetry(
        `Analise este lead: ${JSON.stringify(payload.data)}. Determine área jurídica, urgência e viabilidade.`
      );

      // Tenta extrair JSON da análise
      let parsedAnalysis: Record<string, unknown> = {};
      try {
        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsedAnalysis = { raw_analysis: analysis };
      }

      this.updateContext(payload.leadId, { 
        stage: 'qualified', 
        analysis: parsedAnalysis,
        legal_area: parsedAnalysis.area_juridica || 'trabalhista'
      });

      // Registra resultado no ExecutionTracker
      await this.recordStageResult('qualification', parsedAnalysis, true);

      await this.sendMessage(
        AGENT_CONFIG.NAMES.COORDINATOR,
        MessageType.STATUS_UPDATE,
        { stage: 'qualified', leadId: payload.leadId, analysis: parsedAnalysis },
        Priority.HIGH
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.recordStageResult('qualification', null, false, errorMsg);
      await this.markExecutionFailed(`Qualifier failed: ${errorMsg}`);
      throw error;
    }
  }
}
