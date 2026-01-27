/**
 * 📊 AGENTE ANALISTA
 *
 * Especialista em análise de dados, métricas e insights.
 * Monitora performance e sugere otimizações.
 */

import { supabase } from '@/integrations/supabase/client';
import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, MessageType, TaskRequestPayload, AGENT_CONFIG } from '../types';

export class AnalystAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.ANALYST, 'Dados e Insights', AGENT_CONFIG.IDS.ANALYST);
  }

  protected getSystemPrompt(): string {
    return `
Você é o Agente Analista especialista em dados jurídicos. Suas responsabilidades:

1. ANALISAR padrões nos dados de leads e conversões
2. GERAR insights de performance dos agentes
3. IDENTIFICAR oportunidades de melhoria
4. CALCULAR métricas de ROI e eficiência
5. SUGERIR otimizações baseadas em dados

Seja analítico, preciso e focado em resultados mensuráveis.
`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MessageType.TASK_REQUEST:
        const payload = message.payload as TaskRequestPayload;
        if (payload.task === 'analyze_performance') {
          await this.analyzePerformance(payload);
        }
        break;

      default:
        console.log(`⚠️ Analista recebeu mensagem não tratada: ${message.type}`);
    }
  }

  private async analyzePerformance(payload: TaskRequestPayload): Promise<void> {
    console.log('📊 Analista analisando performance...');

    // Busca dados do Supabase
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const analysis = await this.processWithAI(
      `Analise estes dados de leads dos últimos 30 dias e gere insights:

      Dados: ${JSON.stringify(leads?.slice(0, 10) || [])}

      Calcule: taxa de conversão, tempo médio de qualificação, áreas mais procuradas, ROI por canal.`,
      { leads }
    );

    // Compartilha insights com Coordenador
    await this.sendMessage(
      'Coordenador',
      MessageType.DATA_SHARE,
      {
        type: 'performance_analysis',
        analysis,
        metrics: {
          total_leads: leads?.length || 0,
          period: '30_days'
        }
      }
    );
  }
}
