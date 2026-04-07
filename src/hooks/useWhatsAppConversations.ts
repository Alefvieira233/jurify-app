/** Manages WhatsApp conversations: listing, filtering, real-time updates, and message sending. */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

const log = createLogger('WhatsApp');

export interface WhatsAppConversation {
  id: string;
  lead_id: string | null;
  tenant_id: string;
  user_id: string | null;
  responsavel_id: string | null;
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
  agent_status?: 'idle' | 'processing' | 'failed' | 'waiting_human';
  last_agent_error?: string | null;
  agent_processed_at?: string | null;
}

export type MessageSendStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';

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
  send_status?: MessageSendStatus;
  send_error?: string | null;
  processed_by_agent?: boolean;
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
  sendMedia: (conversationId: string, file: File, mediaType: 'image' | 'audio' | 'document') => Promise<boolean>;
  markAsRead: (conversationId: string) => Promise<void>;
  toggleIA: (conversationId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
}

export const useWhatsAppConversations = (): UseWhatsAppConversationsReturn => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.whatsappConversations.list(profile?.tenant_id),
    queryFn: async () => {
      log.debug('Carregando conversas');
      setError(null);

      let query = supabase
        .from('whatsapp_conversations')
        .select('id, lead_id, tenant_id, user_id, responsavel_id, phone_number, contact_name, status, area_juridica, last_message, last_message_at, unread_count, ia_active, created_at, updated_at, agent_status, last_agent_error, agent_processed_at')
        .order('last_message_at', { ascending: false });

      if (profile?.tenant_id) {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      log.debug(`${data?.length || 0} conversas carregadas`);
      return (data || []) as WhatsAppConversation[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    meta: {
      onError: (err: unknown) => {
        setError(toUserMessage(err));
      },
    },
  });

  const MESSAGE_PAGE_SIZE = 50;

  // Fetch mensagens de uma conversa especifica (paginado)
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      log.debug(`Carregando mensagens da conversa ${conversationId}`);

      let msgsQuery = supabase
        .from('whatsapp_messages')
        .select('id, conversation_id, sender, content, message_type, media_url, read, timestamp, created_at, send_status, send_error, processed_by_agent')
        .eq('conversation_id', conversationId);

      if (profile?.tenant_id) {
        msgsQuery = msgsQuery.eq('tenant_id', profile.tenant_id);
      }

      const { data, error: fetchError } = await msgsQuery
        .order('timestamp', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (fetchError) throw fetchError;

      // Reverse to show oldest first in UI
      const msgs = (data || []) as unknown as WhatsAppMessage[];
      setMessages(msgs.reverse());
      setHasMoreMessages(msgs.length === MESSAGE_PAGE_SIZE);
      log.debug(`${data?.length || 0} mensagens carregadas`);
    } catch (err: unknown) {
      log.error('Erro ao carregar mensagens', err);
      toast({
        title: 'Erro ao carregar mensagens',
        description: toUserMessage(err),
        variant: 'destructive',
      });
    }
  }, [toast, profile?.tenant_id]);

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
        }
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

      // Refresh messages
      void fetchMessages(conversationId);
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
  }, [toast, fetchMessages]);

  // Marcar como lido
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!profile?.tenant_id) return;
    try {
      await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId)
        .eq('tenant_id', profile.tenant_id);

      let readQuery = supabase
        .from('whatsapp_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('read', false);

      if (profile?.tenant_id) {
        readQuery = readQuery.eq('tenant_id', profile.tenant_id);
      }

      await readQuery;

      // Optimistic update in cache
      queryClient.setQueryData<WhatsAppConversation[]>(
        ['whatsapp-conversations', profile.tenant_id],
        (prev) => (prev || []).map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (err: unknown) {
      log.error('Erro ao marcar como lido', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar mensagens como lidas.',
        variant: 'destructive',
      });
    }
  }, [toast, profile?.tenant_id, queryClient]);

  // Toggle IA on/off for a conversation
  const toggleIA = useCallback(async (conversationId: string) => {
    if (!profile?.tenant_id) return;
    try {
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) return;

      const newValue = !conv.ia_active;

      await supabase
        .from('whatsapp_conversations')
        .update({ ia_active: newValue })
        .eq('id', conversationId)
        .eq('tenant_id', profile.tenant_id);

      // Optimistic update in cache
      queryClient.setQueryData<WhatsAppConversation[]>(
        ['whatsapp-conversations', profile.tenant_id],
        (prev) => (prev || []).map(c =>
          c.id === conversationId ? { ...c, ia_active: newValue } : c
        )
      );

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, ia_active: newValue } : prev);
      }

      toast({
        title: newValue ? 'IA Ativada' : 'IA Desativada',
        description: newValue
          ? 'A IA voltará a responder automaticamente nesta conversa.'
          : 'A IA foi desativada. Você está atendendo esta conversa manualmente.',
      });
    } catch (err: unknown) {
      log.error('Erro ao alternar IA', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível alternar o estado da IA.',
        variant: 'destructive',
      });
    }
  }, [conversations, selectedConversation?.id, toast, profile?.tenant_id, queryClient]);

  // Channel de conversas -- nao depende de selectedConversation, nao e recriado ao trocar de conversa
  useEffect(() => {
    if (!user) return undefined;

    const tenantFilter = profile?.tenant_id
      ? `tenant_id=eq.${profile.tenant_id}`
      : undefined;

    const conversationsChannel = supabase
      .channel('whatsapp_conversations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations', ...(tenantFilter ? { filter: tenantFilter } : {}) },
        (payload) => {
          log.debug('Mudança em conversa', { event: payload.eventType });
          queryClient.setQueryData<WhatsAppConversation[]>(
            ['whatsapp-conversations', profile?.tenant_id],
            (prev) => {
              if (!prev) return prev;
              if (payload.eventType === 'INSERT') {
                return [payload.new as WhatsAppConversation, ...prev];
              } else if (payload.eventType === 'UPDATE') {
                return prev.map(conv =>
                  conv.id === payload.new.id ? (payload.new as WhatsAppConversation) : conv
                );
              } else if (payload.eventType === 'DELETE') {
                return prev.filter(conv => conv.id !== payload.old.id);
              }
              return prev;
            }
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(conversationsChannel);
    };
  }, [user, profile?.tenant_id, queryClient]);

  // Channel de mensagens -- recriado apenas quando a conversa selecionada muda
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

  // Auto-select first conversation (evitar race condition)
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation && !hasAutoSelectedRef.current) {
      const first = conversations[0];
      if (first) selectConversation(first.id);
      hasAutoSelectedRef.current = true;
    }
  }, [conversations, selectedConversation, selectConversation]);

  const fetchConversations = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversations.list(profile?.tenant_id) });
    } catch (err: unknown) {
      const sanitized = toUserMessage(err);
      log.error('Erro ao carregar conversas', err);
      setError(sanitized);
      toast({
        title: 'Erro ao carregar conversas',
        description: sanitized,
        variant: 'destructive',
      });
    }
  }, [queryClient, profile?.tenant_id, toast]);

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
    sendMedia,
    markAsRead,
    toggleIA,
    fetchConversations,
  };
};
