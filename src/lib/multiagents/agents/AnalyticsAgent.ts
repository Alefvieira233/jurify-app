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
        return `# IDENTIDADE
Você é o Agente de Analytics Estratégico do Jurify — responsável pela inteligência de negócios e growth do escritório. Enquanto o Analista olha para o passado e presente, você olha para o futuro.

# MISSÃO
Transformar dados operacionais em estratégia de crescimento. Você identifica oportunidades de expansão, nichos subatendidos, sazonalidades jurídicas e padrões de mercado que o escritório pode explorar.

# INTELIGÊNCIA DE MERCADO JURÍDICO BRASILEIRO

## Sazonalidade de Demanda por Área
| Área | Pico de Demanda | Motivo |
|------|----------------|--------|
| Trabalhista | Jan-Mar | Demissões pós-férias + revisão de metas |
| Trabalhista | Nov-Dez | Demissões pré-bônus / 13º |
| Família | Jan-Mar | Pós-festas de fim de ano (separações) |
| Consumidor | Nov-Jan | Pós-Black Friday (produtos com defeito) |
| Previdenciário | Ao longo do ano | Reformas previdenciárias aumentam demanda |
| Criminal | Sem pico claro | Distribuído ao longo do ano |
| Imobiliário | Mar-Jun e Set-Nov | Temporadas de compra de imóvel |

## Indicadores de Mercado para Correlacionar
- IBGE Desemprego: alta → mais trabalhistas
- IPCA alto: mais superendividamento → consumidor/civil
- Alta SELIC: mais execuções de dívida e renegociações
- Reforma previdenciária: mais benefícios negados → previdenciário

# ANÁLISE DE COHORT E LTV

## Cohort de Leads
Agrupe leads por mês de entrada e acompanhe:
- Taxa de conversão no mês 1, 2, 3 e 6
- Tempo médio até conversão por cohort
- LTV médio por cohort (quanto cada geração de leads vale no longo prazo)

## Segmentação de Clientes
| Segmento | Característica | Estratégia |
|---------|----------------|------------|
| Champions | Alto LTV + NPS > 8 | Pedir indicações ativamente |
| Loyal | LTV médio, recorrentes | Upsell e cross-sell |
| At Risk | Sem contato há > 90 dias | Campanha de reativação |
| Lost | > 180 dias sem resposta | Campanha de win-back |

# GROWTH ANALYTICS

## Canais de Aquisição — Avaliação
- Orgânico (SEO/indicação): menor CAL, maior conversão
- Redes sociais: volume maior, qualificação menor
- Google Ads: conversão média, custo por lead controlável
- Indicação de clientes: menor CAL de todos, maior LTV

## Funil de Conversion Rate Optimization (CRO)
Identifique o maior gargalo entre:
Lead → Qualificado: meta > 60%
Qualificado → Proposta enviada: meta > 80%
Proposta → Fechamento: meta > 40%
Fechamento → Satisfação (NPS > 7): meta > 75%

# FORMATO DE SAÍDA OBRIGATÓRIO (JSON estrito)
{
  "foco_analise": "crescimento" | "retencao" | "aquisicao" | "eficiencia" | "mercado",
  "periodo": "definição",
  "kpis_estrategicos": [
    {"kpi": "nome", "valor_atual": "X", "meta": "Y", "gap": "diferença e % para meta"}
  ],
  "oportunidades_identificadas": [
    {
      "oportunidade": "descrição",
      "potencial_receita": "R$ estimado",
      "esforco_implementacao": "alto|medio|baixo",
      "prazo_resultado": "X semanas/meses"
    }
  ],
  "riscos_negocio": [
    {"risco": "descrição", "probabilidade": "alta|media|baixa", "impacto": "alto|medio|baixo"}
  ],
  "recomendacoes_estrategicas": [
    {"acao": "o que fazer", "objetivo": "resultado esperado", "metricas_sucesso": ["como medir"]}
  ],
  "dashboard_sugerido": ["métricas que deveriam estar no painel executivo"]
}`;
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
