
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from './useSupabaseQuery';
import { createLogger } from '@/lib/logger';

const log = createLogger('Contratos');

type ContratoRow = {
  id: string;
  lead_id: string | null;
  tenant_id: string | null;
  nome_cliente: string | null;
  area_juridica: string | null;
  valor_causa: number | null;
  texto_contrato?: string | null;
  clausulas_customizadas?: string | null;
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
    const listColumns = 'id,lead_id,tenant_id,nome_cliente,area_juridica,valor_causa,status,status_assinatura,link_assinatura_zapsign,zapsign_document_id,data_geracao_link,data_envio_whatsapp,responsavel,data_envio,data_assinatura,observacoes,created_at,updated_at';

    let query = supabase
      .from('contratos')
      .select(listColumns)
      .order('created_at', { ascending: false })
      .limit(100);

    if (profile?.tenant_id) {
      query = query.eq('tenant_id', profile.tenant_id);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Erro ao buscar contratos', error);
    } else {
      log.debug(`${data?.length || 0} contratos encontrados`);
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
      log.info('Criando novo contrato...');

      const { data: newContrato, error } = await supabase
        .from('contratos')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      log.info('Contrato criado', { id: newContrato.id });

      // ✅ CORREÇÃO: Usar setter callback para evitar dependência circular
      const normalized = normalizeContrato(newContrato);
      setContratos(prev => [normalized, ...prev]);

      toast({
        title: 'Sucesso',
        description: 'Contrato criado com sucesso!',
      });

      return true;
    } catch (error: unknown) {
      log.error('Erro ao criar contrato', error);
      const message = error instanceof Error ? error.message : 'Não foi possível criar o contrato.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, setContratos, normalizeContrato]);

  const updateContrato = useCallback(async (id: string, updateData: Partial<ContratoInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      log.info('Atualizando contrato', { id });

      const { data: updatedContrato, error } = await supabase
        .from('contratos')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      log.info('Contrato atualizado');

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
    } catch (error: unknown) {
      log.error('Erro ao atualizar contrato', error);
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o contrato.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, setContratos, normalizeContrato]);

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



