/**
 * 🚀 INTEGRAÇÃO WHATSAPP MULTIAGENTES - SPACEX ENTERPRISE
 * 
 * Integração completa do WhatsApp Business API com o sistema multiagentes.
 * Processa mensagens em tempo real e distribui para os agentes especializados.
 */

import { multiAgentSystem } from '@/lib/multiagents/MultiAgentSystem';
import { supabase } from '@/integrations/supabase/client';

// 🎯 TIPOS DE DADOS WHATSAPP
export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  type: 'text' | 'image' | 'document' | 'audio';
  metadata?: {
    name?: string;
    profile_name?: string;
    wa_id?: string;
  };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: WhatsAppMessage[];
        statuses?: any[];
      };
      field: string;
    }>;
  }>;
}

// 🚀 CLASSE PRINCIPAL DE INTEGRAÇÃO
export class WhatsAppMultiAgentIntegration {
  private static instance: WhatsAppMultiAgentIntegration;
  private accessToken: string;
  private phoneNumberId: string;
  private webhookVerifyToken: string;

  private constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('⚠️ WhatsApp credentials não configuradas');
    }
  }

  static getInstance(): WhatsAppMultiAgentIntegration {
    if (!WhatsAppMultiAgentIntegration.instance) {
      WhatsAppMultiAgentIntegration.instance = new WhatsAppMultiAgentIntegration();
    }
    return WhatsAppMultiAgentIntegration.instance;
  }

  // 🔐 Verifica webhook do WhatsApp
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      console.log('✅ Webhook WhatsApp verificado');
      return challenge;
    }
    console.log('❌ Falha na verificação do webhook');
    return null;
  }

  // 📨 Processa webhook recebido
  async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    console.log('📨 Processando webhook WhatsApp:', JSON.stringify(payload, null, 2));

    try {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              await this.processIncomingMessage(message);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      throw error;
    }
  }

  // 📥 Processa mensagem recebida
  private async processIncomingMessage(message: WhatsAppMessage): Promise<void> {
    console.log('📥 Mensagem WhatsApp recebida:', message);

    try {
      // Verifica se é mensagem de texto
      if (message.type !== 'text') {
        await this.sendMessage(
          message.from,
          'Desculpe, atualmente só processamos mensagens de texto. Por favor, descreva sua necessidade jurídica.'
        );
        return;
      }

      const tenantId = this.resolveTenantId(message);
      if (!tenantId) {
        console.error('Tenant ID nao resolvido para mensagem WhatsApp');
        await this.sendMessage(
          message.from,
          'Nao foi possivel identificar seu atendimento no momento. Nossa equipe vai entrar em contato em breve.'
        );
        return;
      }

      // Busca ou cria lead
      const leadData = await this.getOrCreateLead(message, tenantId);

      // Salva mensagem no histórico
      await this.saveMessageHistory(message, leadData.id, tenantId);

      // Processa via sistema multiagentes
      await multiAgentSystem.processLead(leadData, message.text, 'whatsapp');

      console.log('✅ Mensagem processada pelo sistema multiagentes');

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      
      // Envia mensagem de erro para o usuário
      await this.sendMessage(
        message.from,
        'Desculpe, ocorreu um erro interno. Nossa equipe foi notificada e entraremos em contato em breve.'
      );
    }
  }

  private resolveTenantId(message: WhatsAppMessage): string | null {
    return (message.metadata as any)?.tenant_id || (message.metadata as any)?.tenantId || null;
  }

  // 👤 Busca ou cria lead baseado na mensagem
  private async getOrCreateLead(message: WhatsAppMessage, tenantId: string): Promise<any> {
    const phone = message.from;
    const name = message.metadata?.profile_name || message.metadata?.name || `Cliente ${phone.slice(-4)}`;

    // Busca lead existente
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', phone)
      .eq('tenant_id', tenantId)
      .single();

    if (existingLead) {
      console.log('👤 Lead existente encontrado:', existingLead.id);
      return existingLead;
    }

    // Cria novo lead
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        nome: name,
        telefone: phone,
        descricao: message.text,
        area_juridica: 'Nao informado',
        origem: 'WhatsApp',
        status: 'novo_lead',
        tenant_id: tenantId,
        metadata: {
          wa_id: message.metadata?.wa_id,
          first_message: message.text,
          first_contact: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar lead:', error);
      throw error;
    }

    console.log('✅ Novo lead criado:', newLead.id);
    return newLead;
  }

  // 💾 Salva histórico de mensagens
  private async saveMessageHistory(message: WhatsAppMessage, leadId: string, tenantId: string): Promise<void> {
    await supabase
      .from('lead_interactions')
      .insert({
        lead_id: leadId,
        message: 'Mensagem recebida via WhatsApp',
        response: message.text,
        channel: 'whatsapp',
        tenant_id: tenantId,
        tipo: 'message',
        metadata: {
          agent_id: 'whatsapp_incoming',
          whatsapp_message_id: message.id,
          from: message.from,
          timestamp: message.timestamp,
          type: message.type
        
        },
        created_at: new Date().toISOString()
      });
  }

  // 📤 Envia mensagem via WhatsApp
  async sendMessage(to: string, text: string, leadId?: string): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.error('❌ Credenciais WhatsApp não configuradas');
      return false;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: {
              body: text
            }
          })
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Mensagem WhatsApp enviada:', result.messages?.[0]?.id);

        // Salva no histórico se tiver leadId
        if (leadId) {
          const { data: leadRecord } = await supabase
            .from('leads')
            .select('tenant_id')
            .eq('id', leadId)
            .single();

          await supabase
            .from('lead_interactions')
            .insert({
              lead_id: leadId,
              message: 'Mensagem enviada via WhatsApp',
              response: text,
              channel: 'whatsapp',
              tenant_id: leadRecord?.tenant_id || null,
              tipo: 'message',
              metadata: {
                agent_id: 'whatsapp_outgoing',
                whatsapp_message_id: result.messages?.[0]?.id,
                to: to,
                sent_at: new Date().toISOString()
              },
              created_at: new Date().toISOString()
            });
        }

        return true;
      } else {
        console.error('❌ Erro ao enviar mensagem WhatsApp:', result);
        return false;
      }

    } catch (error) {
      console.error('❌ Erro na API WhatsApp:', error);
      return false;
    }
  }

  // 📋 Envia mensagem formatada com template
  async sendTemplateMessage(
    to: string,
    templateName: string,
    parameters: string[],
    leadId?: string
  ): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.error('❌ Credenciais WhatsApp não configuradas');
      return false;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
              name: templateName,
              language: {
                code: 'pt_BR'
              },
              components: [
                {
                  type: 'body',
                  parameters: parameters.map(param => ({
                    type: 'text',
                    text: param
                  }))
                }
              ]
            }
          })
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Template WhatsApp enviado:', result.messages?.[0]?.id);
        return true;
      } else {
        console.error('❌ Erro ao enviar template:', result);
        return false;
      }

    } catch (error) {
      console.error('❌ Erro no template WhatsApp:', error);
      return false;
    }
  }

  // 📊 Obtém estatísticas do WhatsApp
  async getWhatsAppStats(): Promise<any> {
    const { data: messages } = await supabase
      .from('lead_interactions')
      .select('*')
      
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const incoming = messages?.filter(m => m.metadata?.agent_id === 'whatsapp_incoming').length || 0;
    const outgoing = messages?.filter(m => m.metadata?.agent_id === 'whatsapp_outgoing').length || 0;

    return {
      messages_received_24h: incoming,
      messages_sent_24h: outgoing,
      total_conversations: incoming > 0 ? Math.ceil(incoming / 3) : 0, // Estimativa
      response_rate: incoming > 0 ? ((outgoing / incoming) * 100).toFixed(1) : 0
    };
  }
}

// 🚀 INSTÂNCIA GLOBAL
export const whatsAppMultiAgent = WhatsAppMultiAgentIntegration.getInstance();

// 🔧 FUNÇÕES AUXILIARES PARA API ROUTES

// Função para verificar webhook (GET)
export function verifyWhatsAppWebhook(
  mode: string,
  token: string,
  challenge: string
): string | null {
  return whatsAppMultiAgent.verifyWebhook(mode, token, challenge);
}

// Função para processar webhook (POST)
export async function processWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  return whatsAppMultiAgent.processWebhook(payload);
}

// Função para enviar mensagem
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  leadId?: string
): Promise<boolean> {
  return whatsAppMultiAgent.sendMessage(to, text, leadId);
}
