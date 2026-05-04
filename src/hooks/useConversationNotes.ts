import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ConversationNote {
  id: string;
  conversation_id: string;
  user_id: string | null;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useConversationNotes(conversationId: string | null | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery<ConversationNote[]>({
    queryKey: ['whatsapp', 'notes', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('whatsapp_conversation_notes')
        .select('id, conversation_id, user_id, content, pinned, created_at, updated_at')
        .eq('conversation_id', conversationId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConversationNote[];
    },
    enabled: !!conversationId,
    staleTime: 30 * 1000,
  });

  const create = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId || !user) throw new Error('Sem conversa selecionada');
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
      if (!tenantId) throw new Error('Tenant não encontrado');
      const { data, error } = await supabase
        .from('whatsapp_conversation_notes')
        .insert({ conversation_id: conversationId, tenant_id: tenantId, user_id: user.id, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'notes', conversationId] });
    },
    onError: (err: unknown) => toast({
      title: 'Erro ao adicionar nota',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });

  const update = useMutation({
    mutationFn: async ({ id, content, pinned }: { id: string; content?: string; pinned?: boolean }) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (content !== undefined) patch.content = content;
      if (pinned !== undefined) patch.pinned = pinned;
      const { error } = await supabase.from('whatsapp_conversation_notes').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'notes', conversationId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whatsapp_conversation_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'notes', conversationId] });
      toast({ title: 'Nota removida' });
    },
  });

  const pinned = (list.data ?? []).filter(n => n.pinned);
  const others = (list.data ?? []).filter(n => !n.pinned);

  return { items: list.data ?? [], pinned, others, isLoading: list.isLoading, create, update, remove };
}

export function useTogglePinMessage(conversationId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase.rpc('toggle_pin_whatsapp_message', { p_message_id: messageId });
      if (error) throw error;
      const result = data as { success: boolean; pinned?: boolean; error?: string; limit?: number };
      if (!result.success) {
        if (result.error === 'limit_reached') {
          throw new Error(`Limite de ${result.limit ?? 3} mensagens fixadas atingido. Desafixe alguma primeiro.`);
        }
        throw new Error(result.error || 'Falha ao fixar');
      }
      return result;
    },
    onSuccess: (data) => {
      if (conversationId) void qc.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
      toast({ title: data.pinned ? 'Mensagem fixada' : 'Mensagem desafixada' });
    },
    onError: (err: unknown) => toast({
      title: 'Erro',
      description: err instanceof Error ? err.message : 'Erro desconhecido',
      variant: 'destructive',
    }),
  });
}
