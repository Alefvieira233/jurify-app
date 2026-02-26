/**
 * 🧠 JURIFY ADVANCED REASONING AGENT
 * 
 * Agent with Chain-of-Thought reasoning capabilities for complex legal analysis.
 * Uses structured thinking and multi-step reasoning for better decisions.
 * 
 * @version 1.0.0
 * @enterprise true
 */

import { BaseAgent } from '../core/BaseAgent';
import { DEFAULT_OPENAI_MODEL } from '@/lib/ai/model';
import { Priority, MessageType } from '../types';
import type { AgentMessage, TaskRequestPayload } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdvancedReasoningAgent');

interface ReasoningStep {
    step: number;
    thought: string;
    observation: string;
    conclusion: string;
}

interface ReasoningResult {
    finalAnswer: string;
    reasoning: ReasoningStep[];
    confidence: number;
    suggestedActions: string[];
}

export class AdvancedReasoningAgent extends BaseAgent {
    private reasoningSteps: ReasoningStep[] = [];

    constructor() {
        super(
            'Raciocínio Avançado',
            'reasoning',
            'advanced_reasoning'
        );

        // Configure for deeper thinking
        this.configureAI({
            model: DEFAULT_OPENAI_MODEL,
            temperature: 0.2, // Lower for more consistent reasoning
            maxTokens: 4000,  // Higher for detailed analysis
        });
    }

    protected getSystemPrompt(): string {
        return `# IDENTIDADE
Você é o Agente de Raciocínio Jurídico Avançado do Jurify — o mecanismo de pensamento profundo do sistema. Quando os outros agentes encontram um caso complexo, ambíguo ou de alto risco, eles te consultam. Você pensa devagar, analisa todos os ângulos e nunca dá uma resposta rasa.

Você usa Chain-of-Thought (CoT) estruturado aplicado ao direito brasileiro, com raciocínio análogo ao de um desembargador redigindo um acórdão — fundamentado, contraditório e conclusivo.

# METODOLOGIA: JURÍDICO CHAIN-OF-THOUGHT (J-CoT)

## Fase 1: COMPREENSÃO DOS FATOS
Não avance sem entender os fatos completamente.
- Quem são as partes? (autor, réu, terceiros interessados)
- Qual é a relação jurídica entre elas? (contratual, legal, extracontratual)
- O que aconteceu, quando e onde?
- Quais fatos são incontroversos vs. controvertidos?
- Qual é a pretensão do cliente? (o que ele quer como resultado)

## Fase 2: IDENTIFICAÇÃO DA QUESTÃO JURÍDICA CENTRAL
Depois de entender os fatos, defina precisamente:
- Qual é a questão jurídica central? (não o problema do cliente — a questão jurídica)
- Existem questões prejudiciais? (que precisam ser resolvidas antes)
- Existem questões processuais relevantes? (competência, legitimidade, prescrição)

## Fase 3: MAPEAMENTO DO ORDENAMENTO APLICÁVEL
Para cada questão, mapeie:
- Normas constitucionais aplicáveis (CF/88)
- Legislação infraconstitucional (código, lei especial)
- Regulamentação (decretos, portarias, resoluções)
- Normas contratuais (se aplicável)
Hierarquia: CF > Lei Complementar > Lei Ordinária > Decreto > Portaria

## Fase 4: ANÁLISE JURISPRUDENCIAL
Pesquise (com base no seu treinamento):
- Precedentes vinculantes (STF, STJ, TST — súmulas e teses de repercussão geral)
- Precedentes persuasivos (TRFs, TRTs, TJs)
- Tendências de posicionamento: o tribunal está mudando de entendimento?
- Existem divergências? Como os tribunais superiores tendem a resolver?

## Fase 5: AVALIAÇÃO DOS ARGUMENTOS
Analise os dois lados:

### TESE FAVORÁVEL AO CLIENTE
- Argumento principal
- Legislação de suporte
- Precedente mais favorável
- Ponto mais forte

### TESE CONTRÁRIA (o que o réu/adversário vai arguir)
- Argumento principal da defesa
- Legislação de suporte
- Precedente mais favorável ao réu
- Ponto mais vulnerável da tese do cliente

### CONTRAARGUMENTOS
- Como rebater os argumentos da parte contrária
- Quais provas/documentos fortalecem a tese do cliente
- Qual é o "coração" do argumento vencedor

## Fase 6: ANÁLISE DE RISCO PROCESSUAL
Avalie separadamente:
- Risco de prescrição/decadência: prazo, início da contagem, causas de suspensão e interrupção
- Risco probatório: o que precisa provar, o que tem, o que falta
- Risco jurisprudencial: entendimento atual é favorável? Pode mudar?
- Risco financeiro: custo do processo vs. valor da causa
- Risco de execução: o réu tem patrimônio para suportar a condenação?

## Fase 7: RECOMENDAÇÃO ESTRATÉGICA FUNDAMENTADA
Após análise completa:
- Qual estratégia maximiza a chance de êxito?
- Quais são as alternativas (judicial, extrajudicial, administrativo, arbitragem)?
- Qual o melhor momento para agir?
- Quais são as condições para reverter eventual desfavorável?

# CASOS QUE EXIGEM RACIOCÍNIO AVANÇADO
- Conflito aparente de normas (lei geral vs. especial, lei nova vs. antiga)
- Tese jurídica nova sem precedente consolidado
- Caso com múltiplas partes e interesses conflitantes
- Questões constitucionais (controle difuso de constitucionalidade)
- Prescrição e decadência com contagem complexa
- Casos que envolvem mais de uma área do direito
- Alto valor da causa (> R$ 100.000) ou interesse coletivo
- Criminal com pena privativa de liberdade
- Liminar/tutela urgente com risco de dano irreparável

# FORMATO DE SAÍDA OBRIGATÓRIO (SEMPRE DETALHADO)

## Formato de Resposta
QUESTÃO ANALISADA:
[definição precisa da questão jurídica]

FATOS RELEVANTES:
[apenas os fatos juridicamente relevantes, sem narrativa]

FASE 1 — COMPREENSÃO:
[análise dos fatos]

FASE 2 — QUESTÃO JURÍDICA:
[identificação precisa]

FASE 3 — ORDENAMENTO APLICÁVEL:
[normas hierarquizadas]

FASE 4 — JURISPRUDÊNCIA:
[precedentes e tendências]

FASE 5 — ARGUMENTOS:
FAVORÁVEIS: [tese do cliente]
CONTRÁRIOS: [tese adversária]
CONTRAARGUMENTOS: [como rebater]

FASE 6 — RISCO PROCESSUAL:
[avaliação de cada tipo de risco]

FASE 7 — RECOMENDAÇÃO:
[estratégia recomendada com fundamentação]

CONCLUSÃO:
[resposta direta e objetiva à questão original]

CONFIANÇA: [X%]
BASE: [o que fundamenta esse nível de confiança]
AÇÕES IMEDIATAS SUGERIDAS: [lista ordenada por urgência]

DISCLAIMER: Esta análise é baseada em treinamento e conhecimento jurídico geral. Deve ser revisada por advogado habilitado antes de ser usada como fundamento de decisão em caso real.`;
    }

    protected async handleMessage(message: AgentMessage): Promise<void> {
        log.info(`Processando mensagem avançada de ${message.from}`);

        switch (message.type) {
            case MessageType.TASK_REQUEST: {
                const payload = message.payload as TaskRequestPayload;
                await this.performAdvancedReasoning(payload, message.from);
                break;
            }
            case MessageType.DECISION_REQUEST: {
                const payload = message.payload as TaskRequestPayload;
                await this.makeDecision(payload, message.from);
                break;
            }
            default:
                log.warn(`Mensagem não tratada: ${message.type}`);
        }
    }

    private async performAdvancedReasoning(
        payload: TaskRequestPayload,
        requesterId: string
    ): Promise<void> {
        try {
            this.reasoningSteps = [];

            // Step 1: Gather facts
            const factsPrompt = `Analise o seguinte caso e liste os FATOS PRINCIPAIS de forma objetiva:
${JSON.stringify(payload.data, null, 2)}

Liste apenas os fatos, sem interpretação:`;

            const factsResponse = await this.processWithAI(factsPrompt);
            this.addReasoningStep(1, 'Identificar fatos', factsResponse, 'Fatos principais extraídos');

            // Step 2: Identify legal issues
            const issuesPrompt = `Baseado nos fatos:
${factsResponse}

Identifique a QUESTÃO JURÍDICA CENTRAL e questões secundárias:`;

            const issuesResponse = await this.processWithAI(issuesPrompt);
            this.addReasoningStep(2, 'Identificar questões jurídicas', issuesResponse, 'Questões jurídicas mapeadas');

            // Step 3: Legal analysis
            const analysisPrompt = `Questões identificadas:
${issuesResponse}

Faça uma ANÁLISE JURÍDICA completa considerando:
- Legislação aplicável
- Jurisprudência relevante
- Argumentos de cada parte
- Riscos e probabilidades`;

            const analysisResponse = await this.processWithAI(analysisPrompt);
            this.addReasoningStep(3, 'Análise jurídica', analysisResponse, 'Análise completa realizada');

            // Step 4: Final conclusion
            const conclusionPrompt = `Baseado em toda a análise anterior:

FATOS: ${factsResponse}
QUESTÕES: ${issuesResponse}
ANÁLISE: ${analysisResponse}

Forneça:
1. CONCLUSÃO FINAL com recomendação
2. NÍVEL DE CONFIANÇA (0-100%)
3. PRÓXIMOS PASSOS SUGERIDOS`;

            const conclusionResponse = await this.processWithAI(conclusionPrompt);
            this.addReasoningStep(4, 'Conclusão final', conclusionResponse, 'Decisão fundamentada');

            // Parse confidence from response
            const confidenceMatch = conclusionResponse.match(/(\d+)%/);
            const confidence = confidenceMatch && confidenceMatch[1] ? parseInt(confidenceMatch[1]) : 75;

            const result: ReasoningResult = {
                finalAnswer: conclusionResponse,
                reasoning: this.reasoningSteps,
                confidence,
                suggestedActions: this.extractActions(conclusionResponse),
            };

            await this.sendMessage(
                requesterId,
                MessageType.TASK_RESPONSE,
                {
                    task: 'advanced_reasoning',
                    result,
                    success: true,
                },
                Priority.HIGH
            );

            log.info(`Raciocínio avançado concluído com ${confidence}% de confiança`);

        } catch (error) {
            log.error('Erro no raciocínio avançado', error);
            await this.sendMessage(
                requesterId,
                MessageType.ERROR_REPORT,
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    original_task: 'advanced_reasoning',
                },
                Priority.HIGH
            );
        }
    }

    private async makeDecision(
        payload: TaskRequestPayload,
        requesterId: string
    ): Promise<void> {
        const decisionPrompt = `Você precisa tomar uma DECISÃO sobre:
${JSON.stringify(payload.data, null, 2)}

Forneça:
1. SUA DECISÃO clara e objetiva
2. FUNDAMENTAÇÃO em 3-5 pontos
3. RISCOS da decisão
4. ALTERNATIVAS consideradas`;

        const response = await this.processWithAI(decisionPrompt);

        await this.sendMessage(
            requesterId,
            MessageType.DECISION_RESPONSE,
            {
                decision: response,
                reasoning: this.reasoningSteps,
                timestamp: new Date(),
            },
            Priority.HIGH
        );
    }

    private addReasoningStep(
        step: number,
        thought: string,
        observation: string,
        conclusion: string
    ): void {
        this.reasoningSteps.push({ step, thought, observation, conclusion });
    }

    private extractActions(response: string): string[] {
        const actions: string[] = [];
        const lines = response.split('\n');

        let inActionsSection = false;
        for (const line of lines) {
            if (line.toLowerCase().includes('próximo') || line.toLowerCase().includes('sugerid')) {
                inActionsSection = true;
                continue;
            }
            if (inActionsSection && line.trim().startsWith('-')) {
                actions.push(line.trim().substring(1).trim());
            }
        }

        return actions.length > 0 ? actions : ['Agendar consulta com cliente', 'Preparar documentação inicial'];
    }
}

export default AdvancedReasoningAgent;
