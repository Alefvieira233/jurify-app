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
            temperature: 0.3, // Lower for more consistent reasoning
            maxTokens: 2500,  // Higher for detailed analysis
        });
    }

    protected getSystemPrompt(): string {
        return `Você é um especialista em raciocínio jurídico avançado. Sua função é analisar casos complexos usando uma abordagem estruturada de Chain-of-Thought.

Para cada análise, você deve:
1. ENTENDER: Identificar os fatos principais e a questão jurídica central
2. ANALISAR: Examinar a legislação aplicável e jurisprudência relevante
3. AVALIAR: Ponderar os argumentos de cada lado
4. CONCLUIR: Apresentar uma conclusão fundamentada com nível de confiança

Formato de resposta:
FATOS PRINCIPAIS: [lista dos fatos]
QUESTÃO JURÍDICA: [questão central]
ANÁLISE: [raciocínio passo a passo]
CONCLUSÃO: [recomendação final]
CONFIANÇA: [0-100%]
AÇÕES SUGERIDAS: [próximos passos]`;
    }

    protected async handleMessage(message: AgentMessage): Promise<void> {
        console.log(`🧠 ${this.name} processando mensagem avançada de ${message.from}`);

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
                console.log(`🧠 ${this.name}: Mensagem não tratada: ${message.type}`);
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

            console.log(`✅ ${this.name}: Raciocínio avançado concluído com ${confidence}% de confiança`);

        } catch (error) {
            console.error(`❌ ${this.name}: Erro no raciocínio avançado:`, error);
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
