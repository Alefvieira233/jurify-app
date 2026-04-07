/** CRUD for integration configurations (WhatsApp, Stripe, ZapSign, etc.) per tenant. */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

const log = createLogger('IntegracoesConfig');

export type IntegracaoConfig = {
  id: string;
  tenant_id: string | null;
  nome_integracao: string;
  status: 'ativa' | 'inativa' | 'erro';
  endpoint_url: string;
  observacoes: string | null;
  criado_em: string;
  atualizado_em?: string | null;
  data_ultima_sincronizacao?: string | null;
};

export type CreateIntegracaoData = {
  nome_integracao: string;
  status: IntegracaoConfig['status'];
  api_key_encrypted: string;
  endpoint_url: string;
  observacoes?: string | null;
};

export const useIntegracoesConfig = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tenantId = profile?.tenant_id ?? null;

  const { data: integracoes = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.integracoesConfig.list(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_integracoes')
        .select('id, nome_integracao, status, endpoint_url, observacoes, tenant_id, criado_em, atualizado_em, data_ultima_sincronizacao')
        .eq('tenant_id', tenantId!)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return (data || []) as IntegracaoConfig[];
    },
    enabled: !!user && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.integracoesConfig.list(tenantId) });
  }, [queryClient, tenantId]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateIntegracaoData) => {
      const { error } = await supabase
        .from('configuracoes_integracoes')
        .insert([{ ...data, tenant_id: tenantId }]);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Sucesso', description: 'Integracao criada com sucesso.' });
    },
    onError: (error) => {
      log.error('Failed to create integration', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a integração.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IntegracaoConfig> }) => {
      const { error } = await supabase
        .from('configuracoes_integracoes')
        .update({ ...data, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId!);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Sucesso', description: 'Integracao atualizada com sucesso.' });
    },
    onError: (error) => {
      log.error('Failed to update integration', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a integração.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('configuracoes_integracoes')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Sucesso', description: 'Integracao removida com sucesso.' });
    },
    onError: (error) => {
      log.error('Failed to delete integration', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a integração.', variant: 'destructive' });
    },
  });

  const fetchIntegracoes = useCallback(() => {
    invalidate();
  }, [invalidate]);

  const createIntegracao = async (data: CreateIntegracaoData) => {
    if (!user || !tenantId) return false;
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch (err) {
      log.error('createIntegracao failed', err);
      return false;
    }
  };

  const updateIntegracao = async (id: string, data: Partial<IntegracaoConfig>) => {
    if (!user || !tenantId) return false;
    try {
      await updateMutation.mutateAsync({ id, data });
      return true;
    } catch (err) {
      log.error('updateIntegracao failed', err);
      return false;
    }
  };

  const toggleStatus = async (id: string, currentStatus: IntegracaoConfig['status']) => {
    const newStatus = currentStatus === 'ativa' ? 'inativa' : 'ativa';
    return await updateIntegracao(id, { status: newStatus });
  };

  const updateSincronizacao = async (id: string) => {
    return await updateIntegracao(id, {
      data_ultima_sincronizacao: new Date().toISOString(),
    });
  };

  const deleteIntegracao = async (id: string) => {
    if (!user || !tenantId) return false;
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      log.error('deleteIntegracao failed', err);
      return false;
    }
  };

  return {
    integracoes,
    loading,
    fetchIntegracoes,
    createIntegracao,
    updateIntegracao,
    toggleStatus,
    updateSincronizacao,
    deleteIntegracao,
  };
};
