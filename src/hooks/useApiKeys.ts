import { useState, useEffect, useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  const fetchApiKeys = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar as API keys.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  const criarApiKey = async (nome: string) => {
    if (!tenantId) {
      throw new Error('Tenant não encontrado');
    }

    try {
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

      await fetchApiKeys();
      toast({
        title: 'Sucesso',
        description: 'API key criada com sucesso.',
      });

      return data;
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a API key.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleApiKey = async (id: string, ativo: boolean) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ ativo: !ativo })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await fetchApiKeys();
      toast({
        title: 'Sucesso',
        description: `API key ${!ativo ? 'ativada' : 'desativada'} com sucesso.`,
      });
    } catch (error) {
      console.error('Failed to toggle API key:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel alterar o status da API key.',
        variant: 'destructive',
      });
    }
  };

  const deletarApiKey = async (id: string) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await fetchApiKeys();
      toast({
        title: 'Sucesso',
        description: 'API key excluida com sucesso.',
      });
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir a API key.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    void fetchApiKeys();
  }, [fetchApiKeys]);

  return {
    apiKeys,
    loading,
    criarApiKey,
    toggleApiKey,
    deletarApiKey,
    refetch: fetchApiKeys,
  };
};
