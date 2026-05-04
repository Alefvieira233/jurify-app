import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
  description: string | null;
  used_count: number;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppQuickReplies() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id;

  const list = useQuery<QuickReply[]>({
    queryKey: ['whatsapp', 'quick-replies', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_quick_replies')
        .select('id, shortcut, content, description, used_count, created_at, updated_at')
        .order('used_count', { ascending: false })
        .order('shortcut', { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuickReply[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const create = useMutation({
    mutationFn: async (input: { shortcut: string; content: string; description?: string | null }) => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      const shortcut = input.shortcut.trim().replace(/^\//, '').toLowerCase();
      if (!/^[a-z0-9_-]{2,30}$/.test(shortcut)) {
        throw new Error('Atalho: 2-30 letras/números/_/-, sem acentos');
      }
      const { data, error } = await supabase
        .from('whatsapp_quick_replies')
        .insert({
          tenant_id: tenantId,
          shortcut,
          content: input.content,
          description: input.description ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'quick-replies'] });
      toast({ title: 'Resposta rápida criada' });
    },
    onError: (err: unknown) => toast({
      title: 'Erro ao criar',
      description: err instanceof Error ? err.message : 'Erro',
      variant: 'destructive',
    }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; shortcut?: string; content?: string; description?: string | null }) => {
      const { data, error } = await supabase
        .from('whatsapp_quick_replies')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'quick-replies'] });
      toast({ title: 'Resposta rápida atualizada' });
    },
    onError: (err: unknown) => toast({
      title: 'Erro ao atualizar',
      description: err instanceof Error ? err.message : 'Erro',
      variant: 'destructive',
    }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whatsapp_quick_replies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'quick-replies'] });
      toast({ title: 'Resposta rápida removida' });
    },
  });

  const incrementUse = async (id: string) => {
    try {
      await supabase.rpc('increment_quick_reply_use', { p_id: id });
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'quick-replies'] });
    } catch {
      // não é crítico
    }
  };

  return {
    items: list.data ?? [],
    isLoading: list.isLoading,
    refetch: list.refetch,
    create,
    update,
    remove,
    incrementUse,
  };
}
