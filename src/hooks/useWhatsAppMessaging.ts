/**
 * Cohesive sub-hook for WhatsApp message sending (text + media).
 *
 * Extracted from useWhatsAppConversations to keep the main hook under 400 lines.
 * Both sendMessage and sendMedia call the same 'send-whatsapp-message' Edge
 * Function — grouping them here is the natural seam.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { createLogger } from '@/lib/logger';

const log = createLogger('WhatsApp');

interface UseWhatsAppMessagingOptions {
  onMediaSent?: (conversationId: string) => void;
}

interface UseWhatsAppMessagingReturn {
  sendMessage: (conversationId: string, content: string, sender: 'agent') => Promise<boolean>;
  sendMedia: (
    conversationId: string,
    file: File,
    mediaType: 'image' | 'audio' | 'document',
  ) => Promise<boolean>;
}

export const useWhatsAppMessaging = (
  options: UseWhatsAppMessagingOptions = {},
): UseWhatsAppMessagingReturn => {
  const { toast } = useToast();
  const { onMediaSent } = options;

  // Enviar mensagem
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    _sender: 'agent',
  ): Promise<boolean> => {
    try {
      // 1. Busca informacoes da conversa para obter o numero do lead
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('phone_number, lead_id, tenant_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (convError || !conversation) {
        throw new Error('Conversa não encontrada');
      }

      // 2. Envia mensagem via WhatsApp API (Edge Function)
      log.info('Enviando mensagem via WhatsApp API');
      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        'send-whatsapp-message',
        {
          body: {
            to: conversation.phone_number,
            text: content,
            conversationId: conversationId,
            leadId: conversation.lead_id,
            tenantId: conversation.tenant_id,
          },
        },
      );

      if (sendError) {
        log.error('Erro ao enviar via API', sendError);
        throw new Error(sendError.message || 'Erro ao enviar mensagem via WhatsApp');
      }

      if (!sendResult?.success) {
        throw new Error(sendResult?.error || 'Falha ao enviar mensagem via WhatsApp');
      }

      log.info('Mensagem enviada via WhatsApp', { messageId: sendResult.messageId });

      // 3. A Edge Function ja salva a mensagem no banco, mas vamos garantir que a UI atualize
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('tenant_id', conversation.tenant_id);

      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada via WhatsApp com sucesso',
      });

      return true;
    } catch (err: unknown) {
      log.error('Erro ao enviar mensagem', err);
      toast({
        title: 'Erro ao enviar mensagem',
        description: toUserMessage(err),
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Enviar midia (imagem, audio, documento)
  const sendMedia = useCallback(async (
    conversationId: string,
    file: File,
    mediaType: 'image' | 'audio' | 'document',
  ): Promise<boolean> => {
    try {
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('phone_number, lead_id, tenant_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (convError || !conversation) {
        throw new Error('Conversa não encontrada');
      }

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:...;base64, prefix
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      log.info(`Enviando ${mediaType} via WhatsApp API (${file.name}, ${(file.size / 1024).toFixed(0)}KB)`);

      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        'send-whatsapp-message',
        {
          body: {
            to: conversation.phone_number,
            text: '',
            mediaType,
            mediaBase64: base64,
            mimeType: file.type,
            fileName: file.name,
            caption: mediaType !== 'audio' ? file.name : undefined,
            conversationId,
            leadId: conversation.lead_id,
            tenantId: conversation.tenant_id,
          },
        },
      );

      if (sendError) {
        throw new Error(sendError.message || 'Erro ao enviar mídia via WhatsApp');
      }

      if (!sendResult?.success) {
        throw new Error(sendResult?.error || 'Falha ao enviar mídia');
      }

      const labelMap = { image: 'Imagem', audio: 'Áudio', document: 'Documento' };
      toast({
        title: `${labelMap[mediaType]} enviado(a)`,
        description: `${file.name} enviado via WhatsApp com sucesso`,
      });

      // Refresh messages via parent callback
      onMediaSent?.(conversationId);
      return true;
    } catch (err: unknown) {
      log.error('Erro ao enviar mídia', err);
      toast({
        title: 'Erro ao enviar mídia',
        description: toUserMessage(err),
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, onMediaSent]);

  return { sendMessage, sendMedia };
};
