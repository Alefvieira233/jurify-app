
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from './useSupabaseQuery';

type ContratoRow = {
  id: string;
  lead_id: string | null;
  tenant_id: string | null;
  nome_cliente: string | null;
  area_juridica: string | null;
  valor_causa: number | null;
  texto_contrato: string | null;
  clausulas_customizadas: string | null;
  status: string | null;
  status_assinatura: string | null;
  link_assinatura_zapsign: string | null;
  zapsign_document_id: string | null;
  data_geracao_link: string | null;
  data_envio_whatsapp: string | null;
  responsavel: string | null;
  data_envio: string | null;
  data_assinatura: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Contrato = ContratoRow;

export type ContratoInput = Partial<Contrato>;

export const useContratos = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const normalizeContrato = useCallback((contrato: ContratoRow): Contrato => ({ ...contrato }), []);

  const fetchContratosQuery = useCallback(async () => {
    console.log('🔍 [useContratos] Buscando contratos...');
    
    let query = supabase
      .from('contratos')
      .select('*')
      .order('created_at', { ascending: false });

    if (profile?.tenant_id) {
      query = query.eq('tenant_id', profile.tenant_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [useContratos] Erro ao buscar contratos:', error);
    } else {
      console.log(`✅ [useContratos] ${data?.length || 0} contratos encontrados`);
    }

    const normalized = (data || []).map(normalizeContrato);
    return { data: normalized, error };
  }, [profile?.tenant_id, normalizeContrato]);

  const {
    data: contratos,
    loading,
    error,
    refetch: fetchContratos,
    mutate: setContratos,
    isEmpty
  } = useSupabaseQuery<Contrato>('contratos', fetchContratosQuery, {
    enabled: !!user,
    staleTime: 15000
  });

  const createContrato = useCallback(async (data: ContratoInput): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      console.log('🔄 [useContratos] Criando novo contrato...');

      const { data: newContrato, error } = await supabase
        .from('contratos')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [useContratos] Contrato criado com sucesso:', newContrato.id);

      // ✅ CORREÇÃO: Usar setter callback para evitar dependência circular
      const normalized = normalizeContrato(newContrato);
      setContratos(prev => [normalized, ...prev]);

      toast({
        title: 'Sucesso',
        description: 'Contrato criado com sucesso!',
      });

      return true;
    } catch (error: any) {
      console.error('❌ [useContratos] Erro ao criar contrato:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o contrato.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, setContratos]);

  const updateContrato = useCallback(async (id: string, updateData: Partial<ContratoInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log(`🔄 [useContratos] Atualizando contrato ${id}...`);

      const { data: updatedContrato, error } = await supabase
        .from('contratos')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [useContratos] Contrato atualizado com sucesso');

      // ✅ CORREÇÃO: Usar setter callback para evitar dependência circular
      const normalized = normalizeContrato(updatedContrato);
      setContratos(prev => prev.map(contrato =>
        contrato.id === id ? { ...contrato, ...normalized } : contrato
      ));

      toast({
        title: 'Sucesso',
        description: 'Contrato atualizado com sucesso!',
      });

      return true;
    } catch (error: any) {
      console.error('❌ [useContratos] Erro ao atualizar contrato:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o contrato.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, setContratos]);

  return {
    contratos,
    loading,
    error,
    isEmpty,
    fetchContratos,
    createContrato,
    updateContrato,
  };
};


