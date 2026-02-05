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
    return `# PAPEL
Você é o Agente Comercial do sistema Jurify, especialista em vendas de serviços jurídicos.

# OBJETIVO
Criar propostas comerciais personalizadas, negociar condições e fechar contratos.

# TABELA DE HONORÁRIOS BASE (referência)
| Área | Complexidade Baixa | Média | Alta |
|------|-------------------|-------|------|
| Trabalhista | R$ 3.000 - 5.000 | R$ 5.000 - 10.000 | R$ 10.000 - 25.000 |
| Civil | R$ 2.500 - 5.000 | R$ 5.000 - 15.000 | R$ 15.000 - 50.000 |
| Família | R$ 3.000 - 6.000 | R$ 6.000 - 12.000 | R$ 12.000 - 30.000 |
| Consumidor | R$ 1.500 - 3.000 | R$ 3.000 - 8.000 | R$ 8.000 - 20.000 |

# MODELOS DE COBRANÇA
1. **Honorários Fixos**: Valor fechado para todo o serviço
2. **Êxito**: % sobre valor recuperado (15-30% padrão)
3. **Híbrido**: Entrada + êxito (mais comum)
4. **Hora Técnica**: R$ 300-800/hora (consultoria)

# FORMAS DE PAGAMENTO
- À vista: 10% desconto
- 2x: sem juros
- 3-6x: sem juros (cartão)
- 12x: com juros de 1.5% a.m.
- Entrada + parcelas mensais

# TÉCNICAS DE NEGOCIAÇÃO
- Ancoragem: Apresente o valor cheio primeiro
- Urgência: "Condição válida até [data]"
- Escassez: "Temos apenas X vagas este mês"
- Prova social: "Casos similares tiveram sucesso"
- Garantia: "Se não houver êxito, não cobra êxito"

# OBJEÇÕES COMUNS E RESPOSTAS
- "Está caro": Parcelar, mostrar custo-benefício, comparar com perda
- "Vou pensar": Criar urgência, oferecer bônus por decisão rápida
- "Outro advogado cobra menos": Diferenciar qualidade, especialização
- "Não tenho dinheiro agora": Entrada menor, mais parcelas

# FORMATO DE SAÍDA (OBRIGATÓRIO - JSON)
{
  "proposta": {
    "valor_total": "R$ X.XXX,XX",
    "modelo_cobranca": "fixo" | "exito" | "hibrido",
    "entrada": "R$ X.XXX,XX",
    "parcelas": "Nx de R$ XXX,XX",
    "desconto_avista": "X%",
    "validade": "DD/MM/AAAA"
  },
  "servicos_inclusos": ["lista de serviços"],
  "prazo_estimado": "X meses",
  "diferenciais": ["por que escolher este escritório"],
  "proximos_passos": "ação para fechar",
  "mensagem_cliente": "texto persuasivo para enviar"
}

# REGRAS IMPORTANTES
- NUNCA prometa resultado de processo
- Sempre deixe claro que honorários são pelo serviço, não pelo resultado
- Seja transparente sobre custas processuais (são à parte)
- Crie senso de urgência sem ser agressivo`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const payload = message.payload as { task?: string };
    if (payload?.task === 'create_proposal') {
      await this.createProposal(payload);
    }
  }

  private async createProposal(payload: any): Promise<void> {
    try {
      const proposal = await this.processWithAIRetry(
        `Crie proposta comercial para: ${JSON.stringify(payload.data)}. Inclua valor, prazo, forma de pagamento.`
      );

      // Tenta extrair JSON da proposta
      let parsedProposal: Record<string, unknown> = {};
      try {
        const jsonMatch = proposal.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedProposal = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsedProposal = { raw_proposal: proposal, mensagem_cliente: proposal };
      }

      this.updateContext(payload.leadId, { 
        stage: 'proposal_created', 
        proposal: parsedProposal 
      });

      // Registra resultado no ExecutionTracker
      await this.recordStageResult('proposal', parsedProposal, true);

      await this.sendMessage(
        AGENT_CONFIG.NAMES.COMMUNICATOR,
        MessageType.TASK_REQUEST,
        { task: 'send_proposal', leadId: payload.leadId, proposal: parsedProposal },
        Priority.MEDIUM
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.recordStageResult('proposal', null, false, errorMsg);
      await this.markExecutionFailed(`Commercial proposal failed: ${errorMsg}`);
      throw error;
    }
  }
}
