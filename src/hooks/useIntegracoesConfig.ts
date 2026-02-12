import { useState, useEffect, useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type IntegracaoConfig = {
  id: string;
  tenant_id: string | null;
  nome_integracao: string;
  status: 'ativa' | 'inativa' | 'erro';
  api_key: string;
  endpoint_url: string;
  observacoes: string | null;
  criado_em: string;
  atualizado_em?: string | null;
  data_ultima_sincronizacao?: string | null;
};

export type CreateIntegracaoData = {
  nome_integracao: string;
  status: IntegracaoConfig['status'];
  api_key: string;
  endpoint_url: string;
  observacoes?: string | null;
};

export const useIntegracoesConfig = () => {
  const [integracoes, setIntegracoes] = useState<IntegracaoConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const tenantId = profile?.tenant_id ?? null;

  const fetchIntegracoes = useCallback(async () => {
    if (!user || !tenantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracoes_integracoes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setIntegracoes(data || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar as integracoes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, toast]);

  const createIntegracao = async (data: CreateIntegracaoData) => {
    if (!user || !tenantId) return false;

    try {
      const { error } = await supabase
        .from('configuracoes_integracoes')
        .insert([{ ...data, tenant_id: tenantId }]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Integracao criada com sucesso.',
      });

      await fetchIntegracoes();
      return true;
    } catch (error) {
      console.error('Failed to create integration:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a integracao.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateIntegracao = async (id: string, data: Partial<IntegracaoConfig>) => {
    if (!user || !tenantId) return false;

    try {
      const { error } = await supabase
        .from('configuracoes_integracoes')
        .update({ ...data, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Integracao atualizada com sucesso.',
      });

      await fetchIntegracoes();
      return true;
    } catch (error) {
      console.error('Failed to update integration:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel atualizar a integracao.',
        variant: 'destructive',
      });
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
      const { error } = await supabase
        .from('configuracoes_integracoes')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Integracao removida com sucesso.',
      });

      await fetchIntegracoes();
      return true;
    } catch (error) {
      console.error('Failed to delete integration:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel remover a integracao.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    void fetchIntegracoes();
  }, [fetchIntegracoes]);

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


