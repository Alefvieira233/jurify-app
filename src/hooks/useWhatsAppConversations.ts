import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
      console.log('📞 [useWhatsAppConversations] Carregando conversas...');
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
      console.log(`✅ [useWhatsAppConversations] ${data?.length || 0} conversas carregadas`);
    } catch (err: any) {
      console.error('❌ [useWhatsAppConversations] Erro ao carregar conversas:', err);
      setError(err.message || 'Erro ao carregar conversas');
      toast({
        title: 'Erro ao carregar conversas',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile?.tenant_id, toast]);

  // Fetch mensagens de uma conversa específica
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      console.log(`💬 [useWhatsAppConversations] Carregando mensagens da conversa ${conversationId}...`);

      const { data, error: fetchError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (fetchError) throw fetchError;

      setMessages(data || []);
      console.log(`✅ [useWhatsAppConversations] ${data?.length || 0} mensagens carregadas`);
    } catch (err: any) {
      console.error('❌ [useWhatsAppConversations] Erro ao carregar mensagens:', err);
      toast({
        title: 'Erro ao carregar mensagens',
        description: err.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Selecionar conversa
  const selectConversation = useCallback((id: string) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setSelectedConversation(conversation);
      fetchMessages(id);
    }
  }, [conversations, fetchMessages]);

  // Enviar mensagem
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    sender: 'agent'
  ): Promise<boolean> => {
    try {
      // 1. Busca informações da conversa para obter o número do lead
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('phone_number, lead_id, tenant_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        throw new Error('Conversa não encontrada');
      }

      // 2. Envia mensagem via WhatsApp API (Edge Function)
      console.log('📤 [useWhatsAppConversations] Enviando mensagem via WhatsApp API...');
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
        console.error('❌ [useWhatsAppConversations] Erro ao enviar via API:', sendError);
        throw new Error(sendError.message || 'Erro ao enviar mensagem via WhatsApp');
      }

      if (!sendResult?.success) {
        throw new Error(sendResult?.error || 'Falha ao enviar mensagem via WhatsApp');
      }

      console.log('✅ [useWhatsAppConversations] Mensagem enviada via WhatsApp:', sendResult.messageId);

      // 3. A Edge Function já salva a mensagem no banco, mas vamos garantir que a UI atualize
      // Atualizar última mensagem da conversa (caso a Edge Function não tenha feito)
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
    } catch (err: any) {
      console.error('❌ [useWhatsAppConversations] Erro ao enviar mensagem:', err);
      toast({
        title: 'Erro ao enviar mensagem',
        description: err.message || 'Erro ao processar mensagem',
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
    } catch (err: any) {
      console.error('❌ [useWhatsAppConversations] Erro ao marcar como lido:', err);
      // ✅ CORREÇÃO: Adicionar toast de erro
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar mensagens como lidas.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // ✅ CORREÇÃO: Realtime subscriptions com cleanup adequado e filtros
  useEffect(() => {
    if (!user) return undefined;

    let conversationsChannel: RealtimeChannel | null = null;
    let messagesChannel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      // ✅ CORREÇÃO: Limpar channels anteriores para evitar memory leak
      if (conversationsChannel) {
        await conversationsChannel.unsubscribe();
        conversationsChannel = null;
      }
      if (messagesChannel) {
        await messagesChannel.unsubscribe();
        messagesChannel = null;
      }

      // Subscribe a mudanças em conversas
      conversationsChannel = supabase
        .channel('whatsapp_conversations_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_conversations',
          },
          (payload) => {
            console.log('🔄 [useWhatsAppConversations] Mudança em conversa:', payload);

            if (payload.eventType === 'INSERT') {
              setConversations(prev => [payload.new as WhatsAppConversation, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setConversations(prev =>
                prev.map(conv =>
                  conv.id === payload.new.id
                    ? (payload.new as WhatsAppConversation)
                    : conv
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setConversations(prev => prev.filter(conv => conv.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      // ✅ CORREÇÃO: Subscribe a mudanças em mensagens COM FILTRO
      // Só recebe mensagens da conversa selecionada
      if (selectedConversation) {
        messagesChannel = supabase
          .channel(`whatsapp_messages_${selectedConversation.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'whatsapp_messages',
              filter: `conversation_id=eq.${selectedConversation.id}`, // ✅ FILTRO adicionado
            },
            (payload) => {
              console.log('🔄 [useWhatsAppConversations] Nova mensagem:', payload);

              if (payload.eventType === 'INSERT') {
                const newMessage = payload.new as WhatsAppMessage;
                setMessages(prev => [...prev, newMessage]);
              }
            }
          )
          .subscribe();
      }
    };

    setupRealtime();

    return () => {
      // ✅ CORREÇÃO: Cleanup assíncrono adequado
      const cleanup = async () => {
        if (conversationsChannel) {
          await conversationsChannel.unsubscribe();
        }
        if (messagesChannel) {
          await messagesChannel.unsubscribe();
        }
      };
      cleanup();
    };
  }, [user, selectedConversation]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ✅ CORREÇÃO: Auto-select first conversation (evitar race condition)
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation && !hasAutoSelectedRef.current) {
      selectConversation(conversations[0].id);
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
    selectedConversation,
    selectConversation,
    sendMessage,
    markAsRead,
    fetchConversations,
  };
};
