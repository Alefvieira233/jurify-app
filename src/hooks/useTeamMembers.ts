/** Manages team member profiles, roles, and department assignments within a tenant. */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { queryKeys } from '@/lib/queryKeys';

export interface TeamMember {
  id: string;
  nome_completo: string | null;
  email: string;
  avatar_url: string | null;
  ativo: boolean;
  cargo: string | null;
  telefone: string | null;
  role: string | null;
  departamento: string | null;
}

export interface UpdateTeamMemberInput {
  id: string;
  cargo?: string | null;
  telefone?: string | null;
}

export function useTeamMembers() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: queryKeys.teamMembers.list(tenantId),
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome_completo, email, avatar_url, ativo, cargo, telefone, role')
        .eq('tenant_id', tenantId!)
        .eq('ativo', true)
        .order('nome_completo');
      if (error) throw error;
      return (data ?? []).map((m) => ({
        ...m,
        cargo: m.cargo ?? null,
        telefone: m.telefone ?? null,
        role: m.role ?? null,
        departamento: null, // profiles table doesn't have departamento; use departamento_membros join if needed
      })) as TeamMember[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTeamMemberInput) => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('id, nome_completo, email, avatar_url, ativo, cargo, telefone, role')
        .single();
      if (error) throw error;
      return { ...data, departamento: null } as TeamMember;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.all });
      toast({ title: 'Membro atualizado', description: 'Dados salvos com sucesso.' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao atualizar membro', description: toUserMessage(err), variant: 'destructive' });
    },
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateMember: updateMember.mutate,
    updateMemberAsync: updateMember.mutateAsync,
    isUpdating: updateMember.isPending,
  };
}
