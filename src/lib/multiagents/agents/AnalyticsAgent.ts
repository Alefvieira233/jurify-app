/**
 * 📊 JURIFY ANALYTICS AGENT
 * 
 * Agent specialized in generating business insights and analytics.
 * Processes lead data, conversion metrics, and provides strategic recommendations.
 * 
 * @version 1.0.0
 * @enterprise true
 */

import { BaseAgent } from '../core/BaseAgent';
import { DEFAULT_OPENAI_MODEL } from '@/lib/ai/model';
import { AgentMessage, MessageType, Priority, TaskRequestPayload } from '../types';

interface AnalyticsReport {
    period: string;
    metrics: {
        totalLeads: number;
        conversions: number;
        conversionRate: number;
        avgResponseTime: number;
        topLegalAreas: string[];
    };
    insights: string[];
    recommendations: string[];
    forecast: {
        nextMonthLeads: number;
        nextMonthConversions: number;
        confidence: number;
    };
}

export class AnalyticsAgent extends BaseAgent {
    constructor() {
        super(
            'Analytics & Insights',
            'analytics',
            'analytics_agent'
        );

        this.configureAI({
            model: DEFAULT_OPENAI_MODEL,
            temperature: 0.4,
            maxTokens: 2000,
        });
    }

    protected getSystemPrompt(): string {
        return `Você é um especialista em análise de dados jurídicos e business intelligence.

Sua função é:
1. Analisar métricas de leads e conversões
2. Identificar tendências e padrões
3. Gerar insights acionáveis
4. Prever tendências futuras
5. Recomendar estratégias de crescimento

Sempre forneça:
- Insights baseados em dados
- Recomendações práticas
- Projeções com níveis de confiança
- Comparações com benchmarks do setor jurídico`;
    }

    protected async handleMessage(message: AgentMessage): Promise<void> {
        console.log(`📊 ${this.name} processando análise de ${message.from}`);

        switch (message.type) {
            case MessageType.TASK_REQUEST: {
                const payload = message.payload as TaskRequestPayload;

                if (payload.task === 'generate_report') {
                    await this.generateAnalyticsReport(payload, message.from);
                } else if (payload.task === 'analyze_conversion') {
                    await this.analyzeConversionFunnel(payload, message.from);
                } else if (payload.task === 'forecast') {
                    await this.generateForecast(payload, message.from);
                }
                break;
            }
            default:
                console.log(`📊 ${this.name}: Tipo de mensagem não tratado: ${message.type}`);
        }
    }

    private async generateAnalyticsReport(
        payload: TaskRequestPayload,
        requesterId: string
    ): Promise<void> {
        try {
            const { data } = payload;

            const analysisPrompt = `Analise os seguintes dados do escritório jurídico e gere um relatório executivo:

DADOS:
${JSON.stringify(data, null, 2)}

Gere um relatório com:
1. RESUMO EXECUTIVO (3 linhas)
2. MÉTRICAS PRINCIPAIS com análise
3. 3-5 INSIGHTS importantes
4. 3-5 RECOMENDAÇÕES práticas
5. PREVISÃO para próximo mês

Formate de forma clara e objetiva.`;

            const response = await this.processWithAI(analysisPrompt);

            await this.sendMessage(
                requesterId,
                MessageType.TASK_RESPONSE,
                {
                    task: 'generate_report',
                    result: {
                        report: response,
                        generatedAt: new Date().toISOString(),
                    },
                    success: true,
                },
                Priority.MEDIUM
            );

            console.log(`✅ ${this.name}: Relatório analítico gerado com sucesso`);

        } catch (error) {
            console.error(`❌ ${this.name}: Erro na geração de relatório:`, error);
            await this.sendMessage(
                requesterId,
                MessageType.ERROR_REPORT,
                { error: error instanceof Error ? error.message : 'Unknown error' },
                Priority.HIGH
            );
        }
    }

    private async analyzeConversionFunnel(
        payload: TaskRequestPayload,
        requesterId: string
    ): Promise<void> {
        const conversionPrompt = `Analise o funil de conversão jurídico:

DADOS DO FUNIL:
${JSON.stringify(payload.data, null, 2)}

Identifique:
1. GARGALOS no funil (onde estamos perdendo leads)
2. ETAPAS com melhor performance
3. AÇÕES para melhorar conversão em cada etapa
4. BENCHMARK: compare com média do mercado jurídico (15-25% conversão)`;

        const response = await this.processWithAI(conversionPrompt);

        await this.sendMessage(
            requesterId,
            MessageType.TASK_RESPONSE,
            {
                task: 'analyze_conversion',
                result: { analysis: response },
                success: true,
            },
            Priority.MEDIUM
        );
    }

    private async generateForecast(
        payload: TaskRequestPayload,
        requesterId: string
    ): Promise<void> {
        const forecastPrompt = `Baseado nos dados históricos, gere uma previsão:

DADOS HISTÓRICOS:
${JSON.stringify(payload.data, null, 2)}

Forneça:
1. PREVISÃO de leads para próximo mês
2. PREVISÃO de conversões
3. SAZONALIDADE esperada
4. FATORES DE RISCO
5. NÍVEL DE CONFIANÇA (%)`;

        const response = await this.processWithAI(forecastPrompt);

        await this.sendMessage(
            requesterId,
            MessageType.TASK_RESPONSE,
            {
                task: 'forecast',
                result: { forecast: response },
                success: true,
            },
            Priority.MEDIUM
        );
    }
}

export default AnalyticsAgent;
