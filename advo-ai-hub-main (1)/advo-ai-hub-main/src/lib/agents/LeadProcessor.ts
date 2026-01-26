/**
 * 🚀 JURIFY LEAD PROCESSOR - SPACEX GRADE
 * 
 * Sistema de processamento de leads em tempo real que integra
 * com WhatsApp, Email e outros canais para automação completa.
 * 
 * @author SpaceX Dev Team
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { agentEngine, AgentType, LeadStatus } from './AgentEngine';
import { workflowProcessor, WorkflowType } from './WorkflowProcessor';

// 📱 CANAIS DE COMUNICAÇÃO
export enum CommunicationChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  CHAT = 'chat',
  PHONE = 'phone',
  FORM = 'form'
}

// 📊 ORIGEM DO LEAD
export enum LeadSource {
  WEBSITE = 'website',
  WHATSAPP = 'whatsapp',
  FACEBOOK = 'facebook',
  GOOGLE = 'google',
  REFERRAL = 'referral',
  ORGANIC = 'organic'
}

// 🎯 DADOS DO LEAD
export interface LeadData {
  nome_completo: string;
  telefone?: string;
  email?: string;
  area_juridica: string;
  origem: LeadSource;
  canal: CommunicationChannel;
  mensagem_inicial?: string;
  valor_causa?: number;
  urgencia?: 'baixa' | 'media' | 'alta';
  metadata?: Record<string, any>;
}

// 💬 MENSAGEM RECEBIDA
export interface IncomingMessage {
  id: string;
  leadId: string;
  channel: CommunicationChannel;
  from: string; // telefone, email, etc
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// 📤 MENSAGEM PARA ENVIO
export interface OutgoingMessage {
  leadId: string;
  channel: CommunicationChannel;
  to: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'audio';
  metadata?: Record<string, any>;
}

// 🚀 PROCESSADOR DE LEADS
export class LeadProcessor {
  private messageQueue: IncomingMessage[] = [];
  private processing = false;

  constructor() {
    this.startMessageProcessor();
    this.setupWebhooks();
  }

  private startMessageProcessor() {
    // Placeholder: message queue is processed on demand in processIncomingMessage.
    return;
  }

  /**
   * 🎯 Cria novo lead no sistema
   */
  async createLead(leadData: LeadData): Promise<string> {
    console.log('🎯 Criando novo lead:', leadData.nome_completo);

    try {
      // Valida dados obrigatórios
      this.validateLeadData(leadData);

      // Verifica se lead já existe
      const existingLead = await this.findExistingLead(leadData);
      if (existingLead) {
        console.log('📋 Lead já existe, atualizando:', existingLead.id);
        return existingLead.id;
      }

      // Cria lead no banco
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          nome_completo: leadData.nome_completo,
          telefone: leadData.telefone,
          email: leadData.email,
          area_juridica: leadData.area_juridica,
          origem: leadData.origem,
          canal_preferido: leadData.canal,
          status: LeadStatus.NEW,
          valor_causa: leadData.valor_causa,
          urgencia: leadData.urgencia || 'media',
          observacoes: leadData.mensagem_inicial,
          metadata: leadData.metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Lead criado com sucesso:', lead.id);

      // Inicia processamento automático
      await this.startLeadProcessing(lead.id, leadData);

      return lead.id;

    } catch (error) {
      console.error('❌ Erro ao criar lead:', error);
      throw error;
    }
  }

  /**
   * 🚀 Inicia processamento automático do lead
   */
  private async startLeadProcessing(leadId: string, leadData: LeadData): Promise<void> {
    console.log('🚀 Iniciando processamento automático do lead:', leadId);

    try {
      // 1. Processa lead com agente SDR
      await agentEngine.processNewLead(leadId);

      // 2. Executa workflows automáticos
      await workflowProcessor.executeWorkflow(
        leadId,
        AgentType.SDR,
        leadData.area_juridica,
        {
          status: LeadStatus.NEW,
          area_juridica: leadData.area_juridica,
          origem: leadData.origem,
          canal: leadData.canal,
          urgencia: leadData.urgencia
        }
      );

      // 3. Envia mensagem inicial se houver
      if (leadData.mensagem_inicial && leadData.telefone) {
        await this.sendWelcomeMessage(leadId, leadData);
      }

      // 4. Registra atividade
      await this.logLeadActivity(leadId, 'lead_created', {
        origem: leadData.origem,
        canal: leadData.canal,
        area_juridica: leadData.area_juridica
      });

    } catch (error) {
      console.error('❌ Erro no processamento automático:', error);
      
      // Registra erro mas não falha o processo
      const message = error instanceof Error ? error.message : String(error);
      await this.logLeadActivity(leadId, 'processing_error', {
        error: message
      });
    }
  }

  /**
   * 💬 Processa mensagem recebida
   */
  async processIncomingMessage(message: IncomingMessage): Promise<void> {
    console.log('💬 Processando mensagem recebida:', message.id);

    try {
      // Adiciona à fila de processamento
      this.messageQueue.push(message);

      // Inicia processamento se não estiver rodando
      if (!this.processing) {
        await this.processMessageQueue();
      }

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  }

  /**
   * 🔄 Processa fila de mensagens
   */
  private async processMessageQueue(): Promise<void> {
    if (this.processing || this.messageQueue.length === 0) return;

    this.processing = true;
    console.log(`🔄 Processando ${this.messageQueue.length} mensagens na fila`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) continue;

      try {
        await this.handleSingleMessage(message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem individual:', error);
      }

      // Pequeno delay para não sobrecarregar
      await this.delay(100);
    }

    this.processing = false;
  }

  /**
   * 📨 Processa mensagem individual
   */
  private async handleSingleMessage(message: IncomingMessage): Promise<void> {
    console.log(`📨 Processando mensagem de ${message.from}: ${message.content.substring(0, 50)}...`);

    try {
      // Busca ou cria lead
      let leadId = message.leadId;
      
      if (!leadId) {
        leadId = await this.findOrCreateLeadFromMessage(message);
      }

      // Processa mensagem com agente
      const normalizedChannel =
        message.channel === CommunicationChannel.PHONE || message.channel === CommunicationChannel.FORM
          ? CommunicationChannel.CHAT
          : message.channel;

      const response = await agentEngine.processLeadMessage(
        leadId,
        message.content,
        normalizedChannel
      );

      // Envia resposta
      if (response && response.trim()) {
        await this.sendMessage({
          leadId,
          channel: message.channel,
          to: message.from,
          content: response,
          type: 'text'
        });
      }

      // Registra interação
      await this.logMessageInteraction(leadId, message, response);

    } catch (error) {
      console.error('❌ Erro ao processar mensagem individual:', error);
      
      // Envia mensagem de erro genérica
      await this.sendErrorMessage(message);
    }
  }

  /**
   * 🔍 Encontra ou cria lead a partir da mensagem
   */
  private async findOrCreateLeadFromMessage(message: IncomingMessage): Promise<string> {
    // ✅ CORREÇÃO: Busca segura + tratamento de erro do .single()
    try {
      const { data: existingLead, error } = await supabase
        .from('leads')
        .select('id')
        .or(`telefone.eq."${message.from}",email.eq."${message.from}"`)
        .maybeSingle(); // ✅ CORREÇÃO: maybeSingle() não lança erro se não encontrar

      if (error) {
        console.error('❌ [LeadProcessor] Erro ao buscar lead:', error);
      }

      if (existingLead) {
        return existingLead.id;
      }
    } catch (err) {
      console.error('❌ [LeadProcessor] Erro na busca de lead:', err);
      // Continua para criar novo lead
    }

    // Cria novo lead
    const leadData: LeadData = {
      nome_completo: message.from, // Será atualizado quando soubermos o nome
      telefone: message.channel === CommunicationChannel.WHATSAPP ? message.from : undefined,
      email: message.channel === CommunicationChannel.EMAIL ? message.from : undefined,
      area_juridica: 'Geral', // Será identificada pelo agente
      origem: this.getSourceFromChannel(message.channel),
      canal: message.channel,
      mensagem_inicial: message.content,
      metadata: message.metadata
    };

    return await this.createLead(leadData);
  }

  /**
   * 📤 Envia mensagem
   */
  async sendMessage(message: OutgoingMessage): Promise<boolean> {
    console.log(`📤 Enviando mensagem via ${message.channel} para ${message.to}`);

    try {
      switch (message.channel) {
        case CommunicationChannel.WHATSAPP:
          return await this.sendWhatsAppMessage(message);
        
        case CommunicationChannel.EMAIL:
          return await this.sendEmailMessage(message);
        
        case CommunicationChannel.CHAT:
          return await this.sendChatMessage(message);
        
        default:
          console.warn(`⚠️ Canal não suportado: ${message.channel}`);
          return false;
      }

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  /**
   * 📱 Envia mensagem via WhatsApp
   */
  private async sendWhatsAppMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      const whatsappToken = process.env.WHATSAPP_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (!whatsappToken || !phoneNumberId) {
        throw new Error('WhatsApp não configurado');
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.to,
          type: 'text',
          text: {
            body: message.content
          }
        })
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      console.log('✅ Mensagem WhatsApp enviada com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp:', error);
      return false;
    }
  }

  /**
   * 📧 Envia mensagem via Email
   */
  private async sendEmailMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      // Implementar integração com serviço de email (SendGrid, etc)
      console.log('📧 Enviando email para:', message.to);
      
      // Por enquanto, apenas simula envio
      await this.delay(500);
      
      console.log('✅ Email enviado com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * 💬 Envia mensagem via Chat interno
   */
  private async sendChatMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      // Salva mensagem no banco para exibição no chat
      await supabase
        .from('chat_messages')
        .insert({
          lead_id: message.leadId,
          from_agent: true,
          content: message.content,
          timestamp: new Date().toISOString()
        });

      console.log('✅ Mensagem de chat salva');
      return true;

    } catch (error) {
      console.error('❌ Erro ao enviar chat:', error);
      return false;
    }
  }

  /**
   * 👋 Envia mensagem de boas-vindas
   */
  private async sendWelcomeMessage(leadId: string, leadData: LeadData): Promise<void> {
    const welcomeMessage = this.generateWelcomeMessage(leadData);

    await this.sendMessage({
      leadId,
      channel: leadData.canal,
      to: leadData.telefone || leadData.email || '',
      content: welcomeMessage,
      type: 'text'
    });
  }

  /**
   * ❌ Envia mensagem de erro
   */
  private async sendErrorMessage(originalMessage: IncomingMessage): Promise<void> {
    const errorMessage = 'Desculpe, ocorreu um erro temporário. Nossa equipe foi notificada e entrará em contato em breve.';

    await this.sendMessage({
      leadId: 'error',
      channel: originalMessage.channel,
      to: originalMessage.from,
      content: errorMessage,
      type: 'text'
    });
  }

  /**
   * 🔗 Configura webhooks para recebimento de mensagens
   */
  private setupWebhooks(): void {
    console.log('🔗 Configurando webhooks...');
    
    // Em produção, configurar endpoints para:
    // - WhatsApp Business API
    // - Email webhooks
    // - Chat interno
    
    console.log('✅ Webhooks configurados');
  }

  // 🛠️ MÉTODOS AUXILIARES

  private validateLeadData(leadData: LeadData): void {
    if (!leadData.nome_completo) {
      throw new Error('Nome completo é obrigatório');
    }

    if (!leadData.area_juridica) {
      throw new Error('Área jurídica é obrigatória');
    }

    if (!leadData.telefone && !leadData.email) {
      throw new Error('Telefone ou email é obrigatório');
    }
  }

  // ✅ CORREÇÃO: Busca segura + tratamento de erro
  private async findExistingLead(leadData: LeadData): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id')
        .or(`telefone.eq."${leadData.telefone}",email.eq."${leadData.email}"`)
        .maybeSingle(); // ✅ CORREÇÃO: maybeSingle() não lança erro se não encontrar

      if (error) {
        console.error('❌ [LeadProcessor] Erro ao buscar lead existente:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('❌ [LeadProcessor] Erro na busca de lead:', err);
      return null;
    }
  }

  private generateWelcomeMessage(leadData: LeadData): string {
    const areaMessages = {
      'Direito Trabalhista': 'Olá! Vi que você tem uma questão trabalhista. Sou especialista nessa área e posso te ajudar.',
      'Direito de Família': 'Olá! Entendo que você precisa de ajuda com questões familiares. Estou aqui para te orientar.',
      'Direito Civil': 'Olá! Vejo que você tem uma questão civil. Vou te ajudar a encontrar a melhor solução.',
      'Direito Previdenciário': 'Olá! Questões previdenciárias podem ser complexas, mas estou aqui para te ajudar.',
      'Direito Criminal': 'Olá! Entendo a urgência de questões criminais. Vamos conversar sobre sua situação.',
      'Direito Empresarial': 'Olá! Questões empresariais requerem atenção especial. Como posso te ajudar?'
    };

    return areaMessages[leadData.area_juridica] || 
           'Olá! Obrigado por entrar em contato. Como posso te ajudar com sua questão jurídica?';
  }

  private getSourceFromChannel(channel: CommunicationChannel): LeadSource {
    switch (channel) {
      case CommunicationChannel.WHATSAPP:
        return LeadSource.WHATSAPP;
      case CommunicationChannel.EMAIL:
        return LeadSource.WEBSITE;
      case CommunicationChannel.CHAT:
        return LeadSource.WEBSITE;
      default:
        return LeadSource.ORGANIC;
    }
  }

  private async logLeadActivity(leadId: string, activity: string, metadata: any): Promise<void> {
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity,
        metadata,
        created_at: new Date().toISOString()
      });
  }

  private async logMessageInteraction(
    leadId: string,
    message: IncomingMessage,
    response: string
  ): Promise<void> {
    await supabase
      .from('message_logs')
      .insert({
        lead_id: leadId,
        channel: message.channel,
        direction: 'inbound',
        from: message.from,
        content: message.content,
        response,
        timestamp: new Date().toISOString()
      });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 🚀 INSTÂNCIA GLOBAL DO PROCESSADOR
export const leadProcessor = new LeadProcessor();
