import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('WhatsApp');

export interface WhatsAppConversation {
  id: string;
  lead_id: string | null;
  tenant_id: string;
  user_id: string | null;
  phone_number: string;
  contact_name: string | null;
  status: 'ativo' | 'aguardando' | 'qualificado' | 'finalizado';
  area_juridica: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  ia_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  sender: 'lead' | 'ia' | 'agent';
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio';
  media_url: string | null;
  read: boolean;
  timestamp: string;
  created_at: string;
}

interface UseWhatsAppConversationsReturn {
  conversations: WhatsAppConversation[];
  messages: WhatsAppMessage[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  hasMoreMessages: boolean;
  selectedConversation: WhatsAppConversation | null;
  selectConversation: (id: string) => void;
  sendMessage: (conversationId: string, content: string, sender: 'agent') => Promise<boolean>;
  markAsRead: (conversationId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
}

export const useWhatsAppConversations = (): UseWhatsAppConversationsReturn => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch conversas
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      log.debug('Carregando conversas');
      setLoading(true);
      setError(null);

      let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (profile?.tenant_id) {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setConversations(data || []);
      log.debug(`${data?.length || 0} conversas carregadas`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar conversas';
      log.error('Erro ao carregar conversas', err);
      setError(message);
      toast({
        title: 'Erro ao carregar conversas',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile?.tenant_id, toast]);

  const MESSAGE_PAGE_SIZE = 50;

  // Fetch mensagens de uma conversa específica (paginado)
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      log.debug(`Carregando mensagens da conversa ${conversationId}`);

      const { data, error: fetchError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (fetchError) throw fetchError;

      // Reverse to show oldest first in UI
      setMessages((data || []).reverse());
      setHasMoreMessages(data.length === MESSAGE_PAGE_SIZE);
      log.debug(`${data?.length || 0} mensagens carregadas`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar mensagens';
      log.error('Erro ao carregar mensagens', err);
      toast({
        title: 'Erro ao carregar mensagens',
        description: message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Selecionar conversa
  const selectConversation = useCallback((id: string) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setSelectedConversation(conversation);
      void fetchMessages(id);
    }
  }, [conversations, fetchMessages]);

  // Enviar mensagem
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    _sender: 'agent'
  ): Promise<boolean> => {
    try {
      // 1. Busca informaÃ§Ãµes da conversa para obter o nÃºmero do lead
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('phone_number, lead_id, tenant_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        throw new Error('Conversa nÃ£o encontrada');
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
        }
      );

      if (sendError) {
        log.error('Erro ao enviar via API', sendError);
        throw new Error(sendError.message || 'Erro ao enviar mensagem via WhatsApp');
      }

      if (!sendResult?.success) {
        throw new Error(sendResult?.error || 'Falha ao enviar mensagem via WhatsApp');
      }

      log.info('Mensagem enviada via WhatsApp', { messageId: sendResult.messageId });

      // 3. A Edge Function jÃ¡ salva a mensagem no banco, mas vamos garantir que a UI atualize
      // Atualizar Ãºltima mensagem da conversa (caso a Edge Function nÃ£o tenha feito)
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada via WhatsApp com sucesso',
      });

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao processar mensagem';
      log.error('Erro ao enviar mensagem', err);
      toast({
        title: 'Erro ao enviar mensagem',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Marcar como lido
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      await supabase
        .from('whatsapp_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('read', false);

      // Atualizar estado local
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (err: unknown) {
      log.error('Erro ao marcar como lido', err);
      // âœ… CORREÃ‡ÃƒO: Adicionar toast de erro
      toast({
        title: 'Erro',
        description: 'NÃ£o foi possÃ­vel marcar mensagens como lidas.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Channel de conversas — não depende de selectedConversation, não é recriado ao trocar de conversa
  useEffect(() => {
    if (!user) return undefined;

    const conversationsChannel = supabase
      .channel('whatsapp_conversations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations' },
        (payload) => {
          log.debug('Mudança em conversa', { event: payload.eventType });
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as WhatsAppConversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(conv =>
                conv.id === payload.new.id ? (payload.new as WhatsAppConversation) : conv
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(conv => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(conversationsChannel);
    };
  }, [user]);

  // Channel de mensagens — recriado apenas quando a conversa selecionada muda
  useEffect(() => {
    if (!user || !selectedConversation) return undefined;

    const messagesChannel = supabase
      .channel(`whatsapp_messages_${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          log.debug('Nova mensagem recebida');
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new as WhatsAppMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(messagesChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedConversation?.id is intentional: re-run only when ID changes, not when other props update
  }, [user, selectedConversation?.id]);

  // Initial load
  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // âœ… CORREÃ‡ÃƒO: Auto-select first conversation (evitar race condition)
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation && !hasAutoSelectedRef.current) {
      const first = conversations[0];
      if (first) selectConversation(first.id);
      hasAutoSelectedRef.current = true;
    }
  }, [conversations, selectedConversation, selectConversation]);

  const isEmpty = conversations.length === 0;

  return {
    conversations,
    messages,
    loading,
    error,
    isEmpty,
    hasMoreMessages,
    selectedConversation,
    selectConversation,
    sendMessage,
    markAsRead,
    fetchConversations,
  };
};
