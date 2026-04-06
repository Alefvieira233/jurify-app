/** CRUD operations for departments with member assignment and tenant isolation. */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { queryKeys } from '@/lib/queryKeys';
import type { Departamento, DepartamentoMembro } from '@/types/crm-operacional';


export function useDepartamentos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const deptosQuery = useQuery({
    queryKey: queryKeys.departamentos.list(tenantId),
    queryFn: async (): Promise<Departamento[]> => {
      const { data, error } = await supabase
        .from('departamentos')
        .select('id, tenant_id, nome, descricao, cor, ordem, ativo, responsavel_padrao_id, agente_ia_padrao_id, created_at, updated_at')
        .eq('tenant_id', tenantId!)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Departamento[];
    },
    enabled: !!tenantId,
  });

  const createDepto = useMutation({
    mutationFn: async (input: Partial<Departamento>) => {
      const { data, error } = await supabase
        .from('departamentos')
        .insert({ ...input, tenant_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departamentos.all });
      toast({ title: 'Departamento criado' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar departamento', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const updateDepto = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Departamento> & { id: string }) => {
      const { data, error } = await supabase
        .from('departamentos')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departamentos.all });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao atualizar departamento', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const deleteDepto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departamentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departamentos.all });
      toast({ title: 'Departamento removido' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao remover departamento', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  return {
    departamentos: deptosQuery.data ?? [],
    activeDepartamentos: (deptosQuery.data ?? []).filter((d: Departamento) => d.ativo),
    isLoading: deptosQuery.isLoading,
    isError: deptosQuery.isError,
    error: deptosQuery.error,
    refetch: deptosQuery.refetch,
    createDepto: createDepto.mutateAsync,
    updateDepto: updateDepto.mutateAsync,
    deleteDepto: deleteDepto.mutateAsync,
    isCreating: createDepto.isPending,
  };
}

export function useDepartamentoMembros(departamentoId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const membrosQuery = useQuery({
    queryKey: queryKeys.departamentos.membros(departamentoId ?? undefined),
    queryFn: async (): Promise<DepartamentoMembro[]> => {
      const { data, error } = await supabase
        .from('departamento_membros')
        .select('*, profile:profile_id(id, nome_completo, email, avatar_url)')
        .eq('departamento_id', departamentoId!);
      if (error) throw error;
      return (data ?? []) as DepartamentoMembro[];
    },
    enabled: !!departamentoId,
  });

  const addMembro = useMutation({
    mutationFn: async ({ departamentoId: dId, profileId, roleNoDepto }: { departamentoId: string; profileId: string; roleNoDepto?: string }) => {
      const { data, error } = await supabase
        .from('departamento_membros')
        .insert({ departamento_id: dId, profile_id: profileId, role_no_depto: roleNoDepto ?? 'membro' })
        .select('*, profile:profile_id(id, nome_completo, email, avatar_url)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: unknown, vars: { departamentoId: string; profileId: string; roleNoDepto?: string }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departamentos.membros(vars.departamentoId) });
      toast({ title: 'Membro adicionado' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao adicionar membro', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const removeMembro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departamento_membros').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departamentos.membros(departamentoId ?? undefined) });
      toast({ title: 'Membro removido' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao remover membro', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  const updateMembro = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DepartamentoMembro> & { id: string }) => {
      const { data, error } = await supabase
        .from('departamento_membros')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departamentos.membros(departamentoId ?? undefined) });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao atualizar permissões', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  return {
    membros: membrosQuery.data ?? [],
    isLoading: membrosQuery.isLoading,
    addMembro: addMembro.mutateAsync,
    removeMembro: removeMembro.mutateAsync,
    updateMembro: updateMembro.mutateAsync,
  };
}
