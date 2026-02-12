/**
 * 🚀 INTEGRAÇÃO WHATSAPP MULTIAGENTES - CLIENT-SIDE SECURE SERVICE
 *
 * Serviço client-side que delega TODAS as operações para Edge Functions.
 * Nenhuma credencial é exposta no browser.
 *
 * - Envio de mensagens: via Edge Function `send-whatsapp-message`
 * - Recebimento: via Edge Function `whatsapp-webhook` (server-side only)
 * - Templates: via Edge Function `send-whatsapp-message`
 * - Estatísticas: via queries Supabase com RLS
 *
 * @version 3.0.0
 * @security Enterprise Grade - Zero credentials on client
 */

import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('WhatsApp');

// 🎯 TIPOS
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

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppStats {
  messages_received_24h: number;
  messages_sent_24h: number;
  total_conversations: number;
  active_conversations: number;
  response_rate: string;
}

// 🚀 CLASSE PRINCIPAL - SECURE CLIENT SERVICE
export class WhatsAppMultiAgentIntegration {
  private static instance: WhatsAppMultiAgentIntegration;

  private constructor() {
    // Sem credenciais no client-side - tudo via Edge Functions
    log.info('WhatsApp integration initialized (secure mode)');
  }

  static getInstance(): WhatsAppMultiAgentIntegration {
    if (!WhatsAppMultiAgentIntegration.instance) {
      WhatsAppMultiAgentIntegration.instance = new WhatsAppMultiAgentIntegration();
    }
    return WhatsAppMultiAgentIntegration.instance;
  }

  /**
   * 📤 Envia mensagem via Edge Function (seguro)
   */
  async sendMessage(to: string, text: string, leadId?: string, conversationId?: string): Promise<boolean> {
    try {
      if (!to || !text) {
        log.warn('sendMessage called with missing params', { to: !!to, text: !!text });
        return false;
      }

      log.debug('Sending message via Edge Function', { to, leadId });

      const { data, error } = await supabase.functions.invoke<{ success: boolean; messageId?: string; error?: string }>(
        'send-whatsapp-message',
        { body: { to, text, leadId, conversationId } }
      );

      if (error) {
        log.error('Edge Function error', error);
        return false;
      }

      if (data?.success) {
        log.info('Message sent', { messageId: data.messageId });
        return true;
      }

      log.warn('Message send failed', { error: data?.error });
      return false;
    } catch (error) {
      log.error('sendMessage exception', error);
      return false;
    }
  }

  /**
   * 📋 Envia template via Edge Function
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    parameters: string[],
    leadId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; error?: string }>(
        'send-whatsapp-message',
        {
          body: {
            to,
            text: `[TEMPLATE:${templateName}]`,
            leadId,
            template: { name: templateName, parameters },
          },
        }
      );

      if (error || !data?.success) {
        log.warn('Template send failed', { error: error?.message || data?.error });
        return false;
      }

      log.info('Template sent', { template: templateName, to });
      return true;
    } catch (error) {
      log.error('sendTemplateMessage exception', error);
      return false;
    }
  }

  /**
   * � Estatísticas do WhatsApp (via Supabase queries com RLS)
   */
  async getWhatsAppStats(): Promise<WhatsAppStats> {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalConversations },
        { count: activeConversations },
        { data: recentMessages },
      ] = await Promise.all([
        supabase.from('whatsapp_conversations').select('*', { count: 'exact', head: true }),
        supabase.from('whatsapp_conversations').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('whatsapp_messages').select('sender').gte('created_at', last24h),
      ]);

      const incoming = recentMessages?.filter(m => m.sender === 'lead').length ?? 0;
      const outgoing = recentMessages?.filter(m => m.sender === 'ia' || m.sender === 'agent').length ?? 0;

      return {
        messages_received_24h: incoming,
        messages_sent_24h: outgoing,
        total_conversations: totalConversations ?? 0,
        active_conversations: activeConversations ?? 0,
        response_rate: incoming > 0 ? ((outgoing / incoming) * 100).toFixed(1) : '0',
      };
    } catch (error) {
      log.error('getWhatsAppStats exception', error);
      return {
        messages_received_24h: 0,
        messages_sent_24h: 0,
        total_conversations: 0,
        active_conversations: 0,
        response_rate: '0',
      };
    }
  }

  /**
   * 🧪 Testa conectividade com as Edge Functions
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('health-check');

      if (error) {
        return { success: false, message: `Edge Function error: ${error.message}` };
      }

      if (data?.status === 'healthy') {
        return { success: true, message: 'WhatsApp integration healthy' };
      }

      return { success: false, message: data?.status || 'Unknown status' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, message: msg };
    }
  }
}

// 🚀 INSTÂNCIA GLOBAL
export const whatsAppMultiAgent = WhatsAppMultiAgentIntegration.getInstance();

// 🔧 HELPER FUNCTIONS (backward-compatible exports)
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  leadId?: string
): Promise<boolean> {
  return whatsAppMultiAgent.sendMessage(to, text, leadId);
}
