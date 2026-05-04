/** Manages WhatsApp conversations: listing, filtering, real-time updates, and message sending. */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';
import { useWhatsAppMessaging } from '@/hooks/useWhatsAppMessaging';
import type {
  WhatsAppConversation,
  WhatsAppMessage,
  MessageSendStatus,
} from '@/hooks/useWhatsAppConversationsTypes';

// Re-export types so existing consumers keep working (external imports target this module).
export type { WhatsAppConversation, WhatsAppMessage, MessageSendStatus };

const log = createLogger('WhatsApp');

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
  const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();

  const visibilityScope = getLeadVisibilityScope();
  const userDepartmentIds = getUserDepartamentos();

  // Fetch profile_ids of all members in the user's departments (for 'department' scope filtering)
  const { data: departmentMemberIds = [] } = useQuery({
    queryKey: ['department-member-ids', ...userDepartmentIds],
    queryFn: async (): Promise<string[]> => {
      if (userDepartmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('departamento_membros')
        .select('profile_id')
        .in('departamento_id', userDepartmentIds);
      if (error) throw error;
      return (data ?? []).map((m: { profile_id: string }) => m.profile_id);
    },
    enabled: visibilityScope === 'department' && userDepartmentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawConversations = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.whatsappConversations.list(profile?.tenant_id),
    queryFn: async () => {
      log.debug('Carregando conversas');
      setError(null);

      let query = supabase
        .from('whatsapp_conversations')
        .select('id, lead_id, tenant_id, user_id, responsavel_id, phone_number, contact_name, status, area_juridica, last_message, last_message_at, unread_count, ia_active, created_at, updated_at, agent_status, last_agent_error, agent_processed_at, current_urgency, current_sentiment, last_inbound_at')
        .order('last_message_at', { ascending: false })
        .limit(500);

      if (profile?.tenant_id) {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      // For 'own' scope, filter at query level: only conversations assigned to the current user or unassigned
      if (visibilityScope === 'own' && user?.id) {
        query = query.or(`user_id.eq.${user.id},responsavel_id.eq.${user.id},user_id.is.null`);
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

  // Apply visibility filtering (covers both initial fetch and realtime inserts):
  // - 'all': no filtering (admin/manager sees everything in tenant)
  // - 'own': only conversations assigned to the current user or unassigned
  // - 'department': conversations where responsavel_id or user_id belongs to a department
  //   colleague, or the conversation is unassigned
  const conversations = useMemo(() => {
    if (visibilityScope === 'all') return rawConversations;

    if (visibilityScope === 'own') {
      const uid = user?.id;
      if (!uid) return rawConversations;
      return rawConversations.filter((conv) =>
        conv.user_id === uid || conv.responsavel_id === uid || (!conv.user_id && !conv.responsavel_id)
      );
    }

    // 'department' scope
    if (departmentMemberIds.length === 0) return rawConversations;
    const memberSet = new Set(departmentMemberIds);
    return rawConversations.filter((conv) => {
      // Unassigned conversations are visible to department members
      if (!conv.user_id && !conv.responsavel_id) return true;
      // Conversations assigned to a department colleague
      if (conv.user_id && memberSet.has(conv.user_id)) return true;
      if (conv.responsavel_id && memberSet.has(conv.responsavel_id)) return true;
      return false;
    });
  }, [rawConversations, visibilityScope, departmentMemberIds, user?.id]);

  const MESSAGE_PAGE_SIZE = 50;

  // Fetch mensagens de uma conversa especifica (paginado)
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      log.debug(`Carregando mensagens da conversa ${conversationId}`);

      let msgsQuery = supabase
        .from('whatsapp_messages')
        .select('id, conversation_id, sender, content, message_type, media_url, read, timestamp, created_at, send_status, send_error, processed_by_agent, provider_message_id, pinned, pinned_at')
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

  // Message sending (text + media) — delegated to cohesive sub-hook.
  // sendMedia needs to refresh messages after upload; hand it the fetcher via callback.
  const { sendMessage, sendMedia } = useWhatsAppMessaging({
    onMediaSent: (conversationId) => {
      void fetchMessages(conversationId);
    },
  });

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

      // 👁️ Fire-and-forget: marca como lido na Meta API (✓✓ azul pro cliente)
      void supabase.functions.invoke('whatsapp-mark-read', {
        body: { conversationId },
      }).catch((e) => log.warn('whatsapp-mark-read failed (non-critical)', { error: String(e) }));
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
