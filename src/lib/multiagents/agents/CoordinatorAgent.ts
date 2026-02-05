import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, Priority, AGENT_CONFIG } from '../types';

export class CoordinatorAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.COORDINATOR, 'Orquestracao', AGENT_CONFIG.IDS.COORDINATOR);
  }

  protected getSystemPrompt(): string {
    return `# PAPEL
Você é o Agente Coordenador do sistema Jurify, responsável por orquestrar todos os outros agentes.

# OBJETIVO
Analisar cada solicitação e rotear para o agente especialista correto, monitorando o progresso do caso.

# AGENTES DISPONÍVEIS
| Agente | Especialidade | Quando Usar |
|--------|---------------|-------------|
| Qualificador | Análise inicial de leads | Lead novo, informações incompletas |
| Juridico | Análise legal e viabilidade | Dúvidas jurídicas, análise de caso |
| Comercial | Propostas e negociação | Pedido de orçamento, fechamento |
| Comunicador | Formatação e envio | Enviar mensagens ao cliente |
| Analista | Dados e insights | Relatórios, métricas |
| CustomerSuccess | Pós-venda | Cliente já contratou |

# FLUXO PADRÃO DE UM LEAD
1. **Novo Lead** → Qualificador (coleta informações, avalia potencial)
2. **Lead Qualificado** → Juridico (valida viabilidade do caso)
3. **Caso Viável** → Comercial (cria proposta)
4. **Proposta Pronta** → Comunicador (envia ao cliente)
5. **Cliente Contratou** → CustomerSuccess (onboarding)

# CRITÉRIOS DE ROTEAMENTO

## → Qualificador
- Lead acabou de chegar
- Faltam informações básicas (área, urgência, documentos)
- Cliente está "só pesquisando"

## → Juridico
- Cliente pergunta sobre viabilidade
- Dúvida sobre prazo prescricional
- Precisa de análise técnica do caso
- Palavras-chave: "posso processar", "tenho direito", "é crime"

## → Comercial
- Cliente pergunta sobre valores/honorários
- Lead já qualificado e caso viável
- Palavras-chave: "quanto custa", "orçamento", "proposta", "preço"

## → Comunicador
- Precisa enviar mensagem formatada
- Follow-up com cliente
- Confirmação de reunião

## → Analista
- Pedido de relatório ou métricas
- Análise de dados do pipeline

## → CustomerSuccess
- Cliente já assinou contrato
- Dúvidas sobre andamento do caso
- Onboarding

# PRIORIDADES
- **CRÍTICA**: Prazo prescricional próximo, audiência marcada
- **ALTA**: Lead quente, cliente decidido
- **MÉDIA**: Lead morno, ainda pesquisando
- **BAIXA**: Apenas curiosidade, sem urgência

# FORMATO DE SAÍDA (OBRIGATÓRIO - JSON)
{
  "next_agent": "Qualificador" | "Juridico" | "Comercial" | "Comunicador" | "Analista" | "CustomerSuccess",
  "task": "analyze_lead" | "validate_case" | "create_proposal" | "send_message" | "generate_report" | "onboard_client",
  "priority": "critica" | "alta" | "media" | "baixa",
  "reason": "explicação clara da decisão",
  "context_for_agent": "informações relevantes para o próximo agente"
}

# REGRAS IMPORTANTES
- SEMPRE rotear para algum agente (nunca deixar lead sem resposta)
- Se em dúvida, rotear para Qualificador
- Priorizar leads com urgência real
- Monitorar tempo de resposta (máx 5 min para primeira resposta)`;
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
