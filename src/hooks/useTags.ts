import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import type { Tag, LeadTag } from '@/types/crm-operacional';


export function useTags() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const tagsQuery = useQuery({
    queryKey: ['tags', tenantId],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabaseUntyped
        .from('tags')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
    enabled: !!tenantId,
  });

  const createTag = useMutation({
    mutationFn: async (input: Partial<Tag>) => {
      const { data, error } = await supabaseUntyped
        .from('tags')
        .insert({ ...input, tenant_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: 'Tag criada' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar tag', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tag> & { id: string }) => {
      const { data, error } = await supabaseUntyped
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao atualizar tag', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: 'Tag removida' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao remover tag', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  return {
    tags: tagsQuery.data ?? [],
    isLoading: tagsQuery.isLoading,
    error: tagsQuery.error,
    createTag: createTag.mutateAsync,
    updateTag: updateTag.mutateAsync,
    deleteTag: deleteTag.mutateAsync,
    isCreating: createTag.isPending,
  };
}

export function useLeadTags(leadId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const leadTagsQuery = useQuery({
    queryKey: ['lead_tags', leadId],
    queryFn: async (): Promise<LeadTag[]> => {
      const { data, error } = await supabaseUntyped
        .from('lead_tags')
        .select('*, tag:tag_id(*)')
        .eq('lead_id', leadId!);
      if (error) throw error;
      return (data ?? []) as LeadTag[];
    },
    enabled: !!leadId,
  });

  const addTag = useMutation({
    mutationFn: async ({ leadId: lid, tagId, userId }: { leadId: string; tagId: string; userId?: string }) => {
      const { data, error } = await supabaseUntyped
        .from('lead_tags')
        .insert({ lead_id: lid, tag_id: tagId, created_by: userId ?? null })
        .select('*, tag:tag_id(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: unknown, vars: { leadId: string; tagId: string; userId?: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['lead_tags', vars.leadId] });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao adicionar tag', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const removeTag = useMutation({
    mutationFn: async ({ leadId: lid, tagId }: { leadId: string; tagId: string }) => {
      const { error } = await supabaseUntyped
        .from('lead_tags')
        .delete()
        .eq('lead_id', lid)
        .eq('tag_id', tagId);
      if (error) throw error;
    },
    onSuccess: (_: unknown, vars: { leadId: string; tagId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['lead_tags', vars.leadId] });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao remover tag', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  return {
    leadTags: leadTagsQuery.data ?? [],
    isLoading: leadTagsQuery.isLoading,
    addTag: addTag.mutateAsync,
    removeTag: removeTag.mutateAsync,
  };
}
