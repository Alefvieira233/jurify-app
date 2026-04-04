/** CRUD operations for tenant API keys with secure creation and revocation. */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

const log = createLogger('ApiKeys');

interface ApiKey {
  id: string;
  nome: string;
  key_value: string;
  ativo: boolean;
  criado_por: string;
  created_at: string;
  updated_at: string;
  tenant_id?: string;
}

export const useApiKeys = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id ?? null;

  const { data: apiKeys = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.apiKeys.list(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ApiKey[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (nome: string) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const keyValue = 'jf_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          nome,
          key_value: keyValue,
          ativo: true,
          criado_por: user?.id,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(tenantId) });
      toast({ title: 'Sucesso', description: 'API key criada com sucesso.' });
    },
    onError: (error) => {
      log.error('Failed to create API key', error);
      toast({ title: 'Erro', description: 'Nao foi possivel criar a API key.', variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('api_keys')
        .update({ ativo: !ativo })
        .eq('id', id)
        .eq('tenant_id', tenantId!);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(tenantId) });
      toast({ title: 'Sucesso', description: `API key ${!variables.ativo ? 'ativada' : 'desativada'} com sucesso.` });
    },
    onError: (error) => {
      log.error('Failed to toggle API key', error);
      toast({ title: 'Erro', description: 'Nao foi possivel alterar o status da API key.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(tenantId) });
      toast({ title: 'Sucesso', description: 'API key excluida com sucesso.' });
    },
    onError: (error) => {
      log.error('Failed to delete API key', error);
      toast({ title: 'Erro', description: 'Nao foi possivel excluir a API key.', variant: 'destructive' });
    },
  });

  const criarApiKey = async (nome: string) => {
    return createMutation.mutateAsync(nome);
  };

  const toggleApiKey = async (id: string, ativo: boolean) => {
    if (!tenantId) return;
    await toggleMutation.mutateAsync({ id, ativo });
  };

  const deletarApiKey = async (id: string) => {
    if (!tenantId) return;
    await deleteMutation.mutateAsync(id);
  };

  return {
    apiKeys,
    loading,
    criarApiKey,
    toggleApiKey,
    deletarApiKey,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(tenantId) }),
  };
};
