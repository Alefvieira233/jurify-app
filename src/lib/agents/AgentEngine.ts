/**
 * 🚀 JURIFY AUTOMATION ENGINE - SPACEX GRADE
 * 
 * Motor principal de automação que orquestra todos os agentes IA
 * e processa leads através de workflows inteligentes.
 * 
 * @author SpaceX Dev Team
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_OPENAI_MODEL } from '@/lib/ai/model';

// 🤖 TIPOS DE AGENTES ESPECIALIZADOS
export enum AgentType {
  SDR = 'sdr',           // Sales Development Representative
  CLOSER = 'closer',     // Closer/Vendedor
  CS = 'customer_success' // Customer Success
}

// 📊 STATUS DO LEAD NO PIPELINE
export enum LeadStatus {
  NEW = 'novo_lead',
  QUALIFYING = 'em_qualificacao',
  PROPOSAL_SENT = 'proposta_enviada',
  CONTRACT_SIGNED = 'contrato_assinado',
  IN_SERVICE = 'em_atendimento',
  LOST = 'lead_perdido'
}

// 🎯 CONFIGURAÇÃO DO AGENTE
export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  area_juridica: string;
  prompt_base: string;
  personality: string;
  specialization: string[];
  max_interactions: number;
  escalation_rules: EscalationRule[];
  active: boolean;
}

// 📋 REGRAS DE ESCALAÇÃO
export interface EscalationRule {
  condition: string;
  next_agent_type: AgentType;
  trigger_keywords: string[];
  confidence_threshold: number;
}

// 💬 INTERAÇÃO COM LEAD
export interface LeadInteraction {
  id: string;
  lead_id: string;
  agent_id: string;
  message: string;
  response: string;
  sentiment: number;
  confidence: number;
  next_action: string;
  created_at: Date;
}

// 🚀 MOTOR PRINCIPAL DE AGENTES
export class AgentEngine {
  private agents: Map<string, AgentConfig> = new Map();
  private activeConversations: Map<string, string> = new Map(); // lead_id -> agent_id

  constructor() {
    this.initializeAgents();
  }

  /**
   * 🔧 Inicializa agentes padrão do sistema
   */
  private async initializeAgents() {
    console.log('🚀 Inicializando AgentEngine...');
    
    // Carrega agentes do banco
    const { data: agentes } = await supabase
      .from('agentes_ia')
      .select('*')
      .eq('ativo', true);

    if (agentes) {
      agentes.forEach(agente => {
        this.agents.set(agente.id, this.mapDatabaseToConfig(agente));
      });
    }

    console.log(`✅ ${this.agents.size} agentes carregados`);
  }

  /**
   * 🎯 Processa um novo lead
   */
  async processNewLead(leadId: string): Promise<void> {
    console.log(`🎯 Processando novo lead: ${leadId}`);

    try {
      // 1. Busca dados do lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!lead) {
        throw new Error(`Lead ${leadId} não encontrado`);
      }

      // 2. Identifica o agente SDR adequado
      const sdrAgent = this.findBestAgent(AgentType.SDR, lead.area_juridica);
      
      if (!sdrAgent) {
        console.error('❌ Nenhum agente SDR disponível');
        return;
      }

      // 3. Inicia conversa de qualificação
      await this.startConversation(leadId, sdrAgent.id);

      // 4. Registra no sistema
      await this.logActivity(leadId, sdrAgent.id, 'lead_assigned', {
        agent_type: AgentType.SDR,
        area_juridica: lead.area_juridica
      });

    } catch (error) {
      console.error('❌ Erro ao processar lead:', error);
      throw error;
    }
  }

  /**
   * 🤖 Processa mensagem do lead
   */
  async processLeadMessage(
    leadId: string, 
    message: string,
    channel: 'whatsapp' | 'email' | 'chat' = 'chat'
  ): Promise<string> {
    console.log(`💬 Processando mensagem do lead ${leadId}: ${message.substring(0, 50)}...`);

    try {
      // 1. Identifica agente ativo para este lead
      let agentId = this.activeConversations.get(leadId);
      
      if (!agentId) {
        // Se não há conversa ativa, inicia com SDR
        await this.processNewLead(leadId);
        agentId = this.activeConversations.get(leadId);
      }

      if (!agentId) {
        throw new Error('Não foi possível atribuir agente ao lead');
      }

      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agente ${agentId} não encontrado`);
      }

      // 2. Gera resposta usando IA
      const response = await this.generateAgentResponse(agent, leadId, message);

      // 3. Analisa se deve escalar para próximo agente
      const shouldEscalate = await this.shouldEscalate(agent, message, response);
      
      if (shouldEscalate.escalate) {
        await this.escalateToNextAgent(leadId, shouldEscalate.nextAgentType);
      }

      // 4. Registra interação
      await this.saveInteraction(leadId, agentId, message, response);

      // 5. Atualiza status do lead se necessário
      await this.updateLeadStatus(leadId, agent, response);

      return response;

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      return 'Desculpe, ocorreu um erro. Nossa equipe foi notificada e entrará em contato em breve.';
    }
  }

  /**
   * 🎯 Encontra o melhor agente para uma área jurídica
   */
  private findBestAgent(type: AgentType, areaJuridica: string): AgentConfig | null {
    const agentsOfType = Array.from(this.agents.values())
      .filter(agent => agent.type === type && agent.active);

    // Prioriza agentes especializados na área
    const specialized = agentsOfType.find(agent => 
      agent.area_juridica === areaJuridica
    );

    if (specialized) return specialized;

    // Fallback para agente genérico
    return agentsOfType.find(agent => 
      agent.area_juridica === 'Geral' || agent.specialization.includes('geral')
    ) || agentsOfType[0] || null;
  }

  /**
   * 🚀 Inicia conversa com agente
   */
  private async startConversation(leadId: string, agentId: string): Promise<void> {
    this.activeConversations.set(leadId, agentId);
    
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Busca dados do lead para personalizar saudação
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (lead) {
      const saudacao = await this.generateWelcomeMessage(agent, lead);
      
      // Envia saudação inicial (implementar envio via WhatsApp/Email)
      await this.sendMessage(leadId, saudacao, 'system');
    }
  }

  /**
   * 🤖 Gera resposta do agente usando IA
   */
  private async generateAgentResponse(
    agent: AgentConfig,
    leadId: string,
    message: string
  ): Promise<string> {
    // Busca contexto da conversa
    const { data: interactions } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Busca dados do lead
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    // Monta contexto para IA
    const context = this.buildConversationContext(agent, lead, interactions || [], message);

    try {
      console.log('🤖 Calling Edge Function for chat completion...');
      
      const { data, error } = await supabase.functions.invoke('chat-completion', {
        body: {
          messages: [
            {
              role: "system",
              content: context.systemPrompt
            },
            ...context.conversationHistory,
            {
              role: "user",
              content: message
            }
          ],
          model: DEFAULT_OPENAI_MODEL,
          temperature: 0.7
        }
      });

      if (error) {
        console.error('❌ Supabase Function Error:', error);
        throw error;
      }

      if (!data || !data.reply) {
        throw new Error('Invalid response from AI service');
      }

      return data.reply;

    } catch (error) {
      console.error('❌ Erro na IA:', error);
      return 'Desculpe, estou verificando algumas informações no sistema. Pode repetir, por favor?';
    }
  }

  /**
   * 📊 Constrói contexto da conversa para IA
   */
  private buildConversationContext(
    agent: AgentConfig,
    lead: any,
    interactions: any[],
    currentMessage: string
  ) {
    const systemPrompt = `
Você é ${agent.name}, um ${this.getAgentTypeDescription(agent.type)} especializado em ${agent.area_juridica}.

PERSONALIDADE: ${agent.personality}

ESPECIALIZAÇÃO: ${agent.specialization.join(', ')}

DADOS DO LEAD:
- Nome: ${lead?.nome || lead?.nome_completo || 'Não informado'}
- Área de interesse: ${lead?.area_juridica || 'Não informado'}
- Origem: ${lead?.origem || 'Não informado'}
- Status atual: ${lead?.status || 'novo_lead'}

INSTRUÇÕES ESPECÍFICAS:
${agent.prompt_base}

REGRAS IMPORTANTES:
1. Seja profissional mas acessível
2. Faça perguntas qualificadoras relevantes
3. Identifique a necessidade jurídica específica
4. Mantenha o foco na área de ${agent.area_juridica}
5. Seja objetivo e direto
6. Use linguagem jurídica apropriada mas compreensível

${this.getAgentSpecificInstructions(agent.type)}
`;

    const conversationHistory = interactions.map(interaction => ({
      role: interaction.message.startsWith('Sistema:') ? 'assistant' : 'user',
      content: interaction.message.replace('Sistema: ', '')
    }));

    return {
      systemPrompt,
      conversationHistory
    };
  }

  /**
   * 🎯 Instruções específicas por tipo de agente
   */
  private getAgentSpecificInstructions(type: AgentType): string {
    switch (type) {
      case AgentType.SDR:
        return `
OBJETIVO: Qualificar o lead e identificar se há uma oportunidade real.

PERGUNTAS CHAVE:
- Qual é o problema jurídico específico?
- Qual a urgência da situação?
- Já tentou resolver antes?
- Qual o orçamento disponível?
- Quando precisa de uma solução?

CRITÉRIOS DE QUALIFICAÇÃO:
- Lead tem problema real na sua área
- Tem urgência ou dor significativa
- Tem orçamento ou disposição para investir
- Está no momento certo para contratar

ESCALAÇÃO: Quando o lead estiver qualificado, passe para o Closer.
`;

      case AgentType.CLOSER:
        return `
OBJETIVO: Fechar o negócio e converter o lead em cliente.

FOCO:
- Apresentar proposta personalizada
- Negociar valores e condições
- Superar objeções
- Fechar o contrato

TÉCNICAS:
- Crie urgência apropriada
- Mostre valor e ROI
- Use prova social
- Ofereça garantias
- Facilite o processo de contratação

ESCALAÇÃO: Após fechamento, passe para Customer Success.
`;

      case AgentType.CS:
        return `
OBJETIVO: Garantir satisfação e sucesso do cliente.

FOCO:
- Onboarding eficiente
- Acompanhamento do caso
- Identificar oportunidades de upsell
- Garantir renovação

AÇÕES:
- Monitore progresso do caso
- Antecipe necessidades
- Resolva problemas rapidamente
- Identifique novos serviços
`;

      default:
        return '';
    }
  }

  /**
   * 📈 Verifica se deve escalar para próximo agente
   */
  private async shouldEscalate(
    agent: AgentConfig,
    message: string,
    response: string
  ): Promise<{ escalate: boolean; nextAgentType?: AgentType }> {
    // Analisa regras de escalação do agente
    for (const rule of agent.escalation_rules) {
      const hasKeywords = rule.trigger_keywords.some(keyword =>
        message.toLowerCase().includes(keyword.toLowerCase()) ||
        response.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasKeywords) {
        // Usa IA para confirmar se deve escalar
        const shouldEscalate = await this.analyzeEscalationNeed(
          agent,
          message,
          response,
          rule
        );

        if (shouldEscalate >= rule.confidence_threshold) {
          return {
            escalate: true,
            nextAgentType: rule.next_agent_type
          };
        }
      }
    }

    return { escalate: false };
  }

  /**
   * 🔄 Escala para próximo agente
   */
  private async escalateToNextAgent(leadId: string, nextAgentType: AgentType): Promise<void> {
    console.log(`🔄 Escalando lead ${leadId} para agente ${nextAgentType}`);

    // Busca dados do lead
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) return;

    // Encontra próximo agente
    const nextAgent = this.findBestAgent(nextAgentType, lead.area_juridica);
    
    if (!nextAgent) {
      console.error(`❌ Nenhum agente ${nextAgentType} disponível`);
      return;
    }

    // Atualiza conversa ativa
    this.activeConversations.set(leadId, nextAgent.id);

    // Registra escalação
    await this.logActivity(leadId, nextAgent.id, 'escalated', {
      from_agent_type: this.getAgentTypeFromId(this.activeConversations.get(leadId)),
      to_agent_type: nextAgentType
    });

    // Envia mensagem de transição
    const transitionMessage = await this.generateTransitionMessage(nextAgent, lead);
    await this.sendMessage(leadId, transitionMessage, 'system');
  }

  /**
   * 💾 Salva interação no banco
   */
  private async saveInteraction(
    leadId: string,
    agentId: string,
    message: string,
    response: string
  ): Promise<void> {
    await supabase
      .from('lead_interactions')
      .insert({
        lead_id: leadId,
        message,
        response,
        sentiment: await this.analyzeSentiment(message),
        tipo: 'message',
        metadata: {
          agent_id: agentId,
          confidence: 0.8,
          next_action: 'continue_conversation',
        },
        created_at: new Date().toISOString()
      });
  }

  /**
   * 📊 Atualiza status do lead baseado na conversa
   */
  private async updateLeadStatus(
    leadId: string,
    agent: AgentConfig,
    response: string
  ): Promise<void> {
    // Lógica para determinar novo status baseado no tipo de agente e resposta
    let newStatus: LeadStatus | null = null;

    if (agent.type === AgentType.SDR && response.includes('qualificado')) {
      newStatus = LeadStatus.QUALIFYING;
    } else if (agent.type === AgentType.CLOSER && response.includes('proposta')) {
      newStatus = LeadStatus.PROPOSAL_SENT;
    } else if (agent.type === AgentType.CLOSER && response.includes('contrato')) {
      newStatus = LeadStatus.CONTRACT_SIGNED;
    }

    if (newStatus) {
      await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);
    }
  }

  // 🛠️ MÉTODOS AUXILIARES

  private getAgentTypeDescription(type: AgentType): string {
    switch (type) {
      case AgentType.SDR: return 'Especialista em Qualificação de Leads';
      case AgentType.CLOSER: return 'Especialista em Fechamento de Negócios';
      case AgentType.CS: return 'Especialista em Sucesso do Cliente';
      default: return 'Assistente Jurídico';
    }
  }

  private mapDatabaseToConfig(agente: any): AgentConfig {
    return {
      id: agente.id,
      name: agente.nome,
      type: agente.tipo_agente as AgentType,
      area_juridica: agente.area_juridica,
      prompt_base: agente.prompt_base || '',
      personality: agente.parametros_avancados?.personality || 'Profissional e acessível',
      specialization: agente.parametros_avancados?.specialization || ['geral'],
      max_interactions: agente.parametros_avancados?.max_interactions || 50,
      escalation_rules: agente.parametros_avancados?.escalation_rules || [],
      active: agente.status === 'ativo'
    };
  }

  private async generateWelcomeMessage(agent: AgentConfig, lead: any): Promise<string> {
    // Implementar geração de mensagem de boas-vindas personalizada
    return `Olá ${lead.nome_completo}! Sou ${agent.name}, especialista em ${agent.area_juridica}. Como posso ajudá-lo hoje?`;
  }

  private async sendMessage(leadId: string, message: string, type: 'system' | 'agent'): Promise<void> {
    // Implementar envio via WhatsApp/Email/Chat
    console.log(`📤 Enviando mensagem para lead ${leadId}: ${message}`);
  }

  private async logActivity(leadId: string, agentId: string, action: string, metadata: any): Promise<void> {
    await supabase
      .from('agent_activities')
      .insert({
        lead_id: leadId,
        agent_id: agentId,
        action,
        metadata,
        created_at: new Date().toISOString()
      });
  }

  private async analyzeSentiment(message: string): Promise<number> {
    const systemPrompt =
      'Você é um classificador de sentimento. Responda APENAS com JSON válido no formato {"score":0.0} ' +
      'onde score varia de 0 (muito negativo) a 1 (muito positivo).';

    try {
      const { data, error } = await supabase.functions.invoke('chat-completion', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          model: DEFAULT_OPENAI_MODEL,
          temperature: 0
        }
      });

      if (error) {
        throw error;
      }

      const score = this.extractScoreFromReply(data?.reply);
      if (score === null) {
        throw new Error('Invalid sentiment score');
      }

      return score;
    } catch (error) {
      console.warn('[agent-engine] Sentiment analysis failed, using neutral fallback.');
      return 0.5;
    }
  }

  private extractScoreFromReply(reply: string | undefined | null): number | null {
    if (!reply) return null;

    try {
      const parsed = JSON.parse(reply) as { score?: number };
      if (typeof parsed.score === 'number') {
        return Math.max(0, Math.min(1, parsed.score));
      }
    } catch {
      // Fall through to regex parsing
    }

    const jsonScoreMatch = reply.match(/"score"\s*:\s*([01](?:\.\d+)?)/);
    const rawMatch = jsonScoreMatch ?? reply.match(/\b([01](?:\.\d+)?)\b/);
    if (!rawMatch || !rawMatch[1]) return null;

    const numeric = Number(rawMatch[1]);
    if (Number.isNaN(numeric)) return null;

    return Math.max(0, Math.min(1, numeric));
  }

  private async analyzeEscalationNeed(
    agent: AgentConfig,
    message: string,
    response: string,
    rule: EscalationRule
  ): Promise<number> {
    // Implementar análise de necessidade de escalação usando IA
    return 0.8; // Mock
  }

  private async generateTransitionMessage(agent: AgentConfig, lead: any): Promise<string> {
    return `Olá ${lead.nome_completo}! Agora você será atendido por ${agent.name}, nosso ${this.getAgentTypeDescription(agent.type)}.`;
  }

  private getAgentTypeFromId(agentId: string | undefined): AgentType | null {
    if (!agentId) return null;
    const agent = this.agents.get(agentId);
    return agent?.type || null;
  }
}

// 🚀 INSTÂNCIA GLOBAL DO MOTOR
export const agentEngine = new AgentEngine();
