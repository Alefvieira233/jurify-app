/**
 * 🚀 ENTERPRISE WHATSAPP INTEGRATION - SECURE CLIENT SERVICE
 *
 * Service client-side SEGURO para interação com WhatsApp.
 * Todas as mensagens são enviadas via Edge Function (Server-Side).
 *
 * ✅ SEGURANÇA: Credenciais nunca são expostas no client-side
 * ✅ CORREÇÃO: WA-001 e WA-002 resolvidos
 *
 * @version 2.0.0 - Secure Edition
 * @security Enterprise Grade
 */

import { supabase } from '@/integrations/supabase/client';

export interface SendMessageRequest {
  to: string;
  text: string;
  leadId?: string;
  conversationId?: string;
  tenantId?: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export class EnterpriseWhatsAppIntegration {
  private static instance: EnterpriseWhatsAppIntegration;

  private constructor() {
    // Sem configuração de credenciais no client-side!
    // Todas as credenciais estão seguras no Supabase Secrets
  }

  static getInstance(): EnterpriseWhatsAppIntegration {
    if (!EnterpriseWhatsAppIntegration.instance) {
      EnterpriseWhatsAppIntegration.instance = new EnterpriseWhatsAppIntegration();
    }
    return EnterpriseWhatsAppIntegration.instance;
  }

  /**
   * 📤 ENVIA MENSAGEM VIA WHATSAPP (Secure Server-Side)
   * @param to - Número de telefone no formato internacional (ex: 5511999999999)
   * @param text - Texto da mensagem
   * @param conversationId - ID da conversa (para salvar no BD)
   * @param leadId - ID do lead (opcional)
   * @returns Promise com resultado do envio
   */
  async sendMessage(
    to: string,
    text: string,
    conversationId?: string,
    leadId?: string
  ): Promise<SendMessageResponse> {
    console.log('📤 [EnterpriseWhatsApp] Enviando mensagem via Edge Function...');

    try {
      // Valida entrada
      if (!to || !text) {
        throw new Error('Número de telefone e texto são obrigatórios');
      }

      if (text.length > 4096) {
        throw new Error('Mensagem muito longa (máximo 4096 caracteres)');
      }

      // Chama Edge Function segura
      const { data, error } = await supabase.functions.invoke<SendMessageResponse>(
        'send-whatsapp-message',
        {
          body: {
            to,
            text,
            conversationId,
            leadId,
          } as SendMessageRequest,
        }
      );

      if (error) {
        console.error('❌ [EnterpriseWhatsApp] Erro ao enviar mensagem:', error);
        return {
          success: false,
          error: error.message || 'Erro ao enviar mensagem',
          timestamp: new Date().toISOString(),
        };
      }

      if (!data || !data.success) {
        console.error('❌ [EnterpriseWhatsApp] Falha no envio:', data?.error);
        return {
          success: false,
          error: data?.error || 'Falha ao enviar mensagem',
          timestamp: new Date().toISOString(),
        };
      }

      console.log('✅ [EnterpriseWhatsApp] Mensagem enviada:', data.messageId);
      return data;
    } catch (error: unknown) {
      console.error('❌ [EnterpriseWhatsApp] Erro na integração:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🧪 TESTE DE CONECTIVIDADE
   * Verifica se a Edge Function está acessível
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Tenta invocar a health-check function
      const { data, error } = await supabase.functions.invoke('health-check');

      if (error) {
        return {
          success: false,
          message: `Erro ao conectar com Edge Functions: ${error.message}`,
        };
      }

      if (data?.status === 'healthy') {
        return {
          success: true,
          message: 'Conexão com Edge Functions OK',
        };
      }

      return {
        success: false,
        message: 'Edge Functions não estão respondendo corretamente',
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: `Erro de conexão: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 📊 ESTATÍSTICAS DE USO
   * Busca estatísticas de uso do WhatsApp para o tenant atual
   */
  async getUsageStats(tenantId?: string): Promise<{
    totalMessages: number;
    messagesThisMonth: number;
    activeConversations: number;
  }> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Total de mensagens
      const { count: totalMessages } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true });

      // Mensagens deste mês
      const { count: messagesThisMonth } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Conversas ativas
      const { count: activeConversations } = await supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      return {
        totalMessages: totalMessages || 0,
        messagesThisMonth: messagesThisMonth || 0,
        activeConversations: activeConversations || 0,
      };
    } catch (error) {
      console.error('❌ [EnterpriseWhatsApp] Erro ao buscar estatísticas:', error);
      return {
        totalMessages: 0,
        messagesThisMonth: 0,
        activeConversations: 0,
      };
    }
  }
}

export const enterpriseWhatsApp = EnterpriseWhatsAppIntegration.getInstance();

// ✅ Helper seguro para compatibilidade
export async function sendEnterpriseWhatsAppMessage(
  to: string,
  text: string,
  conversationId?: string,
  leadId?: string
): Promise<boolean> {
  const result = await enterpriseWhatsApp.sendMessage(to, text, conversationId, leadId);
  return result.success;
}
